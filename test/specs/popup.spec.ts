import { expect } from '@playwright/test';
import { test } from '../../src/index.js';

test('opens the popup document in a regular tab', async ({ extension }) => {
  expect(extension.popupUrl).toBe(extension.getURL('popup.html'));
  const page = await extension.openPopup();

  await expect(page).toHaveURL(extension.getURL('popup.html'));
  await expect(page.getByRole('heading', { name: 'Test Popup' })).toBeVisible();
});

test('rejects a missing popup without opening a tab', async ({ extension }) => {
  extension.manifest.action = undefined;
  const pages = extension.context.pages();

  expect(() => extension.popupUrl).toThrow('Extension does not define action.default_popup.');
  await expect(extension.openPopup()).rejects.toThrow('action.default_popup');
  expect(extension.context.pages()).toEqual(pages);
});
