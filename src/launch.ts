/**
 * Launches the persistent Chromium context that hosts the extension under test.
 */

import { dirname, isAbsolute, resolve } from 'node:path';
import { chromium } from '@playwright/test';
import type { LaunchOptions, ViewportSize } from '@playwright/test';
import { Extension } from './extension.js';

type LaunchExtensionOptions = {
  configFile?: string;
  extensionPath: string;
  headless: boolean;
  launchOptions: Omit<LaunchOptions, 'tracesDir'>;
  timeout: number;
  viewport: ViewportSize | null;
};

/**
 * Starts Chromium with the configured extension and returns its runtime facade.
 */
export async function launchContextWithExtension({
  configFile,
  extensionPath,
  headless,
  launchOptions: { args = [], ...launchOptions },
  timeout,
  viewport,
}: LaunchExtensionOptions): Promise<Extension> {
  const path = resolveExtensionPath(extensionPath, configFile);
  const context = await chromium.launchPersistentContext('', {
    ...launchOptions,
    channel: 'chromium',
    args: [
      ...args,
      `--load-extension=${path}`, // prettier-ignore
      `--disable-extensions-except=${path}`,
    ],
    headless,
    viewport,
  });

  try {
    return await Extension.create(context, timeout);
  } catch (error) {
    await context.close();
    throw error;
  }
}

function resolveExtensionPath(extensionPath: string, configFile?: string): string {
  if (isAbsolute(extensionPath)) {
    return extensionPath;
  }

  const baseDir = configFile ? dirname(configFile) : process.cwd();
  return resolve(baseDir, extensionPath);
}
