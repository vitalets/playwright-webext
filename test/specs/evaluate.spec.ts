import { expect } from '@playwright/test';
import { test } from '../../src/index.js';

test('evaluate', async ({ extension }) => {
  // no params
  expect(await extension.evaluate(() => chrome.runtime.id)).toBe(extension.id);
  // with params
  expect(await extension.evaluate(({ foo }) => foo, { foo: 'bar' })).toBe('bar');
  // as string
  expect(await extension.evaluate('chrome.runtime.id')).toBe(extension.id);
  // error
  await expect(
    extension.evaluate(() => {
      throw new Error('Evaluation failed');
    }),
  ).rejects.toThrow('Evaluation failed');
});

test('evaluate throws after disable', async ({ extension }) => {
  await extension.disable();
  expect(() => extension.evaluate(() => chrome.runtime.id)).toThrow('not available');

  await extension.enable();
  expect(await extension.evaluate(() => chrome.runtime.id)).toBe(extension.id);
});
