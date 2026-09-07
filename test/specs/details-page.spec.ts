import { expect } from '@playwright/test';
import { test } from '../../src/index.js';

test('disables and enables the extension', async ({ extension }) => {
  const detailsPage = await extension.openDetailsPage();

  await detailsPage.disable();
  await expect.poll(() => extension.context.serviceWorkers()).toHaveLength(0);

  await detailsPage.enable();
  await expect.poll(() => extension.context.serviceWorkers()).toHaveLength(1);

  await detailsPage.close();
  expect(detailsPage.page.isClosed()).toBe(true);
});
