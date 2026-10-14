import { generateKeyPairSync } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect } from '@playwright/test';
import { test, launchWithExtension } from '../../src/index.js';
import { ExtensionManagement } from '../../src/management.js';
import { readManifestFromTab } from '../../src/manifest.js';

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

test('uninstalls and cleans up a failed manifest read', async ({ extension }) => {
  await extension.uninstall();
  expect(extension.ready).toBe(false);
  const pages = extension.context.pages();
  await expect(
    new ExtensionManagement(extension.context, extension.id).isEnabled(),
  ).rejects.toThrow();
  await expect(readManifestFromTab(extension.context, extension.id)).rejects.toThrow();
  expect(extension.context.pages()).toEqual(pages);
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

  test('reads a document-free extension with comments and an explicit key', async ({
    extension,
  }, testInfo) => {
    const path = testInfo.outputPath('extension');
    await mkdir(path, { recursive: true });
    const { publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const key = publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
    await writeFile(
      join(path, 'manifest.json'),
      '// Manifest comment accepted by Chrome.\n' +
        JSON.stringify({ manifest_version: 3, name: 'Key test', version: '1.0', key }),
    );
    await extension.install(path);
    expect(extension.manifest.key).toBe(key);
    expect(extension.context.serviceWorkers()).toHaveLength(0);
  });

  test('does not attach another extension worker', async ({ extension }) => {
    const session = await extension.context.browser()!.newBrowserCDPSession();
    try {
      await session.send('Extensions.loadUnpacked', {
        path: new URL('../data/extension/', import.meta.url).pathname,
      });
      await extension.install();
      expect(extension.context.serviceWorkers()).toHaveLength(1);
      expect(extension.manifest.name).toBe('Workerless test extension');
      expect(() => extension.worker).toThrow('service worker is not available');
    } finally {
      await session.detach();
    }
  });

  test('rejects a missing declared worker script', async ({ extension }, testInfo) => {
    const path = testInfo.outputPath('broken-worker');
    await mkdir(path, { recursive: true });
    await writeFile(
      join(path, 'manifest.json'),
      JSON.stringify({
        manifest_version: 3,
        name: 'Broken worker',
        version: '1.0',
        background: { service_worker: 'background.js' },
      }),
    );
    extension.context.setDefaultTimeout(2_000);
    await expect(extension.install(path)).rejects.toThrow();
    expect(() => extension.manifest).toThrow('Extension is not ready');
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

test('upgrades from a workerless extension to a worker-backed one', async () => {
  const extension = await launchWithExtension({
    extensionPath: './test/data/extension',
    extensionAutoInstall: false,
    launchOptions: { headless: true },
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
