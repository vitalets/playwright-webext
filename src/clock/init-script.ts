/**
 * Creates the script that installs fake time before service worker code runs.
 */

import type { ExtensionClockOptions } from '../options.js';
import { parseClockTime } from './helpers.js';

/**
 * Builds worker initialization code without changing the browser context.
 */
export async function getClockInitScript(options: ExtensionClockOptions) {
  const time = parseClockTime(options.time);
  const { default: source } = await import('./generated/fake-timers.js');
  return `if (typeof document === 'undefined') {
    (() => {
      ${source}
      globalThis.__webextClock = __sinonFakeTimers.withGlobal(globalThis).install(
        ${JSON.stringify(buildSinonOptions(options, time))}
      );
    })();
  }`;
}

function buildSinonOptions(options: ExtensionClockOptions, time: number) {
  return {
    now: time,
    shouldAdvanceTime: options.mode === 'full-control' && !options.paused,
    toFake:
      options.mode === 'full-control'
        ? (options.workerFake ?? [
            'Date',
            'setTimeout',
            'clearTimeout',
            'setInterval',
            'clearInterval',
            'performance',
          ])
        : ['Date'],
  };
}
