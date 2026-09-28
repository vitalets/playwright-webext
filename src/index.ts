/**
 * Provides the public Playwright Test fixtures for loading and interacting with extensions.
 */

/// <reference types="chrome" preserve="true" />

import { dirname, isAbsolute, resolve } from 'node:path';
import { test as base, type BrowserContext } from '@playwright/test';
import { Extension } from './extension.js';
import { ExtensionCopy } from './copy.js';
import { launchContextWithExtension } from './launch.js';
import { createVideoRecording } from './video.js';
import { runAll } from './utils/run-all.js';
import { throwIf } from './utils/throw-if.js';
import { mergeContextOptions, buildWorkerContextOptions } from './context-options.js';

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

/**
 * Fixtures shared by tests running in the same Playwright worker.
 */
export type WebextWorkerFixtures = {
  extensionW: Extension;
};

export { Extension } from './extension.js';
export { waitUntil, type WaitUntilOptions } from './utils/wait-until.js';

/**
 * Playwright test extended with extension configuration and fixtures.
 */
export const test = base.extend<WebextOptions & WebextFixtures, WebextWorkerFixtures>({
  extensionPath: ['', { option: true }],
  extensionAutoInstall: [true, { option: true }],
  // eslint-disable-next-line max-lines-per-function, max-statements
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
    validateOptions('extension', extensionPath, browserName);

    const { configFile } = testInfo.config;
    extensionPath = resolvePath(extensionPath, configFile);
    const extensionCopy = new ExtensionCopy();
    const videoRecording = await createVideoRecording(video, testInfo);

    let context: BrowserContext | undefined;
    try {
      context = await launchContextWithExtension({
        headless,
        launchOptions,
        contextOptions: mergeContextOptions(contextOptions, {
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
      videoRecording?.track(context);
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
      await runAll([
        () => context?.close(),
        () => videoRecording?.finish(),
        () => extensionCopy.cleanup(),
      ]);
    }
  },
  extensionW: [
    // eslint-disable-next-line max-statements
    async ({ browserName, headless, launchOptions }, use, workerInfo) => {
      const options = workerInfo.project.use as Partial<WebextOptions>;
      validateOptions('extensionW', options.extensionPath, browserName);

      const { configFile } = workerInfo.config;
      const extensionPath = resolvePath(options.extensionPath!, configFile);
      const extensionCopy = new ExtensionCopy();
      const contextOptions = buildWorkerContextOptions(workerInfo.project.use, launchOptions);

      let context: BrowserContext | undefined;
      try {
        context = await launchContextWithExtension({ headless, launchOptions, contextOptions });
        const extension = new Extension(context, {
          extensionPath,
          extensionCopy,
          baseDir: configFile ? dirname(configFile) : process.cwd(),
          locale: contextOptions.locale,
          timeout: workerInfo.project.timeout,
        });
        if (options.extensionAutoInstall ?? true) await extension.install();
        await use(extension);
      } finally {
        await runAll([
          () => context?.close(), // prettier-ignore
          () => extensionCopy.cleanup(),
        ]);
      }
    },
    { scope: 'worker' },
  ],
});

function validateOptions(
  fixtureName: 'extension' | 'extensionW',
  extensionPath: string | undefined,
  browserName: string,
) {
  const configHint = fixtureName === 'extensionW' ? ' in the config' : '';
  throwIf(!extensionPath, `The ${fixtureName} fixture requires use.extensionPath${configHint}.`);
  throwIf(
    browserName !== 'chromium',
    `The ${fixtureName} fixture only supports Chromium projects; received "${browserName}".`,
  );
}

function resolvePath<T extends string | undefined>(extensionPath: T, configFile?: string) {
  if (!extensionPath) return extensionPath;

  if (isAbsolute(extensionPath)) {
    return extensionPath;
  }

  const baseDir = configFile ? dirname(configFile) : process.cwd();
  return resolve(baseDir, extensionPath);
}
