import { expect } from '@playwright/test';
import { test } from '../../src/index.js';

test('uninstalls the extension', async ({ extension }) => {
  await extension.uninstall();

  expect(extension.context.serviceWorkers()).toHaveLength(0);
  expect(() => extension.worker).toThrow('not available');
});
