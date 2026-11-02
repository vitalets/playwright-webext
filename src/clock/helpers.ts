/**
 * Normalizes clock arguments before either execution context is modified.
 */

import type { BrowserContext } from '@playwright/test';

/**
 * Accepts the date forms used by Playwright's clock.
 */
export function parseClockTime(time: number | string | Date) {
  const milliseconds = new Date(time).getTime();
  if (!Number.isFinite(milliseconds)) throw new Error(`Invalid clock time: ${String(time)}`);
  return milliseconds;
}

/**
 * Rejects numeric timestamps outside JavaScript's valid Date range.
 */
export function validateClockTime(time: number) {
  if (!Number.isFinite(time) || Math.abs(time) > 8.64e15)
    throw new Error(`Invalid clock time: ${time}`);
}

/**
 * Accepts milliseconds or Playwright's seconds, mm:ss, and hh:mm:ss duration strings.
 */
export function parseClockDuration(ticks: number | string) {
  if (typeof ticks === 'number') {
    if (!Number.isFinite(ticks) || ticks < 0)
      throw new Error('Clock duration must be finite and non-negative.');
    return Math.ceil(ticks);
  }
  if (!/^([0-5]\d:){0,2}[0-5]?\d$/.test(ticks)) throw new Error(`Invalid clock duration: ${ticks}`);
  const parts = ticks.split(':').map(Number);
  return parts.reduce((seconds, part) => seconds * 60 + part, 0) * 1000;
}

/**
 * Parses a date string using the browser's timezone.
 */
export async function resolveInBrowserTimezone(context: BrowserContext, time: string) {
  const existingPage = context.pages()[0];
  const page = existingPage ?? (await context.newPage());
  try {
    const milliseconds = await page.evaluate((value) => new Date(value).getTime(), time);
    if (!Number.isFinite(milliseconds)) throw new Error(`Invalid clock time: ${time}`);
    return milliseconds;
  } finally {
    if (!existingPage) await page.close();
  }
}

/**
 * Detects date strings that specify their own timezone.
 */
export function hasExplicitTimezone(time: string) {
  // Recognize ISO offsets and named zones accepted by Date, including Date.toString() output.
  return /(?:z|[+-]\d{2}:?\d{2}|\b(?:GMT|UTC|[ECMP][SD]T))(?:\s*\([^)]*\))?\s*$/i.test(time);
}
