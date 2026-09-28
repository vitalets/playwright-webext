/**
 * Manages one extension through Chromium APIs exposed on chrome://extensions.
 */

/// <reference types="chrome" preserve="true" />

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
    updateProfileConfiguration(configuration: { inDeveloperMode: boolean }): Promise<void>;
    getExtensionInfo(id: string): Promise<{ fileAccess: { isActive: boolean } }>;
    updateExtensionConfiguration(
      configuration: ExtensionConfiguration & { extensionId: string },
    ): Promise<void>;
  };
};

/**
 * Provides API access to a specific extension in the current browser profile.
 *
 * Each operation opens and closes its own management page.
 * Operations await Chromium's API completion; callers synchronize worker lifecycle separately.
 */
export class ExtensionManagement {
  constructor(
    private readonly context: BrowserContext,
    private readonly id: string,
  ) {}

  /**
   * Enables or disables the extension.
   */
  async setEnabled(enabled: boolean) {
    await this.withPage((page) =>
      page.evaluate(({ id, enabled }) => chrome.management.setEnabled(id, enabled), {
        id: this.id,
        enabled,
      }),
    );
  }

  /**
   * Returns whether Chromium has enabled the extension.
   */
  async isEnabled() {
    return this.withPage((page) =>
      page.evaluate(async (id) => (await chrome.management.get(id)).enabled, this.id),
    );
  }

  /**
   * Returns Chromium's configuration details for the installed extension.
   */
  async getExtensionInfo() {
    return this.withPage((page) =>
      page.evaluate(
        (id) => (chrome as ExtensionsChrome).developerPrivate.getExtensionInfo(id),
        this.id,
      ),
    );
  }

  /**
   * Updates configuration switches without requiring Developer mode.
   */
  async updateConfiguration(configuration: ExtensionConfiguration) {
    await this.withPage((page) =>
      page.evaluate(
        ({ id, configuration }) =>
          (chrome as ExtensionsChrome).developerPrivate.updateExtensionConfiguration({
            ...configuration,
            extensionId: id,
          }),
        { id: this.id, configuration },
      ),
    );
  }

  /**
   * Enables Developer mode in the browser profile.
   */
  async enableDeveloperMode() {
    await this.withPage((page) =>
      page.evaluate(() =>
        (chrome as ExtensionsChrome).developerPrivate.updateProfileConfiguration({
          inDeveloperMode: true,
        }),
      ),
    );
  }

  private async withPage<T>(action: (page: Page) => Promise<T>) {
    const page = await this.context.newPage();
    try {
      await page.goto('chrome://extensions/');
      return await action(page);
    } finally {
      await page.close();
    }
  }
}
