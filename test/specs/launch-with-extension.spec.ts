import { relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { launchWithExtension } from '../../src/index.js';

const extensionPath = fileURLToPath(new URL('../data/extension', import.meta.url));
const oldPath = fileURLToPath(new URL('../data/extension-0.1.0', import.meta.url));

test.use({ locale: 'en', viewport: { width: 900, height: 600 } });

test('applies explicit context options and localizes the extension', async () => {
  const extension = await launchWithExtension({
    extensionPath,
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

test('manual installation and upgrade resolve direct paths from cwd', async () => {
  const extension = await launchWithExtension({
    extensionPath: relative(process.cwd(), extensionPath),
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
