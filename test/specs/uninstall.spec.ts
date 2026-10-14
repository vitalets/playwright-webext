import { expect } from '@playwright/test';
import { test } from '../../src/index.js';

test('uninstalls the extension', async ({ extension }) => {
  await extension.uninstall();

  expect(extension.context.serviceWorkers()).toHaveLength(0);
  expect(() => extension.worker).toThrow('not available');

  const page = await extension.pollForPage('https://example.com/uninstalled');
  await expect(page).toHaveURL('https://example.com/uninstalled');
});

test('uninstalls a disabled extension and opens its feedback page', async ({ extension }) => {
  await extension.disable();
  await extension.uninstall();
  const page = await extension.pollForPage('https://example.com/uninstalled');
  await expect(page).toHaveURL('https://example.com/uninstalled');
});
