import { expect } from '@playwright/test';
import { test } from '../../src/index.js';

test('evaluates functions and expressions and preserves result types', async ({ extensionW }) => {
  const id: string = await extensionW.waitForFunction(() => chrome.runtime.id);
  expect(id).toBe(extensionW.id);
  const result: { value: string } = await extensionW.waitForFunction(
    ({ value }) => Promise.resolve({ value }),
    { value: 'ready' },
    { timeout: 1_000, intervals: [10] },
  );
  expect(result).toEqual({ value: 'ready' });
  expect(await extensionW.waitForFunction('chrome.runtime.id')).toBe(extensionW.id);
});

test('waits for an unavailable worker to start', async ({ extensionW }) => {
  await extensionW.disable();
  const [id] = await Promise.all([
    extensionW.waitForFunction(() => chrome.runtime.id),
    extensionW.enable(),
  ]);
  expect(id).toBe(extensionW.id);
});
