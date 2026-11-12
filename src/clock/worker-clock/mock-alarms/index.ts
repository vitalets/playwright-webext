/**
 * Emulates worker alarms against the injected clock, isolated from Chrome's native scheduler.
 */

import { validateAlarm, resolveAlarmDeadline } from './helpers.js';

type AlarmClock = {
  now(): number;
};

type AlarmTimers = {
  setTimeout(callback: () => void, delay: number): number;
  clearTimeout(id: number): void;
};

type AlarmRecord = {
  alarm: chrome.alarms.Alarm;
  timer?: number;
};

/**
 * Owns alarm state and listener delivery for one live service worker.
 */
export class MockAlarms {
  private readonly records = new Map<string, AlarmRecord>();
  private readonly listeners = new Set<(alarm: chrome.alarms.Alarm) => void>();
  private readonly original = chrome.alarms;
  private onceRecords?: Set<AlarmRecord>;
  private deliveries = 0;
  private advancing = false;
  private immediateCreations = 0;
  private delivering = false;

  constructor(
    private readonly clock: AlarmClock,
    private readonly timers: AlarmTimers,
  ) {
    chrome.alarms = this.createApi() as unknown as typeof chrome.alarms;
  }

  /**
   * Limits once-only advancement to the alarm registrations present at its start.
   */
  async advance(operation: () => Promise<unknown>, once: boolean) {
    this.deliveries = 0;
    this.immediateCreations = 0;
    this.advancing = true;
    if (once) this.onceRecords = new Set(this.records.values());
    try {
      await operation();
    } finally {
      this.onceRecords = undefined;
      this.advancing = false;
      this.reschedule();
    }
  }

  /**
   * Recomputes elapsed delays without moving the alarm's absolute deadline.
   */
  reschedule() {
    for (const record of this.records.values()) this.schedule(record);
  }

  /**
   * Cancels internal callbacks and restores the native API during worker cleanup.
   */
  uninstall() {
    for (const name of this.records.keys()) this.clear(name);
    this.listeners.clear();
    chrome.alarms = this.original;
  }

  private createApi() {
    return {
      create: this.create.bind(this),
      get: this.get.bind(this),
      getAll: (callback?: (alarms: chrome.alarms.Alarm[]) => void) =>
        reply(
          Array.from(this.records.values(), ({ alarm }) => ({ ...alarm })),
          callback,
        ),
      clear: this.clearApi.bind(this),
      clearAll: (callback?: (cleared: boolean) => void) => {
        for (const name of this.records.keys()) this.clear(name);
        return reply(true, callback);
      },
      onAlarm: this.createEvent(),
    };
  }

  private createEvent() {
    return {
      addListener: (listener: (alarm: chrome.alarms.Alarm) => void) => {
        this.listeners.add(listener);
      },
      removeListener: (listener: (alarm: chrome.alarms.Alarm) => void) => {
        this.listeners.delete(listener);
      },
      hasListener: (listener: (alarm: chrome.alarms.Alarm) => void) => this.listeners.has(listener),
      hasListeners: () => this.listeners.size > 0,
    };
  }

  private create(
    name?: string | chrome.alarms.AlarmCreateInfo,
    infoOrCallback?: chrome.alarms.AlarmCreateInfo | (() => void),
    callback?: () => void,
  ) {
    const info =
      typeof name === 'object' ? name : (infoOrCallback as chrome.alarms.AlarmCreateInfo);
    const alarm = makeAlarm(
      typeof name === 'string' ? name : (info?.name ?? ''),
      info,
      this.clock.now(),
    );
    this.checkImmediateChain(alarm);
    this.clear(alarm.name);
    const record = { alarm };
    this.records.set(alarm.name, record);
    this.schedule(record);
    return reply(undefined, typeof infoOrCallback === 'function' ? infoOrCallback : callback);
  }

  private get(
    name?: string | ((alarm?: chrome.alarms.Alarm) => void),
    callback?: (alarm?: chrome.alarms.Alarm) => void,
  ) {
    const record = this.records.get(typeof name === 'string' ? name : '');
    return reply(
      record ? { ...record.alarm } : undefined,
      typeof name === 'function' ? name : callback,
    );
  }

  private clearApi(
    name?: string | ((cleared: boolean) => void),
    callback?: (cleared: boolean) => void,
  ) {
    return reply(
      this.clear(typeof name === 'string' ? name : ''),
      typeof name === 'function' ? name : callback,
    );
  }

  private checkImmediateChain(alarm: chrome.alarms.Alarm) {
    const immediate = this.delivering && alarm.scheduledTime <= this.clock.now();
    this.immediateCreations = immediate ? this.immediateCreations + 1 : 0;
    if (this.immediateCreations > 1000) {
      throw new AlarmLoopError(
        'Alarm emulation stopped an endless chain of immediately due alarms.',
      );
    }
  }

  private clear(name: string) {
    const record = this.records.get(name);
    if (!record) return false;
    if (record.timer !== undefined) this.timers.clearTimeout(record.timer);
    this.records.delete(name);
    return true;
  }

  private schedule(record: AlarmRecord) {
    if (record.timer !== undefined) this.timers.clearTimeout(record.timer);
    record.timer = undefined;
    if (this.onceRecords && !this.onceRecords.has(record)) return;
    // The upstream timer engine treats delays above the signed 32-bit limit as 1ms.
    const delay = Math.min(
      2_147_483_647,
      Math.max(0, record.alarm.scheduledTime - this.clock.now()),
    );
    record.timer = this.timers.setTimeout(() => this.deliver(record), delay);
  }

  private deliver(record: AlarmRecord) {
    if (this.records.get(record.alarm.name) !== record) return;
    const now = this.clock.now();
    if (record.alarm.scheduledTime > now) {
      this.schedule(record);
      return;
    }
    if (this.advancing && ++this.deliveries > 10_000) {
      throw new Error(
        'Alarm emulation exceeded 10000 deliveries in one advancement; check for an endless alarm chain.',
      );
    }
    const event = { ...record.alarm };
    this.consume(record, now);
    this.dispatch(event);
  }

  private consume(record: AlarmRecord, now: number) {
    this.onceRecords?.delete(record);
    const period = record.alarm.periodInMinutes;
    if (period === undefined) {
      this.clear(record.alarm.name);
      return;
    }
    const milliseconds = period * 60_000;
    record.alarm.scheduledTime +=
      (Math.floor((now - record.alarm.scheduledTime) / milliseconds) + 1) * milliseconds;
    this.schedule(record);
  }

  private dispatch(event: chrome.alarms.Alarm) {
    this.delivering = true;
    try {
      for (const listener of Array.from(this.listeners)) this.callListener(listener, event);
    } finally {
      this.delivering = false;
    }
  }

  private callListener(listener: (alarm: chrome.alarms.Alarm) => void, event: chrome.alarms.Alarm) {
    try {
      listener({ ...event });
    } catch (error) {
      if (error instanceof AlarmLoopError) throw error;
      // Like browser events, an application listener failure does not suppress other listeners.
      console.error(error);
    }
  }
}

function makeAlarm(name: string, info: chrome.alarms.AlarmCreateInfo, now: number) {
  validateAlarm(info);
  const scheduledTime = resolveAlarmDeadline(info, now);
  const alarm: chrome.alarms.Alarm = {
    name,
    scheduledTime,
    persistAcrossSessions: info.persistAcrossSessions ?? true,
  };
  if (info.periodInMinutes !== undefined) alarm.periodInMinutes = info.periodInMinutes;
  return alarm;
}

class AlarmLoopError extends Error {}

function reply<T>(value: T, callback?: (value: T) => void) {
  if (!callback) return Promise.resolve(value);
  void Promise.resolve().then(() => callback(value));
}
