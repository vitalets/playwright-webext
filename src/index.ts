/**
 * Provides the public Playwright Test fixtures for loading and interacting with extensions.
 */

/// <reference types="chrome" preserve="true" />

import { test as base } from '@playwright/test';
import { Extension } from './extension.js';
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

/**
 * Playwright test extended with extension configuration and fixtures.
 */
export const test = base.extend<WebextOptions & WebextFixtures>({
  extensionPath: ['', { option: true }],
  extension: async ({ browserName, extensionPath, headless, viewport }, use, testInfo) => {
    throwIf(!extensionPath, 'The extension fixture requires use.extensionPath.');
    throwIf(
      browserName !== 'chromium',
      `The extension fixture only supports Chromium projects; received "${browserName}".`,
    );

    const extension = await launchContextWithExtension({
      configFile: testInfo.config.configFile,
      extensionPath,
      headless,
      timeout: testInfo.timeout,
      viewport,
    });

    await use(extension);
    await extension.context.close();
  },
});

/**
 * Playwright assertions bound to the extended test instance.
 */
export const expect = test.expect;
