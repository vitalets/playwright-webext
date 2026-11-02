/**
 * Controls page and frame clocks through Playwright's public browser context API.
 */

import type { BrowserContext } from '@playwright/test';
import type { ExtensionClockOptions } from './options.js';
import { validateClockTime } from './helpers.js';

/**
 * Configures and manipulates fake time shared by pages in a browser context.
 */
export class ContextClock {
  constructor(
    private readonly context: BrowserContext,
    private readonly options: ExtensionClockOptions,
  ) {}

  /**
   * Configures page clocks before the extension is loaded.
   */
  async install(time: number) {
    if (!this.options.withTimers) {
      await this.context.clock.setFixedTime(time);
      return;
    }
    await this.context.clock.install({ time });
    if (this.options.paused) await this.pause(time);
  }

  /**
   * Pauses at the supplied initial time or the current date sampled from a context page.
   */
  async pause(time?: number) {
    const pausedTime = time ?? (await this.readTime());
    // Freeze the date before pausing so transport latency cannot put the target time in the past.
    await this.context.clock.setFixedTime(pausedTime);
    await this.context.clock.pauseAt(pausedTime);
    await this.context.clock.setSystemTime(pausedTime);
  }

  /**
   * Resumes automatic advancement without restoring native timers.
   */
  async resume() {
    await this.context.clock.resume();
  }

  /**
   * Advances mocked timers according to the selected policy.
   */
  async tick(milliseconds: number, timers: 'all' | 'once') {
    if (timers === 'once') await this.context.clock.fastForward(milliseconds);
    else await this.context.clock.runFor(milliseconds);
  }

  /**
   * Advances only the fixed date, leaving native timers running on real time.
   */
  async tickNoTimers(milliseconds: number) {
    const time = await this.readTime();
    const newTime = time + milliseconds;
    validateClockTime(newTime);
    await this.context.clock.setFixedTime(newTime);
  }

  /**
   * Sets the date while preserving whether it is fixed or advancing automatically.
   */
  async setTime(milliseconds: number) {
    if (this.options.withTimers) await this.context.clock.setSystemTime(milliseconds);
    else await this.context.clock.setFixedTime(milliseconds);
  }

  /**
   * Reads the current page date, including when the context has no open pages.
   */
  async readTime() {
    const existingPage = this.context.pages()[0];
    // Playwright exposes no clock time getter; a page reads its fake time without tracking it ourselves.
    const page = existingPage ?? (await this.context.newPage());
    try {
      return await page.evaluate(() => Date.now());
    } finally {
      if (!existingPage) await page.close();
    }
  }
}
