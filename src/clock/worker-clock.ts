/**
 * Manipulates the Sinon clock installed in the current extension service worker.
 * An absent worker is supported for extensions that only have pages.
 */

import type { Worker } from '@playwright/test';
import { validateClockTime } from './helpers.js';

declare const __webextClock: {
  now: number;
  jump(milliseconds: number): number;
  tickAsync(milliseconds: number): Promise<unknown>;
  setSystemTime(time: number): void;
  uninstall(): void;
  setTickMode(mode: { mode: 'manual' | 'interval' }): void;
};

/**
 * Resolves the current worker for each operation so clock controls survive reloads and upgrades.
 */
export class WorkerClock {
  constructor(private readonly getWorker: () => Worker | undefined) {}

  /**
   * Stops automatic advancement without changing the worker's current fake date.
   */
  pause() {
    return this.getWorker()?.evaluate(() => __webextClock.setTickMode({ mode: 'manual' }));
  }

  /**
   * Resumes automatic advancement without restoring native timers.
   */
  resume() {
    return this.getWorker()?.evaluate(() => __webextClock.setTickMode({ mode: 'interval' }));
  }

  /**
   * Advances fake time and executes due timers according to the selected policy.
   */
  tick(milliseconds: number, timers: 'all' | 'once') {
    return this.getWorker()?.evaluate(
      async ({ milliseconds, timers }) => {
        if (timers === 'once') __webextClock.jump(milliseconds);
        else await __webextClock.tickAsync(milliseconds);
      },
      { milliseconds, timers },
    );
  }

  /**
   * Advances only the fixed date, leaving native timers running on real time.
   */
  async tickNoTimers(milliseconds: number) {
    const time = await this.readTime();
    if (time === undefined) return;
    const newTime = time + milliseconds;
    validateClockTime(newTime);
    await this.setTime(newTime);
  }

  /**
   * Sets the worker date without firing timers or changing their remaining delays.
   */
  setTime(milliseconds: number) {
    return this.getWorker()?.evaluate((ms) => __webextClock.setSystemTime(ms), milliseconds);
  }

  /**
   * Reads the worker clock's current date, including after worker reloads.
   */
  readTime() {
    return this.getWorker()?.evaluate(() => __webextClock.now);
  }

  /**
   * Restores native worker timers before lifecycle operations that schedule their own callbacks.
   */
  uninstall() {
    return this.getWorker()?.evaluate(() => {
      if (typeof __webextClock !== 'undefined') __webextClock.uninstall();
    });
  }
}
