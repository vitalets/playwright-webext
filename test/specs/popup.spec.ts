import { expect } from '@playwright/test';
import { test } from '../../src/index.js';

test('opens the popup document in a regular tab', async ({ extension }) => {
  const page = await extension.openPopup();

  await expect(page).toHaveURL(extension.getURL('popup.html'));
  await expect(page.getByRole('heading', { name: 'Test Popup' })).toBeVisible();
});
