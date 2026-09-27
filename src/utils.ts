/**
 * Provides shared helpers for options, assertions, and cleanup.
 */

/**
 * Copies an object's enumerable string-keyed properties, omitting values that are undefined.
 */
export function removeUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

/**
 * Throws an error with the provided message when the condition is truthy.
 */
export function throwIf(condition: unknown, message: string): void {
  if (condition) {
    throw new Error(message);
  }
}

/**
 * Runs every function in order, then throws the first error, if any.
 */
// eslint-disable-next-line visual/complexity
export async function runAll(functions: readonly (() => unknown)[]): Promise<void> {
  let firstError: Error | undefined;
  for (const fn of functions) {
    try {
      await fn();
    } catch (error) {
      firstError ??= error instanceof Error ? error : new Error(String(error), { cause: error });
    }
  }
  if (firstError) throw firstError;
}
