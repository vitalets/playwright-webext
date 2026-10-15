import { expect } from '@playwright/test';
import { test } from './fixtures';

test('stores the installation date', async ({ bg }) => {
  await expect.poll(() => bg.getInstallationDate()).toBeTruthy();
});
