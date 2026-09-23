/**
 * Manages extensions through Chromium APIs exposed on chrome://extensions.
 */

import type { BrowserContext, Page } from '@playwright/test';

/**
 * Configuration switches exposed by Chromium's extension management page.
 */
export type ExtensionConfiguration = {
  incognitoAccess?: boolean;
  fileAccess?: boolean;
  userScriptsAccess?: boolean;
  pinnedToToolbar?: boolean;
};

type ExtensionsChrome = typeof chrome & {
  developerPrivate: {
    updateExtensionConfiguration(
      configuration: ExtensionConfiguration & { extensionId: string },
    ): Promise<void>;
  };
};

/**
 * Provides API access to extensions in the current browser profile.
 *
 * Operations await Chromium's API completion; callers synchronize worker lifecycle separately.
 */
export class ExtensionsPage {
  #page?: Page;

  constructor(private readonly context: BrowserContext) {}

  /**
   * Returns the currently open management page.
   */
  get page(): Page {
    if (!this.#page || this.#page.isClosed()) {
      throw new Error('Extensions page is not open. Call open() first.');
    }
    return this.#page;
  }

  /**
   * Opens the privileged page that exposes Chromium's extension management APIs.
   */
  async open(): Promise<void> {
    if (this.#page && !this.#page.isClosed()) return;
    const page = await this.context.newPage();
    try {
      await page.goto('chrome://extensions/');
      this.#page = page;
    } catch (error) {
      await page.close();
      throw error;
    }
  }

  /**
   * Enables the extension with the supplied ID.
   */
  async enable(id: string): Promise<void> {
    await this.setEnabled(id, true);
  }

  /**
   * Disables the extension with the supplied ID.
   */
  async disable(id: string): Promise<void> {
    await this.setEnabled(id, false);
  }

  /**
   * Returns whether Chromium has enabled the extension.
   */
  async isEnabled(id: string): Promise<boolean> {
    return this.page.evaluate(async (id) => (await chrome.management.get(id)).enabled, id);
  }

  /**
   * Updates configuration switches without requiring Developer mode.
   */
  async updateConfiguration(id: string, configuration: ExtensionConfiguration): Promise<void> {
    await this.page.evaluate(
      ({ id, configuration }) =>
        (chrome as ExtensionsChrome).developerPrivate.updateExtensionConfiguration({
          ...configuration,
          extensionId: id,
        }),
      { id, configuration },
    );
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

  private async setEnabled(id: string, enabled: boolean): Promise<void> {
    await this.page.evaluate(({ id, enabled }) => chrome.management.setEnabled(id, enabled), {
      id,
      enabled,
    });
  }
}
