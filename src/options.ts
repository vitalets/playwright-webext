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
  extensionInitScript?: ExtensionInitScript;
};

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
