/**
 * Opens and interacts with the extension popup.
 */

import type { Page } from '@playwright/test';
import type { Extension } from 'playwright-webext';

export class Popup {
  page!: Page;

  constructor(private readonly extension: Extension) {}

  get heading() {
    return this.page.getByRole('heading');
  }

  get closeButton() {
    return this.page.getByRole('button');
  }

  async open() {
    this.page = await this.extension.openPopup();
  }
}
