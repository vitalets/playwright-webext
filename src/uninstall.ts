/**
 * Removes extensions through their worker or a browser CDP session.
 */

import type { BrowserContext, Worker } from '@playwright/test';
import { uninstallClock } from './clock/index.js';

/**
 * Requests self-uninstallation and waits for the service worker to close.
 */
export async function uninstallWithWorker(worker: Worker) {
  await uninstallClock(worker);
  await Promise.all([
    worker.waitForEvent('close'),
    worker.evaluate(() => {
      setTimeout(() => {
        void chrome.management.uninstallSelf({ showConfirmDialog: false });
      });
    }),
  ]);
}

/**
 * Uninstalls an unpacked extension and waits for Chromium to complete removal.
 */
export async function uninstallWithCDP(context: BrowserContext, id: string) {
  const browser = context.browser();
  if (!browser) throw new Error('Extension uninstallation requires a browser CDP session.');
  const session = await browser.newBrowserCDPSession();
  try {
    // chrome.management.uninstall() from chrome://extensions forces a confirmation dialog even
    // with showConfirmDialog: false; chrome.developerPrivate.removeMultipleExtensions() does too.
    // CDP waits for removal without a dialog or extension document,
    // works while disabled, and preserves the extension's uninstall feedback page.
    await session.send('Extensions.uninstall', { id });
  } finally {
    await session.detach();
  }
}
