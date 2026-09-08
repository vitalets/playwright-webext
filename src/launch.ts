/**
 * Launches the persistent Chromium context that hosts the extension under test.
 */

import { chromium } from '@playwright/test';
import type { BrowserContext, LaunchOptions, ViewportSize } from '@playwright/test';

type LaunchExtensionOptions = {
  extensionPath: string;
  headless: boolean;
  launchOptions: Omit<LaunchOptions, 'tracesDir'>;
  locale?: string;
  viewport: ViewportSize | null;
};

/**
 * Starts Chromium with the configured extension and returns its persistent context.
 */
export async function launchContextWithExtension({
  extensionPath,
  headless,
  launchOptions: { args = [], ...launchOptions },
  locale,
  viewport,
}: LaunchExtensionOptions): Promise<BrowserContext> {
  return chromium.launchPersistentContext('', {
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
}
