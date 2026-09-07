import { expect } from '@playwright/test';
import { test } from '../src/index.js';

test('disables and enables the extension', async ({ extension }) => {
  const detailsPage = await extension.openDetailsPage();
  const originalWorker = extension.worker;

  await Promise.all([detailsPage.disable(), originalWorker.waitForEvent('close')]);
  expect(extension.context.serviceWorkers()).toHaveLength(0);

  await detailsPage.enable();
  await extension.waitForReady();

  const runtimeId = await extension.worker.evaluate(
    (prefix) => `${prefix}${chrome.runtime.id}`,
    'extension:',
  );
  expect(runtimeId).toBe(`extension:${extension.id}`);
  expect(extension.worker).not.toBe(originalWorker);

  await detailsPage.close();
  expect(detailsPage.page.isClosed()).toBe(true);
});

test('uninstalls the extension', async ({ extension }) => {
  await extension.uninstall();

  expect(() => extension.worker).toThrow('Extension service worker is not yet available.');
  expect(extension.context.serviceWorkers()).toHaveLength(0);
});
