import { expect } from '@playwright/test';
import { test } from '../../src/index.js';

test('dispatch without arguments', async ({ extension }) => {
  await extension.evaluate(() => {
    chrome.runtime.onStartup.addListener(() => {
      void chrome.storage.local.set({ startup: true });
    });
  });
  await extension.dispatch('runtime.onStartup');
  await extension.storage.local.expect('startup').toBe(true);
});

test('dispatch with args', async ({ extension }) => {
  await extension.storage.local.expect('onInstalled').toEqual({ reason: 'install' });
  await extension.dispatch('runtime.onInstalled', { reason: 'update', previousVersion: '1.0' });
  await extension.storage.local.expect('onInstalled').toEqual({
    reason: 'update',
    previousVersion: '1.0',
  });
});

test('dispatch with multiple arguments', async ({ extension }) => {
  await extension.evaluate(() => {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (changes.synthetic) void chrome.storage.local.set({ received: [changes, area] });
    });
  });
  const changes = { synthetic: { oldValue: 'before', newValue: 'after' } };
  await extension.dispatch('storage.onChanged', changes, 'sync');
  await extension.storage.local.expect('received').toEqual([changes, 'sync']);
  await extension.storage.local.expect('synthetic').toBeUndefined();
});

test('dispatch invalid namespace', async ({ extension }) => {
  // @ts-expect-error Exercise runtime validation for JavaScript callers.
  await expect(extension.dispatch('missing.onEvent')).rejects.toThrow(
    'Chrome event "missing.onEvent"',
  );
});
