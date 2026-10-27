/**
 * Controls fixed dates or full fake clocks in pages and the current service worker.
 */

import type { BrowserContext, Worker } from '@playwright/test';
import type { ExtensionClockOptions } from '../options.js';
import { parseClockTime, parseClockDuration } from './helpers.js';
import { pauseContextClock } from './context.js';

declare const __webextClock: {
  tickAsync(milliseconds: number): Promise<unknown>;
  setSystemTime(time: number): void;
  uninstall(): void;
  setTickMode(mode: { mode: 'manual' | 'interval' }): void;
};

/**
 * Controls fake time in pages and the service worker when extensionClock is configured.
 * The parent supplies a worker callback so each operation uses the current worker after reloads
 * or upgrades, while the parent retains responsibility for lookup and availability checks.
 */
export class ExtensionClock {
  constructor(
    private readonly context: BrowserContext,
    private readonly getWorker: () => Worker | undefined,
    private readonly options: ExtensionClockOptions,
  ) {}

  /**
   * Stops automatic advancement in pages and the worker at their current fake dates.
   */
  async pause() {
    this.requireFullControl('pause');
    const worker = this.getWorker();
    await Promise.all([
      pauseContextClock(this.context),
      worker?.evaluate(() => __webextClock.setTickMode({ mode: 'manual' })),
    ]);
  }

  /**
   * Resumes automatic advancement in pages and the worker without restoring native timers.
   */
  async resume() {
    this.requireFullControl('resume');
    const worker = this.getWorker();
    await Promise.all([
      this.context.clock.resume(),
      worker?.evaluate(() => __webextClock.setTickMode({ mode: 'interval' })),
    ]);
  }

  /**
   * Advances time and runs due timers, allowing promise callbacks between timer callbacks.
   * Each execution context has its own queue; cross-context callback ordering is not guaranteed.
   */
  async runFor(ticks: number | string) {
    this.requireFullControl('runFor');
    const milliseconds = parseClockDuration(ticks);
    const worker = this.getWorker();
    await Promise.all([
      this.context.clock.runFor(milliseconds),
      worker?.evaluate(async (ms) => {
        await __webextClock.tickAsync(ms);
      }, milliseconds),
    ]);
  }

  /**
   * Changes the fixed date while timers keep running. Requires fixed-time mode.
   */
  async setFixedTime(time: number | string | Date) {
    if (this.options.mode === 'full-control') {
      throw new Error(
        "setFixedTime requires mode: 'fixed-time'. Use setSystemTime in full-control mode.",
      );
    }
    const milliseconds = parseClockTime(time);
    const worker = this.getWorker();
    await Promise.all([
      this.context.clock.setFixedTime(milliseconds),
      worker?.evaluate((ms) => __webextClock.setSystemTime(ms), milliseconds),
    ]);
  }

  /**
   * Changes the wall-clock date without firing timers or changing their remaining delays.
   */
  async setSystemTime(time: number | string | Date) {
    this.requireFullControl('setSystemTime');
    const milliseconds = parseClockTime(time);
    const worker = this.getWorker();
    await Promise.all([
      this.context.clock.setSystemTime(milliseconds),
      worker?.evaluate((ms) => __webextClock.setSystemTime(ms), milliseconds),
    ]);
  }

  private requireFullControl(method: string) {
    if (this.options.mode !== 'full-control') {
      throw new Error(
        `${method} requires extensionClock.mode: 'full-control'. Use setFixedTime for fixed dates.`,
      );
    }
  }
}

/**
 * Restores native worker timers before lifecycle operations that schedule their own callbacks.
 */
export async function uninstallClock(worker: Worker) {
  await worker.evaluate(() => {
    if (typeof __webextClock !== 'undefined') __webextClock.uninstall();
  });
}
