/**
 * Creates extension instances and owns their persistent Chromium contexts and build copies.
 */

import { chromium } from '@playwright/test';
import type { BrowserContext, BrowserContextOptions, LaunchOptions } from '@playwright/test';
import { Extension } from './extension.js';
import { throwIf } from './utils/throw-if.js';
import { mergeOptions } from './utils/merge-options.js';

/**
 * Explicit extension settings and forwarded Playwright browser options.
 */
export type LaunchWithExtensionOptions = {
  extensionPath: string;
  extensionAutoInstall?: boolean;
  launchOptions?: LaunchOptions;
  contextOptions?: BrowserContextOptions;
};

/**
 * Defaults for optional launch settings.
 */
const defaults: Required<Pick<LaunchWithExtensionOptions, 'extensionAutoInstall'>> = {
  extensionAutoInstall: true,
};

/**
 * Launches an extension with native Playwright option inheritance.
 * Relative extension paths use the working directory. Call extension.close() for cleanup.
 */
export async function launchWithExtension(options: LaunchWithExtensionOptions) {
  throwIf(!options.extensionPath, 'launchWithExtension requires extensionPath.');
  const resolvedOptions = mergeOptions(defaults, options);
  const context = await launchContext(resolvedOptions);
  const extension = new Extension(context, {
    extensionPath: options.extensionPath,
    locale: resolvedOptions.contextOptions?.locale,
  });
  try {
    if (resolvedOptions.extensionAutoInstall) await extension.install();
    return extension;
  } catch (error) {
    await extension.close();
    throw error;
  }
}

/**
 * Launches a persistent extension-enabled context and restores explicit storage state.
 */
export async function launchContext({
  launchOptions,
  contextOptions,
}: Pick<LaunchWithExtensionOptions, 'launchOptions' | 'contextOptions'>) {
  const context = await chromium.launchPersistentContext('', {
    ...launchOptions,
    channel: 'chromium',
    /**
     * Enables Extensions.loadUnpacked over CDP for installation and upgrades.
     */
    args: [...(launchOptions?.args ?? []), '--enable-unsafe-extension-debugging'],
    /**
     * Omits Playwright's --disable-extensions default so installed extensions can run.
     */
    ignoreDefaultArgs: withIgnoreDefaultArgs(
      launchOptions?.ignoreDefaultArgs,
      '--disable-extensions',
    ),
    ...contextOptions,
  });
  try {
    await setStorageState(context, contextOptions);
    return context;
  } catch (error) {
    await context.close();
    throw error;
  }
}

async function setStorageState(context: BrowserContext, options?: BrowserContextOptions) {
  if (options?.storageState !== undefined) {
    await context.setStorageState(options.storageState);
  }
}

function withIgnoreDefaultArgs(ignoreDefaultArgs: LaunchOptions['ignoreDefaultArgs'], arg: string) {
  return ignoreDefaultArgs === true ? true : [...(ignoreDefaultArgs || []), arg];
}
