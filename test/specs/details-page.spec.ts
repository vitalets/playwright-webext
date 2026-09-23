import { expect } from '@playwright/test';
import { test } from '../../src/index.js';

test('disables and enables the extension', async ({ extension }) => {
  const originalWorker = extension.worker;
  const detailsPage = await extension.openDetailsPage();

  await detailsPage.disable();
  await expect(() => {
    expect(() => extension.worker).toThrow('not available');
  }).toPass();

  await detailsPage.enable();
  await expect(() => {
    expect(extension.worker).not.toBe(originalWorker);
  }).toPass();
  expect(await extension.worker.evaluate(() => chrome.runtime.id)).toBe(extension.id);

  await detailsPage.close();
  expect(detailsPage.page.isClosed()).toBe(true);
});
