import { expect } from '@playwright/test';
import { test } from '../../src/index.js';

test('matches local storage values by default', async ({ extension }) => {
  await extension.worker.evaluate(() =>
    chrome.storage.local.set({
      enabled: true,
      settings: { appearance: { theme: 'dark', fontSize: 16 }, notifications: true },
    }),
  );

  await extension.expectStorageKey('enabled', true);
  await extension.expectStorageKey(
    'settings',
    expect.objectContaining({
      appearance: expect.objectContaining({ theme: 'dark' }),
    }),
  );
});

for (const area of ['sync', 'session'] as const) {
  test(`matches a value in ${area} storage`, async ({ extension }) => {
    await extension.worker.evaluate(
      ({ area }) => chrome.storage[area].set({ greeting: `hello from ${area}` }),
      { area },
    );

    await extension.expectStorageKey('greeting', `hello from ${area}`, { area });
  });
}

test('polls for a delayed storage update', async ({ extension }) => {
  await extension.worker.evaluate(() => {
    setTimeout(() => {
      void chrome.storage.local.set({ status: 'ready' });
    }, 100);
  });

  await extension.expectStorageKey('status', 'ready');
});

test('matches a missing storage key as undefined', async ({ extension }) => {
  await extension.expectStorageKey('missing', undefined);
});

test('forwards the polling timeout', async ({ extension }) => {
  await expect(extension.expectStorageKey('missing', 'value', { timeout: 50 })).rejects.toThrow(
    /Timeout 50ms exceeded/,
  );
});
