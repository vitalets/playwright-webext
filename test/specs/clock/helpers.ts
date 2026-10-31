/**
 * Helpers for inspecting timer events in clock tests.
 */

/**
 * Reads timer events recorded in the current worker or page.
 */
export function readTimerEvents() {
  return (globalThis as typeof globalThis & { clockEvents: number[] }).clockEvents;
}
