/**
 * Controls fixed dates or full fake clocks in pages and the current service worker.
 */

import type { BrowserContext, Worker } from '@playwright/test';
import type { ExtensionClockOptions } from './options.js';
import { resolveClockTime } from './options.js';
import { parseClockDuration } from './helpers.js';
import { ContextClock } from './context-clock.js';
import { WorkerClock } from './worker-clock.js';

/**
 * Controls fake time in pages and the service worker when extensionClock is configured.
 * The parent supplies a worker callback so each operation uses the current worker after reloads
 * or upgrades, while the parent retains responsibility for lookup and availability checks.
 */
export class ExtensionClock {
  protected readonly contextClock: ContextClock;
  protected readonly workerClock: WorkerClock;

  constructor(
    private readonly context: BrowserContext,
    getWorker: () => Worker | undefined,
    private readonly options: ExtensionClockOptions,
  ) {
    this.contextClock = new ContextClock(context, options);
    this.workerClock = new WorkerClock(getWorker);
  }

  /**
   * Stops automatic advancement in pages and the worker at their current fake dates.
   */
  async pause() {
    this.requireTimersOption('pause');
    await Promise.all([this.workerClock.pause(), this.contextClock.pause()]);
  }

  /**
   * Resumes automatic advancement in pages and the worker without restoring native timers.
   */
  async resume() {
    this.requireTimersOption('resume');
    await Promise.all([this.workerClock.resume(), this.contextClock.resume()]);
  }

  /**
   * Advances each clock by a duration. With timers enabled, fires each due timer at most once
   * by default, or all due occurrences with timers: 'all'. Otherwise only the fixed date changes.
   * Preserves the running or paused state; cross-context callback ordering is not guaranteed.
   */
  async tick(duration: number | string, options: { timers?: 'all' | 'once' } = {}) {
    const milliseconds = parseClockDuration(duration);
    const timers = parseTimersOption(options.timers);
    if (this.options.timers) {
      await this.tickWithTimers(milliseconds, timers);
    } else {
      await this.tickNoTimers(milliseconds);
    }
  }

  /**
   * Sets the date without firing timers or changing their remaining delays.
   * Preserves whether dates are fixed, paused, or advancing automatically.
   */
  async setTime(time: number | string | Date) {
    const milliseconds = await resolveClockTime(this.context, time);
    await Promise.all([
      this.workerClock.setTime(milliseconds),
      this.contextClock.setTime(milliseconds),
    ]);
  }

  private async tickWithTimers(milliseconds: number, timers: 'all' | 'once') {
    await Promise.all([
      this.workerClock.tick(milliseconds, timers),
      this.contextClock.tick(milliseconds, timers),
    ]);
  }

  private async tickNoTimers(milliseconds: number) {
    await Promise.all([
      this.workerClock.tickNoTimers(milliseconds),
      this.contextClock.tickNoTimers(milliseconds),
    ]);
  }

  private requireTimersOption(method: string) {
    if (!this.options.timers) throw new Error(`${method} requires extensionClock.timers: true.`);
  }
}

/**
 * Exposes the underlying clocks for internal installation and lifecycle operations.
 */
export class ExtensionClockInternal extends ExtensionClock {
  declare readonly contextClock: ContextClock;
  declare readonly workerClock: WorkerClock;
}

function parseTimersOption(timers: 'all' | 'once' | undefined) {
  const value = timers ?? 'once';
  if (value !== 'all' && value !== 'once') throw new Error("Clock timers must be 'all' or 'once'.");
  return value;
}
