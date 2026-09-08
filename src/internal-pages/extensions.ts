/**
 * Controls Chromium's extension-management page.
 */

import type { BrowserContext, Page } from '@playwright/test';

/**
 * Provides controls shared across Chromium's extension-management surface.
 */
export class ExtensionsPage {
  #page?: Page;

  /**
   * Creates a page object for the supplied browser context.
   */
  constructor(private readonly context: BrowserContext) {}

  get page(): Page {
    if (!this.#page) {
      throw new Error('Extensions page is not open.');
    }
    return this.#page;
  }

  /**
   * Opens Chromium's extension-management page in a new tab.
   */
  async open(): Promise<void> {
    this.#page = await this.context.newPage();
    try {
      await this.#page.goto('chrome://extensions');
    } catch (error) {
      await this.close();
      throw error;
    }
  }

  /**
   * Enables Developer Mode so Chromium permits an unpacked command-line extension to reload.
   * Without it, Chromium disables the extension as an unsupported developer extension on reload.
   */
  async enableDeveloperMode(): Promise<void> {
    const toggle = this.page.locator('#devMode');
    if ((await toggle.getAttribute('aria-pressed')) !== 'true') {
      await toggle.click();
    }
  }

  /**
   * Closes the underlying Playwright page if it is still open.
   */
  async close(): Promise<void> {
    if (this.#page && !this.#page.isClosed()) {
      await this.#page.close();
    }
    this.#page = undefined;
  }
}
