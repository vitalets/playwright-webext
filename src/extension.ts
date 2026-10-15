/**
 * Represents a running browser extension and exposes its Playwright runtime handles.
 */

/// <reference types="chrome" preserve="true" />

import type { BrowserContext, Page, Worker } from '@playwright/test';
import { ExtensionInstaller, type InstallOptions } from './install.js';
import { ExtensionManagement } from './management.js';
import { uninstallWithWorker, uninstallWithCDP } from './uninstall.js';
import { readManifestFromTab, readManifestFromWorker } from './manifest.js';
import { createStorage } from './storage.js';
import { dispatch, type ExtensionEventName, type ExtensionEventArgs } from './dispatch.js';
import { poll, type PollOptions } from './utils/poll.js';
import { pollForPage, type PageMatcher } from './utils/poll-for-page.js';
import { runAll } from './utils/run-all.js';

/**
 * Provides access to a loaded extension's context, metadata, worker, and resource URLs.
 */
export class Extension {
  readonly context: BrowserContext;
  readonly storage = createStorage(() => this.worker);
  readonly #installer: ExtensionInstaller;
  #id?: string;
  #ready = false;
  #manifest?: chrome.runtime.ManifestV3;
  #closePromise?: Promise<void>;

  constructor(context: BrowserContext, options: InstallOptions) {
    this.context = context;
    this.#installer = new ExtensionInstaller(context, options);
    context.on('close', () => {
      this.#ready = false;
    });
  }

  /**
   * Returns the current service worker, or throws when it is unavailable.
   */
  get worker() {
    const worker = this.findWorker();
    if (!worker) throw new Error('Extension service worker is not available.');
    return worker;
  }

  /**
   * Returns the installed extension ID, or throws before installation.
   */
  get id() {
    if (!this.#id) throw new Error('Extension is not installed. Call extension.install() first.');
    return this.#id;
  }

  /**
   * Whether initial installation and manifest acquisition completed; remains true while disabled.
   */
  get ready() {
    return this.#ready;
  }

  /**
   * Returns the loaded manifest snapshot read through the extension runtime API.
   */
  get manifest() {
    if (!this.#manifest) throw new Error('Extension is not ready. Call extension.install() first.');
    return this.#manifest;
  }

  /**
   * Returns whether the loaded build declares a worker, or undefined before installation.
   * A declared worker may currently be stopped or disabled.
   */
  get hasServiceWorker() {
    return this.#installer.hasServiceWorker;
  }

  /**
   * Returns the configured popup URL, or throws when no popup is declared.
   */
  get popupUrl() {
    const popupPath = this.manifest.action?.default_popup;
    if (!popupPath) throw new Error('Extension does not define action.default_popup.');
    return this.getURL(popupPath);
  }

  /**
   * Returns the configured options URL, preferring options_ui.page over options_page.
   * Throws when no options page is declared.
   */
  get optionsUrl() {
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
  get sidePanelUrl() {
    const sidePanelPath = this.manifest.side_panel?.default_path;
    if (!sidePanelPath) {
      throw new Error('Extension does not define side_panel.default_path.');
    }
    return this.getURL(sidePanelPath);
  }

  /**
   * Closes the browser context and removes private extension copies, even if context closure fails.
   * Repeated calls await the same teardown.
   */
  async close() {
    await (this.#closePromise ??= runAll([
      () => this.context.close(),
      () => this.#installer.cleanup(),
    ]));
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
   * Dispatches a synthetic Chrome event in the current worker using its listener arguments.
   * Requires serializable arguments. Does not wait for asynchronous listener work or retry.
   */
  async dispatch<Name extends ExtensionEventName>(
    name: Name,
    ...args: ExtensionEventArgs<NoInfer<Name>>
  ) {
    await dispatch(this.worker, name, args);
  }

  /**
   * Polls the current service worker until evaluation returns a truthy value.
   * Retries while a declared worker is unavailable; rejects if no worker is declared.
   * Uses poll options and returns the value, rather than a JSHandle.
   * Playwright's page implementation reference: waitForFunctionExpression in
   * https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/server/frames.ts#L1471-L1537
   */
  waitForFunction<R, Arg>(
    ...args: [...Parameters<typeof this.worker.evaluate<R, Arg>>, options?: PollOptions]
  ): Promise<Awaited<R>>;
  waitForFunction<R>(
    ...args: [...Parameters<typeof this.worker.evaluate<R>>, options?: PollOptions]
  ): Promise<Awaited<R>>;
  async waitForFunction(
    ...[pageFunction, arg, options]: [...Parameters<Worker['evaluate']>, options?: PollOptions]
  ) {
    if (!this.hasServiceWorker) {
      throw new Error('Extension does not declare a background service worker.');
    }
    return poll(() => this.findWorker()?.evaluate(pageFunction, arg), options);
  }

  /**
   * Returns a fully qualified URL for a resource inside the extension.
   *
   * This intentionally does not emulate dynamic URLs created by
   * web_accessible_resources entries with use_dynamic_url.
   */
  getURL(path = '') {
    const suffix = path.startsWith('/') ? path : `/${path}`;
    return new URL(`chrome-extension://${this.id}${suffix}`).href;
  }

  /**
   * Waits for an existing or newly opened context page matching a URL, pattern, or predicate.
   * Relative URLs resolve under the extension; absolute URLs match any context page.
   * Pattern objects use URLPattern defaults without an implicit extension base URL.
   */
  async pollForPage(urlOrPredicate: PageMatcher, options?: PollOptions) {
    if (typeof urlOrPredicate === 'string' && !URL.canParse(urlOrPredicate)) {
      urlOrPredicate = this.getURL(urlOrPredicate);
    }
    return pollForPage(this.context, urlOrPredicate, options);
  }

  /**
   * Polls until the page is closed, including pages that have already closed.
   */
  async pollForPageClosed(page: Page, options?: PollOptions) {
    await poll(() => page.isClosed(), options);
  }

  /**
   * Opens the configured popup document in a regular browser tab.
   *
   * This returns an interactable Playwright page, but does not reproduce the native action
   * popup's viewport, focus, dismissal, lifecycle, active-tab, or message-sender behavior.
   * Chromium's native `chrome.action.openPopup()` surface is not exposed by
   * `BrowserContext.pages()` and cannot be interacted with as a Playwright `Page`.
   */
  async openPopup() {
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
  async openOptions() {
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
  async openSidePanel() {
    const url = this.sidePanelUrl;
    const page = await this.context.newPage();
    await page.goto(url);

    return page;
  }

  /**
   * Enables the extension and waits for readiness.
   */
  async enable() {
    const management = new ExtensionManagement(this.context, this.id);
    if (await management.isEnabled()) return;
    await management.setEnabled(true);
    await this.waitForReady();
  }

  /**
   * Disables the extension and waits for its worker to stop.
   */
  async disable() {
    const management = new ExtensionManagement(this.context, this.id);
    await Promise.all([this.waitForStopped(), management.setEnabled(false)]);
  }

  /**
   * Enables Developer mode for the browser profile without restarting the extension.
   * Safe to call repeatedly and while the installed extension is disabled.
   */
  async enableDevMode() {
    const management = new ExtensionManagement(this.context, this.id);
    await management.enableDevMode();
  }

  /**
   * Reloads the running extension and waits for its replacement worker and manifest.
   * Enables Developer mode so Chromium permits reloading an unpacked extension.
   */
  async reload() {
    const management = new ExtensionManagement(this.context, this.id);
    if (!(await management.isEnabled())) throw new Error('Extension is disabled.');
    await management.enableDevMode();
    const worker = this.findWorker();
    if (worker) {
      await Promise.all([
        worker.waitForEvent('close'),
        worker.evaluate(() => {
          setTimeout(() => chrome.runtime.reload());
        }),
      ]);
    } else {
      await management.reload();
    }
    await this.waitForReady();
  }

  /**
   * Sets Allow access to file URLs and waits for the replacement worker when enabled.
   * An unchanged setting does not restart the extension.
   */
  async setFileAccess(allowed: boolean) {
    const management = new ExtensionManagement(this.context, this.id);
    const info = await management.getExtensionInfo();
    if (info.fileAccess.isActive === allowed) return;
    const enabled = await management.isEnabled();
    // File access itself does not require Developer mode, but changing it reloads the extension.
    // CDP can initially load our unpacked extension with Developer mode off; on this reload,
    // Chromium disables it with unsupportedDeveloperExtension instead of restarting its worker.
    // Enable Developer mode first so the extension stays enabled and waitForReady() can complete.
    await management.enableDevMode();
    await Promise.all([
      enabled ? this.waitForStopped() : undefined,
      management.updateConfiguration({ fileAccess: allowed }),
    ]);
    if (enabled) await this.waitForReady();
  }

  /**
   * Installs the configured build, or a private copy of a custom build for later upgrade.
   */
  async install(path?: string) {
    this.#id = await this.#installer.install(path);
    await this.waitForReady();
    this.#ready = true;
  }

  /**
   * Replaces the loaded old extension with the configured current version and reloads it.
   */
  async upgrade() {
    await Promise.all([this.waitForStopped(), this.#installer.upgrade()]);
    await this.waitForReady();
  }

  /**
   * Removes the extension from its browser profile.
   */
  async uninstall() {
    const worker = this.findWorker();
    if (worker) {
      await uninstallWithWorker(worker);
    } else {
      await uninstallWithCDP(this.context, this.id);
    }
    this.#ready = false;
  }

  private async waitForReady() {
    if (this.hasServiceWorker) {
      const worker = this.findWorker() ?? (await this.waitForWorker());
      this.#manifest = await readManifestFromWorker(worker);
    } else {
      this.#manifest = await readManifestFromTab(this.context, this.id);
    }
  }

  private async waitForWorker() {
    return await this.context.waitForEvent('serviceworker', {
      predicate: (worker) => worker.url().startsWith(this.getURL()),
    });
  }

  private async waitForStopped() {
    const worker = this.findWorker();
    if (worker) await worker.waitForEvent('close');
  }

  private findWorker() {
    return this.context
      .serviceWorkers()
      .find((worker) => worker.url().startsWith(`chrome-extension://${this.#id}/`));
  }
}
