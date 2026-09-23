import { expect } from '@playwright/test';
import { test } from '../../src/index.js';

test('disable / enable', async ({ extension }) => {
  await extension.disable();
  expect(() => extension.worker).toThrow('not available');

  await extension.enable();
  expect(extension.worker).toBeDefined();
});
