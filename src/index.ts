/**
 * Provides the public Playwright Test fixtures for loading and interacting with extensions.
 */

/// <reference types="chrome" preserve="true" />

import { dirname, isAbsolute, resolve } from 'node:path';
import { test as base, type BrowserContextOptions } from '@playwright/test';
import { Extension } from './extension.js';
import { ExtensionCopy } from './copy.js';
import { launchContextWithExtension } from './launch.js';
import { createVideoRecording } from './video.js';
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
  // eslint-disable-next-line max-lines-per-function, max-statements -- Keep the fixture lifecycle together.
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
    throwIf(!extensionPath, 'The extension fixture requires use.extensionPath.');
    throwIf(
      browserName !== 'chromium',
      `The extension fixture only supports Chromium projects; received "${browserName}".`,
    );

    const { configFile } = testInfo.config;
    extensionPath = resolvePath(extensionPath, configFile);
    const extensionCopy = new ExtensionCopy();
    const videoRecording = await createVideoRecording(video, testInfo);

    try {
      const context = await launchContextWithExtension({
        headless,
        launchOptions,
        contextOptions: buildContextOptions(contextOptions, {
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
      });

      try {
        videoRecording?.track(context);
        const extension = new Extension(context, {
          extensionPath,
          extensionCopy,
          baseDir: configFile ? dirname(configFile) : process.cwd(),
          locale,
          timeout: testInfo.timeout,
        });
        // eslint-disable-next-line max-depth -- Nested cleanup guarantees context, video, and copy teardown in order.
        if (extensionAutoInstall) await extension.install();
        await use(extension);
      } finally {
        await context.close();
      }
    } finally {
      try {
        await videoRecording?.finish();
      } finally {
        await extensionCopy.cleanup();
      }
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

function buildContextOptions(
  contextOptions: BrowserContextOptions,
  individualOptions: BrowserContextOptions,
): BrowserContextOptions {
  return {
    ...contextOptions,
    ...Object.fromEntries(
      Object.entries(individualOptions).filter(([, value]) => value !== undefined),
    ),
  };
}
