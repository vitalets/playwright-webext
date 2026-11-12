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
 * Reads the browser's current timestamp, opening a temporary page if needed.
 */
export async function readBrowserTime(context: BrowserContext) {
  const existingPage = context.pages()[0];
  const page = existingPage ?? (await context.newPage());
  try {
    return await page.evaluate(() => Date.now());
  } finally {
    if (!existingPage) await page.close();
  }
}

/**
 * Parses a date or HH:mm string using the browser's date and timezone.
 */
export async function resolveInBrowserTimezone(context: BrowserContext, time: string) {
  if (!isValidTimeOnlyValue(time)) throw new Error(`Invalid clock time: ${time}`);
  const existingPage = context.pages()[0];
  const page = existingPage ?? (await context.newPage());
  try {
    const milliseconds = await page.evaluate((value) => {
      // Only time, e.g. "13:00", is interpreted as today at that time in the browser's timezone.
      if (/^\d+:\d+$/.test(value)) {
        const [hours, minutes] = value.split(':').map(Number);
        return new Date().setHours(hours, minutes, 0, 0);
      }
      return new Date(value).getTime();
    }, time);
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

function isValidTimeOnlyValue(time: string) {
  return !/^\d+:\d+$/.test(time) || /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}
