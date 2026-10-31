/**
 * Controls fixed dates or full fake clocks in pages and the current service worker.
 */

import type { BrowserContext, Worker } from '@playwright/test';
import type { ExtensionClockOptions } from '../options.js';
import { parseClockTime, parseClockDuration } from './helpers.js';
import { ContextClock } from './context-clock.js';
import { WorkerClock } from './worker-clock.js';

/**
 * Controls fake time in pages and the service worker when extensionClock is configured.
 * The parent supplies a worker callback so each operation uses the current worker after reloads
 * or upgrades, while the parent retains responsibility for lookup and availability checks.
 */
export class ExtensionClock {
  private readonly contextClock: ContextClock;
  private readonly workerClock: WorkerClock;

  constructor(
    context: BrowserContext,
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
    this.requireWithTimers('pause');
    await Promise.all([this.workerClock.pause(), this.contextClock.pause()]);
  }

  /**
   * Resumes automatic advancement in pages and the worker without restoring native timers.
   */
  async resume() {
    this.requireWithTimers('resume');
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
    if (this.options.withTimers) {
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
    const milliseconds = parseClockTime(time);
    await Promise.all([
      this.workerClock.setTime(milliseconds),
      this.contextClock.setTime(milliseconds),
    ]);
  }

  /**
   * Initializes page clocks before extension code runs. Worker clocks are installed by their script.
   * @internal
   */
  async installToContext() {
    await this.contextClock.install();
  }

  /**
   * Restores native worker timers before reload or uninstallation schedules lifecycle callbacks.
   * @internal
   */
  async uninstallFromWorker() {
    await this.workerClock.uninstall();
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

  private requireWithTimers(method: string) {
    if (!this.options.withTimers)
      throw new Error(`${method} requires extensionClock.withTimers: true.`);
  }
}

function parseTimersOption(timers: 'all' | 'once' | undefined) {
  const value = timers ?? 'once';
  if (value !== 'all' && value !== 'once') throw new Error("Clock timers must be 'all' or 'once'.");
  return value;
}
