/**
 * Manipulates the Playwright clock installed in the current extension service worker.
 * An absent worker is supported for extensions that only have pages.
 */

import type { Worker } from '@playwright/test';

import type { installWorkerClock } from './playwright-wrapper.js';

declare const __pwClock: ReturnType<typeof installWorkerClock>;

/**
 * Resolves the current worker for each operation so clock controls survive reloads and upgrades.
 */
export class WorkerClock {
  constructor(private readonly getWorker: () => Worker | undefined) {}

  /**
   * Advances to the target date and pauses the worker clock.
   */
  pauseAt(milliseconds: number) {
    return this.getWorker()?.evaluate((ms) => __pwClock.pauseAt(ms), milliseconds);
  }

  /**
   * Resumes automatic advancement without restoring native timers.
   */
  resume() {
    return this.getWorker()?.evaluate(() => __pwClock.resume());
  }

  /**
   * Advances time, firing each due timer at most once.
   */
  fastForward(milliseconds: number) {
    return this.getWorker()?.evaluate((ms) => __pwClock.fastForward(ms), milliseconds);
  }

  /**
   * Advances time through all scheduled callbacks.
   */
  runFor(milliseconds: number) {
    return this.getWorker()?.evaluate((ms) => __pwClock.runFor(ms), milliseconds);
  }

  /**
   * Fixes the worker date without changing timer scheduling.
   */
  setFixedTime(milliseconds: number) {
    return this.getWorker()?.evaluate((ms) => __pwClock.setFixedTime(ms), milliseconds);
  }

  /**
   * Changes the worker date without firing timers or changing their remaining delays.
   */
  setSystemTime(milliseconds: number) {
    return this.getWorker()?.evaluate((ms) => __pwClock.setSystemTime(ms), milliseconds);
  }

  /**
   * Restores native worker timers before lifecycle operations that schedule their own callbacks.
   */
  uninstall() {
    return this.getWorker()?.evaluate(() => {
      if (typeof __pwClock !== 'undefined') return __pwClock.uninstall();
    });
  }
}
