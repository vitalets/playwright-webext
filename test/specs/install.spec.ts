import { expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { test } from '../../src/index.js';

test('auto install by default', ({ extension }) => {
  expect(extension.ready).toBe(true);
  expect(extension.hasServiceWorker).toBe(true);
  expect(extension.id).toBeDefined();
  expect(extension.manifest.version).toBe('1.0.0');
});

test.describe('manual install', () => {
  test.use({ extensionAutoInstall: false });

  test('installs the current build without opening a manifest tab', async ({ extension }) => {
    expect(extension.hasServiceWorker).toBeUndefined();
    expect(extension.context.serviceWorkers()).toHaveLength(0);
    expect(() => extension.worker).toThrow('not available');

    const openedPages: string[] = [];
    extension.context.on('page', (page) => openedPages.push(page.url()));
    await extension.install();

    expect(openedPages).toEqual([]);
    expect(extension.manifest).toEqual(
      await extension.evaluate(() => chrome.runtime.getManifest()),
    );
    expect(extension.id).toBeDefined();
    expect(extension.manifest.version).toBe('1.0.0');
  });

  test('allows retry after an invalid custom path', async ({ extension }) => {
    await expect(extension.install('./missing-extension')).rejects.toThrow();
    expect(extension.ready).toBe(false);
    expect(extension.context.serviceWorkers()).toHaveLength(0);
    await extension.install();
    expect(extension.manifest.version).toBe('1.0.0');
  });

  test('accepts an absolute custom path', async ({ extension }) => {
    await extension.install(fileURLToPath(new URL('../data/extension-0.1.0', import.meta.url)));
    expect(extension.manifest.version).toBe('0.1.0');
  });

  test.describe('localized installation', () => {
    test.use({ locale: 'es' });
    test('localizes the current build', async ({ extension }) => {
      await extension.install();
      expect(extension.manifest.name).toBe('Extensión de prueba');
    });
  });
});
