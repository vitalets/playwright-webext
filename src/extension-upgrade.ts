/**
 * Coordinates replacement and reload of an unpacked extension in its existing browser profile.
 */

import type { BrowserContext, Worker } from '@playwright/test';
import type { ExtensionCopy } from './extension-copy.js';
import { ExtensionsPage } from './extensions-page.js';
import { isDefaultLocale, localizeExtension } from './i18n.js';

/**
 * Filesystem and localization inputs for an unpacked extension upgrade.
 */
export type ExtensionUpgradeOptions = {
  extensionCopy: ExtensionCopy;
  extensionPath: string;
  locale?: string;
};

type UpgradeState = 'available' | 'in-progress' | 'consumed';

/**
 * Replaces an unpacked extension at its loaded path and waits for its new service worker.
 */
export class ExtensionUpgrade {
  #state: UpgradeState = 'available';

  /**
   * Creates an upgrade operation for one loaded extension and current source directory.
   */
  constructor(
    private readonly context: BrowserContext,
    private readonly options: ExtensionUpgradeOptions,
  ) {}

  /**
   * Performs the configured one-shot upgrade and returns the replacement service worker.
   */
  async upgrade(oldWorker: Worker): Promise<Worker> {
    if (this.#state === 'in-progress') {
      throw new Error('Extension upgrade is already in progress.');
    }
    if (this.#state === 'consumed') {
      throw new Error('Extension upgrade has already been used.');
    }

    this.#state = 'in-progress';
    try {
      await this.enableDeveloperMode();
      await this.options.extensionCopy.copyFrom(this.options.extensionPath);
      if (!isDefaultLocale(this.options.locale)) {
        await localizeExtension(this.options.extensionCopy.path, this.options.locale);
      }
    } catch (error) {
      this.#state = 'available';
      throw error;
    }

    this.#state = 'consumed';
    return this.reload(oldWorker);
  }

  /**
   * Allows Chromium to reload the command-line-loaded unpacked extension in its temporary profile.
   */
  private async enableDeveloperMode(): Promise<void> {
    const extensionsPage = new ExtensionsPage(this.context);
    try {
      await extensionsPage.open();
      await extensionsPage.enableDeveloperMode();
    } finally {
      await extensionsPage.close();
    }
  }

  private async reload(oldWorker: Worker): Promise<Worker> {
    const newWorkerPromise = waitForReplacementWorker(this.context, oldWorker);
    await Promise.all([
      oldWorker.waitForEvent('close'),
      oldWorker.evaluate(() => {
        setTimeout(() => chrome.runtime.reload());
      }),
    ]);

    return newWorkerPromise;
  }
}

async function waitForReplacementWorker(
  context: BrowserContext,
  oldWorker: Worker,
): Promise<Worker> {
  const predicate = (worker: Worker) =>
    worker !== oldWorker && worker.url().startsWith('chrome-extension://');
  const worker = context.serviceWorkers().find(predicate);
  return (
    worker ??
    context.waitForEvent('serviceworker', {
      predicate,
      timeout: 5_000,
    })
  );
}
