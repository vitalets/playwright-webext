/**
 * Filters undefined properties from option objects.
 */

/**
 * Copies an object's enumerable string-keyed properties, omitting values that are undefined.
 */
export function removeUndefined<T extends object>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}
