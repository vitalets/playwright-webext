import { expect } from '@playwright/test';
import { test } from '../../src/index.js';

test('opens an embedded options document in a regular tab', async ({ extension }) => {
  extension.manifest.options_page = 'legacy-options.html';
  expect(extension.optionsUrl).toBe(extension.getURL('options.html'));
  const page = await extension.openOptions();

  await expect(page).toHaveURL(extension.getURL('options.html'));
  await expect(page.getByRole('heading', { name: 'Test Options' })).toBeVisible();
});

test('falls back to the legacy options_page declaration', async ({ extension }) => {
  extension.manifest.options_ui = undefined;
  extension.manifest.options_page = 'options.html';
  expect(extension.optionsUrl).toBe(extension.getURL('options.html'));

  const page = await extension.openOptions();

  await expect(page).toHaveURL(extension.getURL('options.html'));
});

test('rejects missing options without opening a tab', async ({ extension }) => {
  extension.manifest.options_ui = undefined;
  extension.manifest.options_page = undefined;
  const pages = extension.context.pages();

  expect(() => extension.optionsUrl).toThrow(
    'Extension does not define options_ui.page or options_page.',
  );
  await expect(extension.openOptions()).rejects.toThrow('options_ui.page or options_page');
  expect(extension.context.pages()).toEqual(pages);
});
