/**
 * Launches the persistent Chromium context that hosts the extension under test.
 */

import { chromium } from '@playwright/test';
import type { LaunchOptions, ViewportSize } from '@playwright/test';
import { Extension } from './extension.js';

type LaunchExtensionOptions = {
  extensionPath: string;
  headless: boolean;
  launchOptions: Omit<LaunchOptions, 'tracesDir'>;
  locale?: string;
  timeout: number;
  viewport: ViewportSize | null;
};

/**
 * Starts Chromium with the configured extension and returns its runtime facade.
 */
export async function launchContextWithExtension({
  extensionPath,
  headless,
  launchOptions: { args = [], ...launchOptions },
  locale,
  timeout,
  viewport,
}: LaunchExtensionOptions): Promise<Extension> {
  const context = await chromium.launchPersistentContext('', {
    ...launchOptions,
    channel: 'chromium',
    args: [
      ...args,
      `--load-extension=${extensionPath}`, // prettier-ignore
      `--disable-extensions-except=${extensionPath}`,
    ],
    headless,
    locale,
    viewport,
  });

  const extension = new Extension(context);
  await extension.waitForReady(timeout);
  return extension;
}
