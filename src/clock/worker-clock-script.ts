/**
 * Creates the script that installs fake time before service worker code runs.
 */

import type { ExtensionClockOptionsResolved } from './options.js';

/**
 * Builds worker initialization code without changing the browser context.
 */
export async function getWorkerClockScript(options: ExtensionClockOptionsResolved) {
  const { default: source } = await import('./generated/fake-timers.js');
  return `if (typeof document === 'undefined') {
    (() => {
      ${source}
      globalThis.__webextClock = __sinonFakeTimers.withGlobal(globalThis).install(
        ${JSON.stringify(buildSinonOptions(options))}
      );
    })();
  }`;
}

function buildSinonOptions(options: ExtensionClockOptionsResolved) {
  return {
    now: options.time,
    shouldAdvanceTime: options.withTimers && !options.paused,
    toFake: options.withTimers
      ? ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance']
      : ['Date'],
  };
}
