import { expect } from '@playwright/test';
import { test } from '../../src/index.js';

test('evaluates functions and expressions and preserves result types', async ({ extension }) => {
  const id: string = await extension.waitForFunction(() => chrome.runtime.id);
  expect(id).toBe(extension.id);
  const result: { value: string } = await extension.waitForFunction(
    ({ value }) => Promise.resolve({ value }),
    { value: 'ready' },
    { timeout: 1_000, intervals: [10] },
  );
  expect(result).toEqual({ value: 'ready' });
  expect(await extension.waitForFunction('chrome.runtime.id')).toBe(extension.id);
});

test('waits for an unavailable worker to start', async ({ extension }) => {
  await extension.disable();
  const [id] = await Promise.all([
    extension.waitForFunction(() => chrome.runtime.id),
    extension.enable(),
  ]);
  expect(id).toBe(extension.id);
});
