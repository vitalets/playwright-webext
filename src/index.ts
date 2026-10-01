/**
 * Provides the public Playwright Test fixtures for loading and interacting with extensions.
 */

/// <reference types="chrome" preserve="true" />

import { dirname, resolve } from 'node:path';
import { test as base } from '@playwright/test';
import { Extension } from './extension.js';
import { launchContext } from './launch.js';
import { createVideoRecording } from './video.js';
import { runAll } from './utils/run-all.js';
import { throwIf } from './utils/throw-if.js';
import { removeUndefined } from './utils/remove-undefined.js';

/**
 * Configuration accepted by the extension test fixtures.
 */
export type WebextOptions = WebextTestOptions & WebextWorkerOptions;

/**
 * Options available to both test-scoped and worker-scoped fixtures.
 */
export type WebextWorkerOptions = {
  extensionPath: string;
};

/**
 * Options that can vary between tests.
 */
export type WebextTestOptions = {
  extensionAutoInstall?: boolean;
};

/**
 * Fixtures added to the base Playwright test.
 */
export type WebextFixtures = {
  extension: Extension;
};

export { Extension } from './extension.js';
export { launchWithExtension, type LaunchWithExtensionOptions } from './launch.js';
export { waitUntil, type WaitUntilOptions } from './utils/wait-until.js';

/**
 * Playwright test extended with extension configuration and fixtures.
 */
export const test = base.extend<WebextTestOptions & WebextFixtures, WebextWorkerOptions>({
  extensionPath: ['', { option: true, scope: 'worker' }],
  extensionAutoInstall: [true, { option: true }],
  // eslint-disable-next-line max-lines-per-function
  extension: async (
    {
      extensionPath,
      extensionAutoInstall,
      // playwright fixtures
      browserName,
      headless,
      launchOptions,
      contextOptions,
      acceptDownloads,
      baseURL,
      bypassCSP,
      clientCertificates,
      colorScheme,
      deviceScaleFactor,
      extraHTTPHeaders,
      geolocation,
      hasTouch,
      httpCredentials,
      ignoreHTTPSErrors,
      isMobile,
      javaScriptEnabled,
      locale,
      offline,
      permissions,
      proxy,
      serviceWorkers,
      storageState,
      timezoneId,
      userAgent,
      viewport,
      video,
    },
    use,
    testInfo,
  ) => {
    validateOptions(extensionPath, browserName);

    const { configFile } = testInfo.config;
    const baseDir = configFile ? dirname(configFile) : process.cwd();
    const videoRecording = await createVideoRecording(video, testInfo);

    let extension: Extension | undefined;
    try {
      // Launch separately from launchWithExtension to track video before extension installation.
      const context = await launchContext({
        launchOptions: { ...launchOptions, headless },
        contextOptions: {
          ...contextOptions,
          ...removeUndefined({
            recordVideo: videoRecording?.options,
            acceptDownloads,
            baseURL,
            bypassCSP,
            clientCertificates,
            colorScheme,
            deviceScaleFactor,
            extraHTTPHeaders,
            geolocation,
            hasTouch,
            httpCredentials,
            ignoreHTTPSErrors,
            isMobile,
            javaScriptEnabled,
            locale,
            offline,
            permissions,
            proxy,
            serviceWorkers,
            storageState,
            timezoneId,
            userAgent,
            viewport,
          }),
        },
      });
      extension = new Extension(context, {
        extensionPath: resolve(baseDir, extensionPath),
        locale,
      });
      videoRecording?.track(context);
      if (extensionAutoInstall) await extension.install();
      await use(extension);
    } finally {
      await runAll([
        () => extension?.close(), // prettier-ignore
        () => videoRecording?.finish(),
      ]);
    }
  },
});

function validateOptions(extensionPath: string, browserName: string) {
  throwIf(!extensionPath, 'The extension fixture requires use.extensionPath.');
  throwIf(
    browserName !== 'chromium',
    `The extension fixture only supports Chromium projects; received "${browserName}".`,
  );
}
