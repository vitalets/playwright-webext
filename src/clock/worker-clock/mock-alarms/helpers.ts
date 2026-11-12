/**
 * Validates alarm creation inputs and their resolved deadlines.
 */

/**
 * Rejects missing or incompatible timing fields and invalid alarm durations.
 */
export function validateAlarm(info: chrome.alarms.AlarmCreateInfo) {
  if (
    !info ||
    Object.keys(info).every((key) => !['when', 'delayInMinutes', 'periodInMinutes'].includes(key))
  ) {
    throw new Error('Alarm creation requires when, delayInMinutes, or periodInMinutes.');
  }
  if (info.when !== undefined && info.delayInMinutes !== undefined) {
    throw new Error('Alarm creation cannot combine when and delayInMinutes.');
  }
  validateMinutes(info.delayInMinutes, 'delayInMinutes', 0);
  validateMinutes(info.periodInMinutes, 'periodInMinutes', Number.MIN_VALUE);
}

/**
 * Converts alarm timing inputs to a finite absolute deadline.
 */
export function resolveAlarmDeadline(info: chrome.alarms.AlarmCreateInfo, now: number) {
  const time = info.when ?? now + (info.delayInMinutes ?? info.periodInMinutes) * 60_000;
  if (!Number.isFinite(time)) throw new Error('Alarm deadline must be finite.');
  return time;
}

function validateMinutes(value: number | undefined, field: string, minimum: number) {
  if (value === undefined) return;
  if (!Number.isFinite(value) || value < minimum) {
    throw new Error(
      `Alarm ${field} is invalid: expected a finite duration of at least ${minimum} minutes.`,
    );
  }
}
