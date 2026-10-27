/**
 * Normalizes clock arguments before either execution context is modified.
 */

/**
 * Accepts the date forms used by Playwright's clock.
 */
export function parseClockTime(time: number | string | Date) {
  const milliseconds = new Date(time).getTime();
  if (!Number.isFinite(milliseconds)) throw new Error(`Invalid clock time: ${String(time)}`);
  return milliseconds;
}

/**
 * Accepts milliseconds or Playwright's seconds, mm:ss, and hh:mm:ss duration strings.
 */
export function parseClockDuration(ticks: number | string) {
  if (typeof ticks === 'number') {
    if (!Number.isFinite(ticks) || ticks < 0)
      throw new Error('Clock duration must be finite and non-negative.');
    return Math.ceil(ticks);
  }
  if (!/^([0-5]\d:){0,2}[0-5]?\d$/.test(ticks)) throw new Error(`Invalid clock duration: ${ticks}`);
  const parts = ticks.split(':').map(Number);
  return parts.reduce((seconds, part) => seconds * 60 + part, 0) * 1000;
}
