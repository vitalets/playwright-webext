/**
 * Controls page and frame clocks through Playwright's public browser context API.
 */

import type { BrowserContext } from '@playwright/test';
import type { ExtensionClockOptions } from './options.js';

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
    if (!this.options.timers) {
      await this.context.clock.setFixedTime(time);
      return;
    }
    await this.context.clock.install({ time });
    if (this.options.paused) {
      // Freeze the date before pausing so transport latency cannot put the target time in the past.
      await this.context.clock.setFixedTime(time);
      await this.pauseAt(time);
      await this.context.clock.setSystemTime(time);
    }
  }

  /**
   * Advances page clocks to the target date and pauses them.
   */
  async pauseAt(time: number) {
    await this.context.clock.pauseAt(time);
  }

  /**
   * Resumes automatic advancement without restoring native timers.
   */
  async resume() {
    await this.context.clock.resume();
  }

  /**
   * Advances time, firing each due timer at most once.
   */
  async fastForward(milliseconds: number) {
    await this.context.clock.fastForward(milliseconds);
  }

  /**
   * Advances time through all scheduled callbacks.
   */
  async runFor(milliseconds: number) {
    await this.context.clock.runFor(milliseconds);
  }

  /**
   * Fixes the date without changing timer scheduling.
   */
  async setFixedTime(milliseconds: number) {
    await this.context.clock.setFixedTime(milliseconds);
  }

  /**
   * Changes the date without firing timers or changing their remaining delays.
   */
  async setSystemTime(milliseconds: number) {
    await this.context.clock.setSystemTime(milliseconds);
  }
}
