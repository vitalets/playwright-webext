import { expect } from '@playwright/test';
import { test } from '../../src/index.js';

test('disable / enable', async ({ extension }) => {
  const pageCount = extension.context.pages().length;

  await extension.disable();
  expect(() => extension.worker).toThrow('not available');

  await extension.enable();
  expect(extension.worker).toBeDefined();

  await extension.enable();
  expect(extension.worker).toBeDefined();

  // Management operations should close their temporary pages, including when already enabled.
  expect(extension.context.pages()).toHaveLength(pageCount);
});
