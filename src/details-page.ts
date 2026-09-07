/**
 * Controls the Chromium details page for one loaded extension.
 */

import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Provides user-facing controls for enabling and disabling a loaded extension.
 *
 * Create this page object with `extension.openDetailsPage()`.
 */
export class ExtensionDetailsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Enables the extension and waits for Chromium to display the enabled state.
   */
  async enable(): Promise<void> {
    await this.setEnabled(true);
  }

  /**
   * Disables the extension and waits for Chromium to display the disabled state.
   */
  async disable(): Promise<void> {
    await this.setEnabled(false);
  }

  /**
   * Returns whether Chromium displays the extension as enabled.
   */
  async isEnabled(): Promise<boolean> {
    return (await this.getEnableToggle().getAttribute('aria-pressed')) === 'true';
  }

  /**
   * Closes the underlying Playwright page if it is still open.
   */
  async close(): Promise<void> {
    if (!this.page.isClosed()) {
      await this.page.close();
    }
  }

  private async setEnabled(enabled: boolean): Promise<void> {
    const toggle = this.getEnableToggle();

    if ((await this.isEnabled()) !== enabled) {
      await toggle.click();
    }

    await expect.poll(() => this.isEnabled()).toBe(enabled);
  }

  private getEnableToggle(): Locator {
    return this.page.locator('#enableToggle:visible').first();
  }
}
