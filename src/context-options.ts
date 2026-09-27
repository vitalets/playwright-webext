/**
 * Prepares context options for test-scoped and worker-scoped extension fixtures.
 */

import type {
  BrowserContextOptions,
  PlaywrightTestOptions,
  PlaywrightWorkerOptions,
} from '@playwright/test';
import { removeUndefined } from './utils.js';

/**
 * Playwright Test fills missing context options from the current test, even for manual
 * launchPersistentContext() calls. Its hook checks property presence (`key in options`),
 * so omitting a key lets the first requesting test's overrides leak into the shared context.
 * Keep every key present, using undefined where no default is needed, to block that fallback.
 * Project settings override these values below; test-scoped settings must not apply.
 * Concrete defaults match Playwright Test's context option defaults. This also prevents
 * an unconfigured storageState from inheriting a test-level file path that Playwright would
 * try to read, even though persistent launch does not support restoring state from that option.
 */
const CONTEXT_DEFAULTS = {
  acceptDownloads: true,
  baseURL: undefined,
  bypassCSP: false,
  clientCertificates: undefined,
  colorScheme: 'light',
  contrast: undefined,
  deviceScaleFactor: undefined,
  extraHTTPHeaders: undefined,
  forcedColors: undefined,
  geolocation: undefined,
  hasTouch: false,
  httpCredentials: undefined,
  ignoreHTTPSErrors: false,
  isMobile: false,
  javaScriptEnabled: true,
  locale: 'en-US',
  logger: undefined,
  offline: false,
  permissions: undefined,
  proxy: undefined,
  recordHar: undefined,
  recordVideo: undefined,
  reducedMotion: undefined,
  screen: undefined,
  serviceWorkers: 'allow',
  storageState: undefined,
  strictSelectors: undefined,
  timezoneId: undefined,
  userAgent: undefined,
  viewport: { width: 1280, height: 720 },
} satisfies Record<keyof BrowserContextOptions, unknown> & BrowserContextOptions;

type ContextOptions = Partial<PlaywrightTestOptions>;

/**
 * Merges context options, applying only defined override values.
 */
export function mergeContextOptions(
  contextOptions: BrowserContextOptions,
  overrides: BrowserContextOptions,
): BrowserContextOptions {
  return {
    ...contextOptions,
    ...removeUndefined(overrides),
  };
}

/**
 * Combines project settings with explicit defaults and disables video for the shared context.
 */
export function buildWorkerContextOptions(
  options: ContextOptions,
  launchOptions: PlaywrightWorkerOptions['launchOptions'],
): BrowserContextOptions {
  const topLevelContextOptions = Object.fromEntries(
    Object.keys(CONTEXT_DEFAULTS).map((key) => [key, options[key as keyof ContextOptions]]),
  );
  const contextOptions = {
    ...CONTEXT_DEFAULTS,
    /**
     * Mirrors Playwright's baseURL fixture default, which is not resolved in project.use.
     * Explicit project settings below take precedence.
     */
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL,
    /**
     * Preserves a launch-level proxy that the undefined context default would otherwise overwrite.
     * Explicit project context settings below take precedence.
     */
    proxy: launchOptions.proxy,
    ...options.contextOptions,
  };
  return {
    ...mergeContextOptions(contextOptions, topLevelContextOptions),
    /**
     * Disables video even when configured in use.contextOptions: this context spans tests,
     * while the fixture's video retention and attachments require per-test context teardown.
     */
    recordVideo: undefined,
  };
}
