/**
 * Provides the public Playwright Test fixtures for loading and interacting with extensions.
 */

/// <reference types="chrome" preserve="true" />

import { dirname, isAbsolute, resolve } from 'node:path';
import { test as base } from '@playwright/test';
import { Extension } from './extension.js';
import { ExtensionCopy } from './extension-copy.js';
import { isDefaultLocale, localizeExtension } from './i18n.js';
import { launchContextWithExtension } from './launch.js';
import { throwIf } from './utils.js';

/**
 * Configuration accepted by the extension test fixtures.
 */
export type WebextOptions = {
  extensionPath: string;
  oldVersionExtensionPath?: string;
};

/**
 * Fixtures added to the base Playwright test.
 */
export type WebextFixtures = {
  extension: Extension;
};

export type { ExpectStorageKeyOptions } from './expect.js';
export { Extension } from './extension.js';
export { ExtensionDetailsPage } from './internal-pages/extension-details.js';

/**
 * Playwright test extended with extension configuration and fixtures.
 */
export const test = base.extend<WebextOptions & WebextFixtures>({
  extensionPath: ['', { option: true }],
  oldVersionExtensionPath: [undefined, { option: true }],
  extension: async (
    {
      browserName,
      extensionPath,
      headless,
      launchOptions,
      locale,
      oldVersionExtensionPath,
      viewport,
    },
    use,
    testInfo,
  ) => {
    throwIf(!extensionPath, 'The extension fixture requires use.extensionPath.');
    throwIf(
      browserName !== 'chromium',
      `The extension fixture only supports Chromium projects; received "${browserName}".`,
    );

    const { configFile } = testInfo.config;
    extensionPath = resolvePath(extensionPath, configFile);
    oldVersionExtensionPath = resolvePath(oldVersionExtensionPath, configFile);

    const extensionCopy = await createExtensionCopyIfNeeded(
      extensionPath,
      oldVersionExtensionPath,
      locale,
    );

    // todo: move to helper
    const upgradeOptions =
      oldVersionExtensionPath && extensionCopy
        ? { extensionCopy, extensionPath, locale }
        : undefined;

    try {
      const context = await launchContextWithExtension({
        extensionPath: extensionCopy?.path ?? extensionPath,
        headless,
        launchOptions,
        locale,
        viewport,
      });

      try {
        const extension = new Extension(context, upgradeOptions);
        await extension.waitForReady(testInfo.timeout);
        await use(extension);
      } finally {
        await context.close();
      }
    } finally {
      await extensionCopy?.cleanup();
    }
  },
});

async function createExtensionCopyIfNeeded(
  extensionPath: string,
  oldVersionExtensionPath?: string,
  locale?: string,
) {
  let extensionCopy: ExtensionCopy | undefined;

  if (oldVersionExtensionPath) {
    extensionCopy = await new ExtensionCopy().copyFrom(oldVersionExtensionPath);
  }

  if (!isDefaultLocale(locale)) {
    extensionCopy = extensionCopy || (await new ExtensionCopy().copyFrom(extensionPath));
    await localizeExtension(extensionCopy.path, locale);
  }

  return extensionCopy;
}

function resolvePath<T extends string | undefined>(extensionPath: T, configFile?: string) {
  if (!extensionPath) return extensionPath;

  if (isAbsolute(extensionPath)) {
    return extensionPath;
  }

  const baseDir = configFile ? dirname(configFile) : process.cwd();
  return resolve(baseDir, extensionPath);
}
