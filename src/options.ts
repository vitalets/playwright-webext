/**
 * Defines extension fixture configuration and default launch options.
 */

/**
 * Configuration accepted by the extension test fixtures.
 */
export type WebextOptions = WebextTestOptions & WebextWorkerOptions;

/**
 * Options available to both test-scoped and worker-scoped fixtures.
 */
export type WebextWorkerOptions = {
  extensionPath: string;
};

/**
 * Options that can vary between tests.
 */
export type WebextTestOptions = {
  extensionAutoInstall?: boolean;
  extensionInitScript?: ExtensionInitScript | ExtensionInitScript[];
  extensionClock?: ExtensionClockOptions;
};

/**
 * Fixes the date by default, or enables full timer control before extension code runs.
 */
export type ExtensionClockOptions = {
  /**
   * Fixed or starting date as Unix milliseconds, a date string, or a Date.
   */
  time: number | string | Date;
} & (
  | {
      /**
       * Keeps dates fixed and timers running. This is the default mode.
       */
      mode?: 'fixed-time';
      paused?: never;
      workerFake?: never;
    }
  | {
      /**
       * Enables full timer control in pages and the worker.
       */
      mode: 'full-control';
      /**
       * Starts fake time paused. Defaults to false.
       */
      paused?: boolean;
      /**
       * Worker APIs to fake; pages are unaffected. Defaults to Date, timeout/interval APIs, and performance.
       * An empty array selects all supported APIs. Selected APIs must exist in the browser.
       */
      workerFake?: (
        | 'Date'
        | 'setTimeout'
        | 'clearTimeout'
        | 'setInterval'
        | 'clearInterval'
        | 'performance'
        | 'queueMicrotask'
        | 'Intl'
        | 'Temporal'
      )[];
    }
);

/**
 * JavaScript to run before extension code in background workers and extension pages.
 * Pass a file path as a string or inline source as `{ content }`.
 */
export type ExtensionInitScript = string | { content: string };

/**
 * Defaults for optional launch settings.
 */
export const defaults: Required<Pick<WebextTestOptions, 'extensionAutoInstall'>> = {
  extensionAutoInstall: true,
};
