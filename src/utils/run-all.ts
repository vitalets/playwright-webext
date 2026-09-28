/**
 * Completes cleanup steps even when individual steps fail.
 */

/**
 * Runs every function in order, then throws the first error, if any.
 */
// eslint-disable-next-line visual/complexity
export async function runAll(functions: readonly (() => unknown)[]) {
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
