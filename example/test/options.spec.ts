import { expect } from '@playwright/test';
import { test } from './fixtures';

test('persists the options checkbox', async ({ options, extension }) => {
  await options.open();
  await expect(options.checkbox).not.toBeChecked();

  await options.checkbox.check();
  await extension.storage.local.expect('checked').toBe(true);

  await options.page.reload();
  await expect(options.checkbox).toBeChecked();
});
