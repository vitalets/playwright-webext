/**
 * Adapts Playwright clock options and cleanup for extension workers.
 * The copied engine owns API emulation and timer scheduling; this wrapper selects and controls it.
 * Node builds the injection script; installWorkerClock and its helpers run in the worker.
 */

import type { ExtensionClockOptionsResolved } from '../options.js';
import { MockAlarms } from './mock-alarms/index.js';

/**
 * Build-time bundle binding, not a second clock implementation.
 * build-clock.ts prepends the copied engine under this name inside the injection closure.
 */
declare const __playwrightClock: {
  install(
    global: typeof globalThis,
    options: { toFake: string[]; browserName: string },
  ): {
    clock: PlaywrightClockController;
    api: {
      setTimeout(callback: () => void, delay: number): number;
      clearTimeout(id: number): void;
    };
  };
};

/**
 * Only the upstream methods this wrapper uses. A direct type import would pull the copied
 * source into our NodeNext type check.
 * Keep this contract in sync with clock.ts when updating upstream.
 */
type PlaywrightClockController = {
  install(time: number): void;
  now(): number;
  setFixedTime(time: number): void;
  setSystemTime(time: number): void;
  pauseAt(time: number): Promise<number>;
  resume(): void;
  fastForward(milliseconds: number): Promise<void>;
  runFor(milliseconds: number): Promise<void>;
  uninstall(): void;
};

/**
 * Builds the worker injection script in Node. The document guard skips extension pages,
 * whose clocks are installed separately through BrowserContext.clock.
 * build-clock.ts generates __webextClockInstaller via esbuild globalName; it exposes
 * installWorkerClock inside the injection closure, not on the worker global.
 */
export async function getWorkerClockScript(options: ExtensionClockOptionsResolved) {
  const { default: source } = await import('./generated/playwright-clock.js');
  return `if (typeof document === 'undefined') {
    (() => {
      ${source}
      globalThis.__pwClock = __webextClockInstaller.installWorkerClock(${JSON.stringify(options)});
    })();
  }`;
}

/**
 * Installs supported worker APIs and exposes controls used by the Node-side adapter.
 * Playwright's default injection also installs DOM timer APIs and resumes immediately;
 * extension workers instead need explicit API selection and optional paused startup.
 */
export function installWorkerClock(options: ExtensionClockOptionsResolved) {
  const restoreDescriptors = captureNativeDescriptors();
  const { clock, api } = installClock(options);
  // Upstream creates the AbortSignal shim even when it is not selected in toFake.
  if (!options.timers) restoreDescriptors();
  // Upstream install() replaces APIs; controller.install() sets their initial date.
  clock.install(options.time);
  if (isFixedDate(options)) clock.setFixedTime(options.time);
  const alarms = options.alarms ? new MockAlarms(clock, api) : undefined;
  if (!options.paused) clock.resume();
  return createControls(clock, restoreDescriptors, alarms);
}

/**
 * Overrides upstream's default API selection for service workers and fixed-date mode.
 * Explicit selection avoids adding animation-frame and idle-callback APIs to workers.
 * Date, Intl and Temporal share fake wall time; upstream skips Temporal when unavailable.
 */
function installClock(options: ExtensionClockOptionsResolved) {
  const toFake = options.timers
    ? [
        'Date',
        'Intl',
        'Temporal',
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'performance',
        'AbortSignal',
      ]
    : ['Date', 'Intl', 'Temporal'];
  // Selects Chromium's AbortSignal timeout error text, including for Edge.
  return __playwrightClock.install(globalThis, { toFake, browserName: 'chromium' });
}

/**
 * Exposes our worker controls as __pwClock. Unlike Playwright's page global, these controls
 * sit directly on the object rather than under .controller.
 * Timer execution remains delegated to the copied engine.
 */
function createControls(
  clock: PlaywrightClockController,
  restoreDescriptors: () => void,
  alarms?: MockAlarms,
) {
  const advance = (operation: () => Promise<unknown>, once: boolean) =>
    alarms ? alarms.advance(operation, once) : operation().then(() => {});
  return {
    pauseAt: async (ms: number) => {
      await advance(() => clock.pauseAt(ms), true);
    },
    resume: () => clock.resume(),
    fastForward: (ms: number) => advance(() => clock.fastForward(ms), true),
    runFor: (ms: number) => advance(() => clock.runFor(ms), false),
    setFixedTime: (ms: number) => clock.setFixedTime(ms),
    setSystemTime: (ms: number) => {
      clock.setSystemTime(ms);
      alarms?.reschedule();
    },
    uninstall: async () => {
      // Upstream uninstall() restores globals but does not stop its real-time ticker.
      alarms?.uninstall();
      await pauseClock(clock);
      clock.uninstall();
      restoreDescriptors();
    },
  };
}

/**
 * Implements pause-at-current-time; upstream exposes only pauseAt(targetTime).
 * Freeze the sampled date so real-time advancement cannot make that target stale.
 */
async function pauseClock(clock: PlaywrightClockController) {
  const time = clock.now();
  clock.setFixedTime(time);
  await clock.pauseAt(time);
  // Clear the temporary fixed-time flag so a later resume() advances dates again.
  clock.setSystemTime(time);
}

/**
 * Saves property descriptors that upstream uninstall() does not restore.
 * The AbortSignal shim mutates the original constructor; performance mocking patches
 * Event.prototype.timeStamp. Restoring globals alone cannot undo either mutation.
 */
function captureNativeDescriptors() {
  const abortTimeout = Object.getOwnPropertyDescriptor(AbortSignal, 'timeout')!;
  const eventTimeStamp = Object.getOwnPropertyDescriptor(Event.prototype, 'timeStamp')!;
  return () => {
    Object.defineProperty(AbortSignal, 'timeout', abortTimeout);
    Object.defineProperty(Event.prototype, 'timeStamp', eventTimeStamp);
  };
}

function isFixedDate(options: ExtensionClockOptionsResolved) {
  return !options.timers && !options.alarms;
}
