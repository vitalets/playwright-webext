/**
 * Translates clock advancement into page date changes for alarm-only mocking.
 * This keeps page timers native; Playwright's full clock would replace them.
 * Alarms use the worker's injected clock in both modes.
 */

import type { BrowserContext } from '@playwright/test';

/**
 * Adapts page clock operations while leaving JavaScript timers native.
 */
export class ContextClockDateOnly {
  private time = 0;
  private sampledAt = 0;
  private paused: boolean;

  constructor(
    private readonly context: BrowserContext,
    options: { paused: boolean },
  ) {
    this.paused = options.paused;
  }

  async install(time: number) {
    await this.setSystemTime(time);
  }

  setFixedTime() {
    throw new Error(
      'setFixedTime() is unavailable when extensionClock.alarms is enabled. Use paused: true or setSystemTime().',
    );
  }

  async setSystemTime(time: number) {
    this.time = time;
    this.sampledAt = performance.now();
    if (this.paused) await this.context.clock.setFixedTime(time);
    else await this.context.clock.setSystemTime(time);
  }

  async pauseAt(time: number) {
    if (time < this.now()) throw new Error('Cannot pauseAt a time in the past.');
    this.paused = true;
    await this.setSystemTime(time);
  }

  async resume() {
    const time = this.now();
    this.paused = false;
    await this.setSystemTime(time);
  }

  async fastForward(milliseconds: number) {
    await this.advance(milliseconds);
  }

  async runFor(milliseconds: number) {
    await this.advance(milliseconds);
  }

  private async advance(milliseconds: number) {
    await this.setSystemTime(this.now() + milliseconds);
  }

  private now() {
    return this.time + (this.paused ? 0 : performance.now() - this.sampledAt);
  }
}
