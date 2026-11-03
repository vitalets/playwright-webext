/**
 * Defines clock configuration and resolves its initial time before installation.
 */

import type { BrowserContext } from '@playwright/test';
import { hasExplicitTimezone, parseClockTime, resolveInBrowserTimezone } from './helpers.js';

/**
 * Fixes the date by default, or enables full timer control before extension code runs.
 */
export type ExtensionClockOptions = {
  /**
   * Fixed or starting date as Unix milliseconds, a date string, HH:mm, or a Date.
   * HH:mm uses the browser's current date and timezone.
   */
  time: number | string | Date;
} & (
  | {
      /**
       * Keeps dates fixed and timers running. This is the default mode.
       */
      withTimers?: false;
      paused?: never;
    }
  | {
      /**
       * Enables full timer control in pages and the worker.
       */
      withTimers: true;
      /**
       * Starts fake time paused. Defaults to false.
       */
      paused?: boolean;
    }
);

/**
 * Clock options with the initial time resolved to Unix milliseconds.
 */
export type ExtensionClockOptionsResolved = ExtensionClockOptions & { time: number };

/**
 * Normalizes configured clock options to a shared initial timestamp.
 */
export async function resolveClockOptions(
  context: BrowserContext,
  options?: ExtensionClockOptions,
) {
  if (!options) return;
  return {
    ...options,
    // The problem:
    // If time is provided as a string WITH timezone,
    // it's value in browser's timezone will be different,
    // that is unconvenient for testing.
    // For example:
    // - passed time: '2030-01-01T23:30Z'
    // - browser timezone: Europe/Madrid (UTC+1 in January)
    // - in browser page: new Date() => January 2, 2030 at 00:30 (UTC+1)
    //
    // If time is provided as a string WITHOUT timezone,
    // we should treat it as browser's timezone.
    // We could pass it as is, but Playwright internally applies Date() in the Node.js timezone,
    // which is not the same as the browser's timezone.
    // See: https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/server/clock.ts#L136-L142
    // so we need to resolve the time in the browser's timezone,
    // convert it to timestamp and pass to Playwright.
    time: await resolveClockTime(context, options.time),
  } satisfies ExtensionClockOptionsResolved;
}

/**
 * Resolves timezone-free date-time and HH:mm strings using the browser's timezone.
 */
export async function resolveClockTime(context: BrowserContext, time: number | string | Date) {
  if (typeof time !== 'string' || hasExplicitTimezone(time)) return parseClockTime(time);
  return resolveInBrowserTimezone(context, time);
}
