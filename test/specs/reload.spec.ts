import { expect } from '@playwright/test';
import { test } from '../../src/index.js';
import { ExtensionManagement } from '../../src/management.js';

test('reload enables Developer mode and waits for the replacement worker', async ({
  extension,
}) => {
  const id = extension.id;
  const oldWorker = extension.worker;
  const oldManifest = extension.manifest;
  await extension.storage.local.set({ beforeReload: true });

  await extension.reload();

  expect(extension.worker).not.toBe(oldWorker);
  expect(extension.context.serviceWorkers()).not.toContain(oldWorker);
  expect(extension.manifest).not.toBe(oldManifest);
  expect(extension.manifest).toEqual(await extension.evaluate(() => chrome.runtime.getManifest()));
  expect(await extension.evaluate(() => chrome.runtime.id)).toBe(id);
  expect(await extension.storage.local.get('beforeReload')).toEqual({ beforeReload: true });
});

test('reload rejects when the extension is disabled', async ({ extension }) => {
  await extension.disable();
  await expect(extension.reload()).rejects.toThrow('Extension service worker is not available.');
});

test('chrome.runtime.reload() disables the unpacked extension without Developer mode', async ({
  extension,
}) => {
  await Promise.all([
    extension.worker.waitForEvent('close'),
    extension.evaluate(() => {
      setTimeout(() => chrome.runtime.reload());
    }),
  ]);

  const management = new ExtensionManagement(extension.context, extension.id);
  expect(await management.isEnabled()).toBe(false);
  expect(() => extension.worker).toThrow('Extension service worker is not available.');
});
