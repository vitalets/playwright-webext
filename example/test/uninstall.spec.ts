import { expect } from '@playwright/test';
import { test } from './fixtures';

test('opens the uninstall page', async ({ extension }) => {
  await extension.uninstall();
  const page = await extension.pollForPage(/uninstall/);
  await expect(page).toHaveURL('https://example.com/uninstall');
});
