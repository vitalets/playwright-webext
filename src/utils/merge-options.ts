/**
 * Combines defaults with explicitly supplied option values.
 */

import { removeUndefined } from './remove-undefined.js';

/**
 * Shallowly merges options over defaults, preserving defaults for undefined values.
 */
export function mergeOptions<Defaults extends object, Options extends Partial<Defaults>>(
  defaults: Defaults,
  options: Options,
) {
  return { ...defaults, ...removeUndefined(options) } as Defaults & Omit<Options, keyof Defaults>;
}
