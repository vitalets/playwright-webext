/**
 * Opens and interacts with the extension options page.
 */

import type { Page } from '@playwright/test';
import type { Extension } from 'playwright-webext';

export class Options {
  page!: Page;

  constructor(private readonly extension: Extension) {}

  get heading() {
    return this.page.getByRole('heading');
  }

  get checkbox() {
    return this.page.getByRole('checkbox');
  }

  async open() {
    this.page = await this.extension.openOptions();
  }
}
