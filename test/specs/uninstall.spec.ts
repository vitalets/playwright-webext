import { expect } from '@playwright/test';
import { test } from '../../src/index.js';

test('uninstalls the extension', async ({ extension }) => {
  await extension.uninstall();

  await expect.poll(() => extension.context.serviceWorkers()).toHaveLength(0);
});
