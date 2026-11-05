/**
 * Controls fixed dates or full fake clocks in pages and the current service worker.
 */

import type { BrowserContext, Worker } from '@playwright/test';
import type { ExtensionClockOptions } from './options.js';
import { resolveClockTime } from './options.js';
import { parseClockDuration } from './helpers.js';
import { ContextClock } from './context-clock.js';
import { WorkerClock } from './worker-clock/index.js';

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
   * Advances to the target date, firing due timers at most once, then pauses.
   */
  async pauseAt(time: number | string | Date) {
    this.requireTimersOption('pauseAt');
    const milliseconds = await resolveClockTime(this.context, time);
    await Promise.all([
      this.workerClock.pauseAt(milliseconds), // prettier-ignore
      this.contextClock.pauseAt(milliseconds),
    ]);
  }

  /**
   * Resumes automatic advancement without restoring native timers.
   */
  async resume() {
    this.requireTimersOption('resume');
    await Promise.all([
      this.workerClock.resume(), // prettier-ignore
      this.contextClock.resume(),
    ]);
  }

  /**
   * Advances time, firing each due timer at most once.
   */
  async fastForward(duration: number | string) {
    this.requireTimersOption('fastForward');
    const milliseconds = parseClockDuration(duration);
    await Promise.all([
      this.workerClock.fastForward(milliseconds),
      this.contextClock.fastForward(milliseconds),
    ]);
  }

  /**
   * Advances time, executing all due timer callbacks at their scheduled times.
   */
  async runFor(duration: number | string) {
    this.requireTimersOption('runFor');
    const milliseconds = parseClockDuration(duration);
    await Promise.all([
      this.workerClock.runFor(milliseconds),
      this.contextClock.runFor(milliseconds),
    ]);
  }

  /**
   * Fixes the reported date without changing timer scheduling or the paused state.
   */
  async setFixedTime(time: number | string | Date) {
    const milliseconds = await resolveClockTime(this.context, time);
    await Promise.all([
      this.workerClock.setFixedTime(milliseconds),
      this.contextClock.setFixedTime(milliseconds),
    ]);
  }

  /**
   * Changes system time without firing timers, preserving their remaining delays.
   */
  async setSystemTime(time: number | string | Date) {
    const milliseconds = await resolveClockTime(this.context, time);
    await Promise.all([
      this.workerClock.setSystemTime(milliseconds),
      this.contextClock.setSystemTime(milliseconds),
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
