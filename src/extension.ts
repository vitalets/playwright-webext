/**
 * Represents a running browser extension and exposes its Playwright runtime handles.
 */

/// <reference types="chrome" preserve="true" />

import type { BrowserContext, Page, Worker } from '@playwright/test';
import { ExtensionInstaller, type InstallOptions } from './install.js';
import { ExtensionsPage } from './extensions-page.js';
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
   * Returns the configured popup URL, or throws when no popup is declared.
   */
  get popupUrl(): string {
    const popupPath = this.manifest.action?.default_popup;
    if (!popupPath) {
      throw new Error('Extension does not define action.default_popup.');
    }
    return this.getURL(popupPath);
  }

  /**
   * Returns the configured options URL, preferring options_ui.page over options_page.
   * Throws when no options page is declared.
   */
  get optionsUrl(): string {
    const optionsPath = this.manifest.options_ui?.page ?? this.manifest.options_page;
    if (!optionsPath) {
      throw new Error('Extension does not define options_ui.page or options_page.');
    }
    return this.getURL(optionsPath);
  }

  /**
   * Returns the side panel document URL declared by side_panel.default_path.
   * Throws when no default path is declared. Runtime sidePanel overrides are ignored.
   */
  get sidePanelUrl(): string {
    const sidePanelPath = this.manifest.side_panel?.default_path;
    if (!sidePanelPath) {
      throw new Error('Extension does not define side_panel.default_path.');
    }
    return this.getURL(sidePanelPath);
  }

  /**
   * Runs code in the current extension service worker using Playwright's evaluation API.
   */
  evaluate<R, Arg>(...args: Parameters<typeof this.worker.evaluate<R, Arg>>): Promise<R>;
  evaluate<R>(...args: Parameters<typeof this.worker.evaluate<R>>): Promise<R>;
  evaluate(...args: Parameters<Worker['evaluate']>) {
    return this.worker.evaluate(...args);
  }

  /**
   * Installs the configured build, or a private copy of a custom build for later upgrade.
   */
  async install(path?: string): Promise<void> {
    [this.#id] = await Promise.all([this.#installer.install(path), this.waitForReady()]);
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
    const url = this.popupUrl;
    const page = await this.context.newPage();
    await page.goto(url);

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
    const url = this.optionsUrl;
    const page = await this.context.newPage();
    await page.goto(url);

    return page;
  }

  /**
   * Opens the manifest's side panel document in a new regular browser tab.
   *
   * Uses normal tab viewport, lifecycle, active-tab, and message-sender behavior.
   * Does not open the native side panel or use runtime sidePanel configuration.
   */
  async openSidePanel(): Promise<Page> {
    const url = this.sidePanelUrl;
    const page = await this.context.newPage();
    await page.goto(url);

    return page;
  }

  /**
   * Enables the extension, waits for readiness, and closes Chromium's extensions page afterward.
   */
  async enable(): Promise<void> {
    const extensionsPage = new ExtensionsPage(this.context);
    try {
      await extensionsPage.open();
      if (await extensionsPage.isEnabled(this.id)) return;
      await Promise.all([extensionsPage.enable(this.id), this.waitForReady()]);
    } finally {
      await extensionsPage.close();
    }
  }

  /**
   * Disables the extension, waits for its worker to stop, and closes the extensions page afterward.
   */
  async disable(): Promise<void> {
    const extensionsPage = new ExtensionsPage(this.context);
    try {
      await extensionsPage.open();
      await Promise.all([extensionsPage.disable(this.id), this.waitForStopped()]);
    } finally {
      await extensionsPage.close();
    }
  }

  /**
   * Replaces the loaded old extension with the configured current version and reloads it.
   */
  async upgrade(): Promise<void> {
    await Promise.all([this.#installer.upgrade(), this.waitForStopped(), this.waitForReady()]);
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
    const worker = await this.context.waitForEvent('serviceworker', {
      predicate: (worker) => worker.url().startsWith('chrome-extension://'),
      timeout: this.options.timeout,
    });
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
