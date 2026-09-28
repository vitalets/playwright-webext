/**
 * Validates conditions with descriptive errors.
 */

/**
 * Throws an error with the provided message when the condition is truthy.
 */
export function throwIf(condition: unknown, message: string) {
  if (condition) {
    throw new Error(message);
  }
}
