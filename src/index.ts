/**
 * Provides the public Playwright Test fixtures for loading and interacting with extensions.
 */

/// <reference types="chrome" preserve="true" />

import { dirname, isAbsolute, resolve } from 'node:path';
import { test as base } from '@playwright/test';
import { Extension } from './extension.js';
import { createLocalizedCopyIfNeeded } from './i18n.js';
import { launchContextWithExtension } from './launch.js';
import { throwIf } from './utils.js';

/**
 * Configuration accepted by the extension test fixtures.
 */
export type WebextOptions = {
  extensionPath: string;
};

/**
 * Fixtures added to the base Playwright test.
 */
export type WebextFixtures = {
  extension: Extension;
};

export { Extension } from './extension.js';
export { ExtensionDetailsPage } from './details-page.js';

/**
 * Playwright test extended with extension configuration and fixtures.
 */
export const test = base.extend<WebextOptions & WebextFixtures>({
  extensionPath: ['', { option: true }],
  extension: async (
    { browserName, extensionPath, headless, launchOptions, locale, viewport },
    use,
    testInfo,
  ) => {
    throwIf(!extensionPath, 'The extension fixture requires use.extensionPath.');
    throwIf(
      browserName !== 'chromium',
      `The extension fixture only supports Chromium projects; received "${browserName}".`,
    );

    extensionPath = resolveExtensionPath(extensionPath, testInfo.config.configFile);
    const localizedExtensionCopy = await createLocalizedCopyIfNeeded(extensionPath, locale);

    const extension = await launchContextWithExtension({
      extensionPath: localizedExtensionCopy?.path ?? extensionPath,
      headless,
      launchOptions,
      locale,
      timeout: testInfo.timeout,
      viewport,
    });

    await use(extension);
    await extension.context.close();
    await localizedExtensionCopy?.close();
  },
});

/**
 * Playwright assertions bound to the extended test instance.
 */
export const expect = test.expect;

function resolveExtensionPath(extensionPath: string, configFile?: string): string {
  if (isAbsolute(extensionPath)) {
    return extensionPath;
  }

  const baseDir = configFile ? dirname(configFile) : process.cwd();
  return resolve(baseDir, extensionPath);
}
