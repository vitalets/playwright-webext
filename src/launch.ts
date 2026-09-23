/**
 * Launches the persistent Chromium context that hosts the extension under test.
 */

import { chromium } from '@playwright/test';
import type { BrowserContext, LaunchOptions, ViewportSize } from '@playwright/test';

type LaunchExtensionOptions = {
  headless: boolean;
  launchOptions: Omit<LaunchOptions, 'tracesDir'>;
  locale?: string;
  viewport: ViewportSize | null;
};

/**
 * Starts Chromium with CDP extension installation enabled and returns its persistent context.
 */
export async function launchContextWithExtension({
  headless,
  launchOptions: { args = [], ignoreDefaultArgs, ...launchOptions },
  locale,
  viewport,
}: LaunchExtensionOptions): Promise<BrowserContext> {
  return chromium.launchPersistentContext('', {
    ...launchOptions,
    channel: 'chromium',
    /**
     * Enables Extensions.loadUnpacked over CDP for installation and upgrades.
     */
    args: [...args, '--enable-unsafe-extension-debugging'],
    /**
     * Omits Playwright's --disable-extensions default so installed extensions can run.
     */
    ignoreDefaultArgs:
      ignoreDefaultArgs === true ? true : [...(ignoreDefaultArgs || []), '--disable-extensions'],
    headless,
    locale,
    viewport,
  });
}
