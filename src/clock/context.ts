/**
 * Initializes and pauses Playwright's context clock using its public controls.
 */

import type { BrowserContext } from '@playwright/test';
import type { ExtensionClockOptions } from '../options.js';
import { parseClockTime } from './helpers.js';

/**
 * Configures page clocks before the extension is loaded.
 */
export async function initContextClock(context: BrowserContext, options: ExtensionClockOptions) {
  const time = parseClockTime(options.time);
  if (options.mode !== 'full-control') {
    await context.clock.setFixedTime(time);
    return;
  }
  await context.clock.install({ time });
  if (options.paused) await pauseContextClock(context, time);
}

/**
 * Pauses at the supplied initial time or the current date sampled from a context page.
 */
export async function pauseContextClock(context: BrowserContext, time?: number) {
  const pausedTime = time ?? (await readContextTime(context));
  // Freeze the date before pausing so transport latency cannot put the target time in the past.
  await context.clock.setFixedTime(pausedTime);
  await context.clock.pauseAt(pausedTime);
  await context.clock.setSystemTime(pausedTime);
}

async function readContextTime(context: BrowserContext) {
  const existingPage = context.pages()[0];
  // Playwright exposes no clock time getter; a page reads its fake time without tracking it ourselves.
  const page = existingPage ?? (await context.newPage());
  try {
    return await page.evaluate(() => Date.now());
  } finally {
    if (!existingPage) await page.close();
  }
}
