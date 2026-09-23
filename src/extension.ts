/**
 * Represents a running browser extension and exposes its Playwright runtime handles.
 */

/// <reference types="chrome" preserve="true" />

import type { BrowserContext, Page, Worker } from '@playwright/test';
import { ExtensionInstaller, type InstallOptions } from './install.js';
import { ExtensionDetailsPage } from './internal-pages/extension-details.js';
import { createStorage } from './storage.js';

type ExtensionOptions = InstallOptions & {
  timeout: number;
};

/**
 * Provides access to a loaded extension's context, metadata, worker, and resource URLs.
 */
export class Extension {
  readonly context: BrowserContext;
  readonly storage = createStorage(() => this.worker);
  readonly #installer: ExtensionInstaller;
  #id?: string;
  #manifest?: chrome.runtime.ManifestV3;

  /**
   * Creates an extension facade for the supplied browser context.
   */
  constructor(
    context: BrowserContext,
    private readonly options: ExtensionOptions,
  ) {
    this.context = context;
    this.#installer = new ExtensionInstaller(context, options);
  }

  get worker(): Worker {
    const worker = this.findWorker();
    if (!worker) throw new Error('Extension service worker is not available.');
    return worker;
  }

  get id(): string {
    if (!this.#id) throw new Error('Extension is not installed. Call extension.install() first.');
    return this.#id;
  }

  get manifest(): chrome.runtime.ManifestV3 {
    if (!this.#manifest) throw new Error('Extension is not ready. Call extension.install() first.');
    return this.#manifest;
  }

  /**
   * Installs the configured build, or a private copy of a custom build for later upgrade.
   */
  async install(path?: string): Promise<void> {
    this.#id = await this.#installer.install(path);
    await this.waitForReady();
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
    await Promise.all([this.waitForStopped(), this.#installer.upgrade()]);
    await this.waitForReady();
  }

  /**
   * Removes the extension from its browser profile.
   */
  async uninstall(): Promise<void> {
    await Promise.all([
      this.worker.evaluate(() => {
        setTimeout(() => {
          void chrome.management.uninstallSelf({ showConfirmDialog: false });
        });
      }),
      this.waitForStopped(),
    ]);
  }

  private async waitForReady(): Promise<void> {
    const predicate = (worker: Worker) => worker.url().startsWith(`chrome-extension://${this.id}/`);
    const existingWorker = this.context.serviceWorkers().find(predicate);
    const worker =
      existingWorker ??
      (await this.context.waitForEvent('serviceworker', {
        predicate,
        timeout: this.options.timeout,
      }));
    const manifest = await worker.evaluate(() => chrome.runtime.getManifest());
    this.#manifest = manifest as chrome.runtime.ManifestV3;
  }

  private async waitForStopped(): Promise<void> {
    const worker = this.findWorker();
    if (worker) await worker.waitForEvent('close', { timeout: this.options.timeout });
  }

  private findWorker(): Worker | undefined {
    return this.context
      .serviceWorkers()
      .find((worker) => worker.url().startsWith(`chrome-extension://${this.#id}/`));
  }
}
