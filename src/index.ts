/// <reference types="chrome" preserve="true" />

import { test as base } from '@playwright/test';
import { Extension } from './extension.js';
import { launchContextWithExtension } from './launch.js';
import { throwIf } from './utils.js';

export { Extension } from './extension.js';

export type WebextOptions = {
  extensionPath: string;
};

export type WebextFixtures = {
  extension: Extension;
};

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

export const expect = test.expect;
