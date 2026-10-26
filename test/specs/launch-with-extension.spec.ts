import { existsSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { expect } from '@playwright/test';
import { test, launchWithExtension } from '../../src/index.js';

test.use({ locale: 'en', viewport: { width: 900, height: 600 } });

test('applies explicit context options and localizes the extension', async ({
  extensionPath,
}, testInfo) => {
  const configDir = dirname(testInfo.config.configFile!);
  const extension = await launchWithExtension({
    extensionPath: resolve(configDir, extensionPath),
    contextOptions: {
      locale: 'es',
      viewport: { width: 640, height: 480 },
      storageState: createStorageState(),
    },
  });
  try {
    expect(extension.manifest.name).toBe('Extensión de prueba');
    const page = await extension.context.newPage();
    expect(await page.evaluate(() => navigator.language)).toBe('es');
    expect(page.viewportSize()).toEqual({ width: 640, height: 480 });
    expect(await extension.context.cookies()).toEqual([
      expect.objectContaining({ name: 'session', value: 'yes' }),
    ]);
  } finally {
    await extension.close();
  }
});

test('manual installation and upgrade', async ({ extensionPath }, testInfo) => {
  const configDir = dirname(testInfo.config.configFile!);
  const oldPath = resolve(configDir, './data/extension-0.1.0');
  const extension = await launchWithExtension({
    extensionPath: relative(process.cwd(), resolve(configDir, extensionPath)),
    extensionAutoInstall: false,
  });
  expect(extension.context.serviceWorkers()).toHaveLength(0);
  await extension.install(relative(process.cwd(), oldPath));
  expect(extension.manifest.version).toBe('0.1.0');
  await extension.storage.local.set({ theme: 'dark' });
  await extension.upgrade();
  expect(extension.manifest.version).toBe('1.0.0');
  await extension.storage.local.expect('theme').toEqual('dark');
  await extension.close();
});

test('rejects a missing extension path before launch', async () => {
  await expect(launchWithExtension({ extensionPath: '' })).rejects.toThrow(
    'requires extensionPath',
  );
});

test('standalone instances retain independent directories and cleanup', async () => {
  const first = await launchWithExtension({
    extensionPath: resolve('test/data/extension'),
    contextOptions: { locale: 'es' },
  });
  try {
    const second = await launchWithExtension({
      extensionPath: resolve('test/data/extension'),
      contextOptions: { locale: 'es' },
    });
    try {
      expect(first.loadedPath).not.toBe(second.loadedPath);
      await second.close();
      expect(existsSync(second.loadedPath)).toBe(false);
      expect(existsSync(first.loadedPath)).toBe(true);
    } finally {
      await second.close();
    }
  } finally {
    await first.close();
  }
  expect(existsSync(first.loadedPath)).toBe(false);
});

function createStorageState() {
  return {
    cookies: [
      {
        name: 'session',
        value: 'yes',
        domain: 'example.test',
        path: '/',
        expires: -1,
        httpOnly: false,
        secure: true,
        sameSite: 'Lax' as const,
      },
    ],
    origins: [],
  };
}
