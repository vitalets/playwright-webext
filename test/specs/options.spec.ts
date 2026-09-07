import { expect } from '@playwright/test';
import { test } from '../../src/index.js';

test('opens an embedded options document in a regular tab', async ({ extension }) => {
  const page = await extension.openOptions();

  await expect(page).toHaveURL(extension.getURL('options.html'));
  await expect(page.getByRole('heading', { name: 'Test Options' })).toBeVisible();
});

test('falls back to the legacy options_page declaration', async ({ extension }) => {
  extension.manifest.options_ui = undefined;
  extension.manifest.options_page = 'options.html';

  const page = await extension.openOptions();

  await expect(page).toHaveURL(extension.getURL('options.html'));
});
