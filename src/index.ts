/**
 * Provides the public Playwright Test fixtures for loading and interacting with extensions.
 */

/// <reference types="chrome" preserve="true" />

import { dirname, isAbsolute, resolve } from 'node:path';
import { test as base } from '@playwright/test';
import { Extension } from './extension.js';
import { ExtensionCopy } from './copy.js';
import { launchContextWithExtension } from './launch.js';
import { throwIf } from './utils.js';

/**
 * Configuration accepted by the extension test fixtures.
 */
export type WebextOptions = {
  extensionPath: string;
  extensionAutoInstall?: boolean;
};

/**
 * Fixtures added to the base Playwright test.
 */
export type WebextFixtures = {
  extension: Extension;
};

export { Extension } from './extension.js';

/**
 * Playwright test extended with extension configuration and fixtures.
 */
export const test = base.extend<WebextOptions & WebextFixtures>({
  extensionPath: ['', { option: true }],
  extensionAutoInstall: [true, { option: true }],
  extension: async (
    { browserName, extensionPath, headless, launchOptions, locale, extensionAutoInstall, viewport },
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
    const extensionCopy = new ExtensionCopy();

    try {
      const context = await launchContextWithExtension({
        headless,
        launchOptions,
        locale,
        viewport,
      });

      try {
        const extension = new Extension(context, {
          extensionPath,
          extensionCopy,
          baseDir: configFile ? dirname(configFile) : process.cwd(),
          locale,
          timeout: testInfo.timeout,
        });
        if (extensionAutoInstall) await extension.install();
        await use(extension);
      } finally {
        await context.close();
      }
    } finally {
      await extensionCopy.cleanup();
    }
  },
});

function resolvePath<T extends string | undefined>(extensionPath: T, configFile?: string) {
  if (!extensionPath) return extensionPath;

  if (isAbsolute(extensionPath)) {
    return extensionPath;
  }

  const baseDir = configFile ? dirname(configFile) : process.cwd();
  return resolve(baseDir, extensionPath);
}
