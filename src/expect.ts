/**
 * Provides polling assertions for browser extension runtime state.
 */

import { expect, type Worker } from '@playwright/test';

/**
 * Controls which storage area is checked and how long the assertion polls.
 */
export type ExpectStorageKeyOptions = {
  area?: 'local' | 'sync' | 'session';
  timeout?: number;
};

/**
 * Polls an extension storage key until its value equals the expected value.
 * Playwright asymmetric matchers can be used for partial matching.
 */
export async function expectStorageKey(
  worker: Worker,
  key: string,
  expected: unknown,
  options: ExpectStorageKeyOptions = {},
): Promise<void> {
  const { area = 'local', timeout } = options;

  await expect
    .poll(
      () =>
        worker.evaluate(
          async ({ area, key }) => {
            const values = await chrome.storage[area].get(key);
            return values[key];
          },
          { area, key },
        ),
      { timeout },
    )
    .toEqual(expected);
}
