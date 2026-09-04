/**
 * Provides small assertion utilities shared by the extension test harness.
 */

/**
 * Throws an error with the provided message when the condition is truthy.
 */
export function throwIf(condition: unknown, message: string): void {
  if (condition) {
    throw new Error(message);
  }
}
