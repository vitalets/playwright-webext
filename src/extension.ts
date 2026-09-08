/**
 * Represents a running browser extension and exposes its Playwright runtime handles.
 */

/// <reference types="chrome" preserve="true" />

import type { BrowserContext, Page, Worker } from '@playwright/test';
import { expectStorageKey, type ExpectStorageKeyOptions } from './expect.js';
import { ExtensionUpgrade, type ExtensionUpgradeOptions } from './extension-upgrade.js';
import { ExtensionDetailsPage } from './internal-pages/extension-details.js';

/**
 * Provides access to a loaded extension's context, metadata, worker, and resource URLs.
 */
export class Extension {
  readonly context: BrowserContext;
  #worker?: Worker;
  readonly #upgrade?: ExtensionUpgrade;
  id!: string;
  manifest!: chrome.runtime.ManifestV3;

  /**
   * Creates an extension facade for the supplied browser context.
   */
  constructor(context: BrowserContext, upgradeOptions?: ExtensionUpgradeOptions) {
    this.context = context;
    this.#upgrade = upgradeOptions ? new ExtensionUpgrade(context, upgradeOptions) : undefined;
    this.autoAttachToWorker();
  }

  get worker(): Worker {
    if (!this.#worker) {
      throw new Error('Extension service worker is not available.');
    }

    return this.#worker;
  }

  /**
   * Waits for this extension's service worker and refreshes its runtime metadata.
   * Fails if the worker closes or is replaced during initialization.
   */
  async waitForReady(timeout = 5_000): Promise<void> {
    const worker = await waitForExtensionWorker(this.context, timeout);
    this.attachToWorker(worker);
    this.populateExtensionId(worker);
    await this.populateManifest();
  }

  /**
   * Polls an extension storage key until its value equals the expected value.
   * Playwright asymmetric matchers can be used for partial matching.
   */
  async expectStorageKey(
    key: string,
    expected: unknown,
    options: ExpectStorageKeyOptions = {},
  ): Promise<void> {
    await expectStorageKey(this.worker, key, expected, options);
  }

  /**
   * Returns a fully qualified URL for a resource inside the extension.
   *
   * This intentionally does not emulate dynamic URLs created by
   * web_accessible_resources entries with use_dynamic_url.
   */
  getURL(path = ''): string {
    const suffix = path.startsWith('/') ? path : `/${path}`;
    return new URL(`chrome-extension://${this.id}${suffix}`).href;
  }

  /**
   * Opens the configured popup document in a regular browser tab.
   *
   * This returns an interactable Playwright page, but does not reproduce the native action
   * popup's viewport, focus, dismissal, lifecycle, active-tab, or message-sender behavior.
   * Chromium's native `chrome.action.openPopup()` surface is not exposed by
   * `BrowserContext.pages()` and cannot be interacted with as a Playwright `Page`.
   */
  async openPopup(): Promise<Page> {
    const popupPath = this.manifest.action?.default_popup;
    if (!popupPath) {
      throw new Error('Extension does not define action.default_popup.');
    }

    const page = await this.context.newPage();
    await page.goto(this.getURL(popupPath));

    return page;
  }

  /**
   * Opens the configured options document in a regular browser tab.
   *
   * This intentionally ignores `options_ui.open_in_tab` and does not call
   * `chrome.runtime.openOptionsPage()`. Opening the document directly provides a standalone
   * Playwright page with normal tab lifecycle and message-sender behavior, including
   * `sender.tab` for runtime messages.
   */
  async openOptions(): Promise<Page> {
    const optionsPath = this.manifest.options_ui?.page ?? this.manifest.options_page;
    if (!optionsPath) {
      throw new Error('Extension does not define options_ui.page or options_page.');
    }

    const page = await this.context.newPage();
    await page.goto(this.getURL(optionsPath));

    return page;
  }

  /**
   * Opens Chromium's management details for this extension.
   */
  async openDetailsPage(): Promise<ExtensionDetailsPage> {
    const page = await this.context.newPage();
    await page.goto(`chrome://extensions/?id=${this.id}`);
    return new ExtensionDetailsPage(page);
  }

  /**
   * Replaces the loaded old extension with the configured current version and reloads it.
   */
  async upgrade(): Promise<void> {
    if (!this.#upgrade) {
      throw new Error('Extension upgrade requires use.oldVersionExtensionPath.');
    }

    const worker = await this.#upgrade.upgrade(this.worker);
    this.attachToWorker(worker);
    this.populateExtensionId(worker);
    await this.populateManifest();
  }

  /**
   * Removes the extension from its browser profile.
   */
  async uninstall(): Promise<void> {
    await Promise.all([
      this.worker.waitForEvent('close'),
      this.worker.evaluate(() => {
        setTimeout(() => {
          void chrome.management.uninstallSelf({ showConfirmDialog: false });
        });
      }),
    ]);
  }

  private autoAttachToWorker(): void {
    this.context.on('serviceworker', (worker) => {
      if (isExtensionWorker(worker)) {
        this.attachToWorker(worker);
      }
    });
  }

  private attachToWorker(worker: Worker): void {
    if (this.#worker === worker) return;
    this.#worker = worker;
    worker.once('close', () => {
      if (this.#worker === worker) {
        this.#worker = undefined;
      }
    });
  }

  private populateExtensionId(worker: Worker): void {
    this.id = new URL(worker.url()).hostname;
  }

  private async populateManifest(): Promise<void> {
    const manifest = await this.worker.evaluate(() => chrome.runtime.getManifest());
    // potentially worker can re-start during .evaluate call,
    // then we should check: if (this.#worker !== worker) { ... }
    this.manifest = manifest as chrome.runtime.ManifestV3;
  }
}

/**
 * Returns the extension service worker, waiting for it when necessary.
 */
async function waitForExtensionWorker(context: BrowserContext, timeout: number): Promise<Worker> {
  const worker = context.serviceWorkers().find(isExtensionWorker);
  return (
    worker ??
    context.waitForEvent('serviceworker', {
      predicate: isExtensionWorker,
      timeout,
    })
  );
}

function isExtensionWorker(worker: Worker): boolean {
  return worker.url().startsWith('chrome-extension://');
}
