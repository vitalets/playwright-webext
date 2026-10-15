/**
 * Finds and interacts with the welcome page opened during installation.
 */

import type { Page } from '@playwright/test';
import type { Extension } from 'playwright-webext';

export class Welcome {
  page!: Page;

  constructor(private readonly extension: Extension) {}

  get heading() {
    return this.page.getByRole('heading');
  }

  get closeButton() {
    return this.page.getByRole('button');
  }

  async waitForOpen() {
    // Installation can open the page before the test starts, so poll existing pages.
    this.page = await this.extension.pollForPage(this.extension.getURL('src/welcome.html'));
  }
}
