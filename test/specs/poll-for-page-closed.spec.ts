import { expect } from '@playwright/test';
import { test } from '../../src/index.js';

test('waits for an open page to close', async ({ extension }) => {
  const page = await extension.openPopup();
  await Promise.all([extension.pollForPageClosed(page, { intervals: [10] }), page.close()]);
  expect(page.isClosed()).toBe(true);
});

test('accepts an already closed page', async ({ extension }) => {
  const page = await extension.openPopup();
  await page.close();
  await extension.pollForPageClosed(page);
});

test('times out without closing the page', async ({ extension }) => {
  const page = await extension.openPopup();
  await expect(
    extension.pollForPageClosed(page, { timeout: 100, intervals: [10] }),
  ).rejects.toThrow(/Timeout/);
  expect(page.isClosed()).toBe(false);
});
