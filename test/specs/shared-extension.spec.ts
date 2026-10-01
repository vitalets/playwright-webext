import { dirname, resolve } from 'node:path';
import { expect } from '@playwright/test';
import { test as base, launchWithExtension, type Extension } from '../../src/index.js';

const test = base.extend<{}, { sharedExtension: Extension }>({
  sharedExtension: [
    async ({ extensionPath, headless, launchOptions }, use, workerInfo) => {
      const configFile = workerInfo.config.configFile;
      const baseDir = configFile ? dirname(configFile) : process.cwd();
      const extension = await launchWithExtension({
        extensionPath: resolve(baseDir, extensionPath),
        launchOptions: { ...launchOptions, headless },
      });
      await use(extension);
      await extension.close();
    },
    { scope: 'worker' },
  ],
});

// Verifies file-level worker option overrides and config-relative resolution in the recipe.
test.use({ extensionPath: './data/extension-0.1.0' });

let firstContext: unknown;

test.describe('first requesting test', () => {
  test.use({ locale: 'es', viewport: { width: 777, height: 555 } });

  test('inherits context settings when the shared extension is created', async ({
    sharedExtension,
  }) => {
    firstContext = sharedExtension.context;
    expect(sharedExtension.manifest.version).toBe('0.1.0');
    const page = await sharedExtension.context.newPage();
    expect(await page.evaluate(() => navigator.language)).toBe('es');
    expect(page.viewportSize()).toEqual({ width: 777, height: 555 });
    await sharedExtension.storage.local.set({ theme: 'dark' });
  });
});

test.describe('later test', () => {
  test.use({ locale: 'en', viewport: { width: 999, height: 666 } });

  test('reuses the first context, settings, and state', async ({ sharedExtension }) => {
    expect(sharedExtension.context).toBe(firstContext);
    await sharedExtension.storage.local.expect('theme').toEqual('dark');
    const page = await sharedExtension.context.newPage();
    expect(await page.evaluate(() => navigator.language)).toBe('es');
    expect(page.viewportSize()).toEqual({ width: 777, height: 555 });
  });
});
