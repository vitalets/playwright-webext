/**
 * Waits for asynchronous conditions in tests.
 */

import { expect } from '@playwright/test';

export type WaitUntilOptions = Pick<
  Extract<Parameters<typeof expect.poll>[1], object>,
  'timeout' | 'intervals'
>;

/**
 * Polls until the callback returns a truthy value and returns that value.
 */
export async function waitUntil<T>(callback: () => T | Promise<T>, options?: WaitUntilOptions) {
  let value!: T;

  await expect
    .poll(async () => {
      value = await callback();
      return value;
    }, options)
    .toBeTruthy();

  return value;
}
