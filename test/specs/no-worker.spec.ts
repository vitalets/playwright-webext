import { expect } from '@playwright/test';
import { test, launchWithExtension } from '../../src/index.js';
import { ExtensionManagement } from '../../src/management.js';

test.use({ extensionPath: './data/extension-no-worker' });

test('installs with a resolved manifest and cleans up the temporary page', ({ extension }) => {
  expect(extension.ready).toBe(true);
  expect(extension.hasServiceWorker).toBe(false);
  expect(extension.id).toMatch(/^[a-p]{32}$/);
  expect(extension.manifest.name).toBe('Workerless test extension');
  expect(extension.manifest.background).toBeUndefined();
  expect(extension.manifest.key).toBeUndefined();
  expect(extension.context.serviceWorkers()).toHaveLength(0);
  expect(extension.context.pages().map((page) => page.url())).toEqual(['about:blank']);
  const manifest = extension.manifest;
  expect(extension.manifest).toBe(manifest);
  expect(() => extension.worker).toThrow('Extension service worker is not available.');
});

test('opens the popup and rejects worker-only operations', async ({ extension }) => {
  const page = await extension.openPopup();
  await expect(page.getByRole('heading')).toHaveText('Workerless popup');
  expect(await page.evaluate(() => chrome.runtime.getManifest())).toEqual(extension.manifest);
  expect(() => extension.evaluate(() => true)).toThrow('service worker is not available');
  await expect(extension.dispatch('runtime.onStartup')).rejects.toThrow(
    'service worker is not available',
  );
  await expect(extension.storage.local.get()).rejects.toThrow('service worker is not available');
  await expect(extension.waitForFunction(() => true)).rejects.toThrow('does not declare');
  expect(extension.context.serviceWorkers()).toHaveLength(0);
});

test('disables, enables, and reloads without waiting for worker events', async ({ extension }) => {
  const management = new ExtensionManagement(extension.context, extension.id);
  await extension.disable();
  expect(extension.ready).toBe(true);
  expect(await management.isEnabled()).toBe(false);
  await expect(extension.reload()).rejects.toThrow('Extension is disabled.');
  await extension.enable();
  const manifest = extension.manifest;
  await extension.enable();
  expect(extension.manifest).toBe(manifest);
  await extension.reload();
  expect(extension.manifest).not.toBe(manifest);
  expect(extension.manifest).toEqual(manifest);
  expect(extension.context.pages().map((page) => page.url())).toEqual(['about:blank']);
  await expect((await extension.openPopup()).getByRole('heading')).toHaveText('Workerless popup');
  expect(extension.context.serviceWorkers()).toHaveLength(0);
});

test('changes file access while enabled and disabled', async ({ extension }) => {
  const management = new ExtensionManagement(extension.context, extension.id);
  await extension.setFileAccess(false);
  expect((await management.getExtensionInfo()).fileAccess.isActive).toBe(false);
  const manifest = extension.manifest;
  await extension.setFileAccess(false);
  expect(extension.manifest).toBe(manifest);
  await extension.disable();
  await extension.setFileAccess(true);
  expect(await management.isEnabled()).toBe(false);
  await extension.enable();
  expect((await management.getExtensionInfo()).fileAccess.isActive).toBe(true);
  expect(extension.context.serviceWorkers()).toHaveLength(0);
});

test('uninstalls the extension', async ({ extension }) => {
  await extension.uninstall();
  expect(extension.ready).toBe(false);
  await expect(
    new ExtensionManagement(extension.context, extension.id).isEnabled(),
  ).rejects.toThrow();
  expect(extension.context.serviceWorkers()).toHaveLength(0);
});

test('uninstalls while disabled without opening temporary pages', async ({ extension }) => {
  await extension.disable();
  const openedPages: string[] = [];
  extension.context.on('page', (page) => openedPages.push(page.url()));
  await extension.uninstall();
  expect(openedPages).toEqual([]);
  await expect(
    new ExtensionManagement(extension.context, extension.id).isEnabled(),
  ).rejects.toThrow();
  await expect(extension.uninstall()).rejects.toThrow('could not find extension');
});

test.describe('deferred installation', () => {
  test.use({ extensionAutoInstall: false });

  test('installs on demand', async ({ extension }) => {
    expect(extension.ready).toBe(false);
    await extension.install();
    expect(extension.ready).toBe(true);
    expect(extension.manifest.name).toBe('Workerless test extension');
    expect(extension.context.serviceWorkers()).toHaveLength(0);
    await extension.close();
    expect(extension.ready).toBe(false);
  });

  test('upgrades from a worker-backed extension to a workerless one', async ({ extension }) => {
    await extension.install('./test/data/extension-0.1.0');
    const id = extension.id;
    const worker = extension.worker;
    await extension.upgrade();
    expect(extension.id).toBe(id);
    expect(extension.manifest.name).toBe('Workerless test extension');
    expect(extension.hasServiceWorker).toBe(false);
    expect(extension.context.serviceWorkers()).not.toContain(worker);
    expect(() => extension.worker).toThrow('service worker is not available');
  });
});

test('upgrades from a workerless extension to a worker-backed one', async ({ channel }) => {
  const extension = await launchWithExtension({
    extensionPath: './test/data/extension',
    extensionAutoInstall: false,
    launchOptions: { channel, headless: true },
  });
  try {
    await extension.install('./test/data/extension-no-worker');
    const id = extension.id;
    await extension.upgrade();
    expect(extension.id).toBe(id);
    expect(extension.hasServiceWorker).toBe(true);
    expect(extension.manifest.background?.service_worker).toBe('background.js');
    expect(await extension.evaluate(() => chrome.runtime.id)).toBe(id);
  } finally {
    await extension.close();
  }
});
