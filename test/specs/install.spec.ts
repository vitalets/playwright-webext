import { expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { test } from '../../src/index.js';

test('auto install by default', async ({ extension }) => {
  expect(extension.id).toBeDefined();
  expect(extension.manifest.version).toBe('1.0.0');
});

test.describe('manual install', () => {
  test.use({ extensionAutoInstall: false });

  test('installs the current build on demand', async ({ extension }) => {
    expect(extension.context.serviceWorkers()).toHaveLength(0);
    expect(() => extension.worker).toThrow('not available');

    await extension.install();

    expect(extension.id).toBeDefined();
    expect(extension.manifest.version).toBe('1.0.0');
  });

  test('allows retry after an invalid custom path', async ({ extension }) => {
    await expect(extension.install('./missing-extension')).rejects.toThrow();
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
