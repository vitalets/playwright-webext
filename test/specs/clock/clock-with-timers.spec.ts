import { setTimeout as delay } from 'node:timers/promises';
import { expect } from '@playwright/test';
import { test } from '../../../src/index.js';
import { readTimerEvents } from './helpers.js';

test.describe('running clock', () => {
  test.use({
    extensionClock: {
      time: '2026-01-01T00:00:00Z',
      timers: true,
    },
  });

  test('pauseAt and resume control automatic time advancement', async ({ extension }) => {
    const popup = await extension.openPopup();
    // Time advances automatically before pausing.
    const workerTime = await extension.evaluate(() => Date.now());
    const pageTime = await popup.evaluate(() => Date.now());
    await expect.poll(() => extension.evaluate(() => Date.now())).toBeGreaterThan(workerTime);
    await expect.poll(() => popup.evaluate(() => Date.now())).toBeGreaterThan(pageTime);

    // Jump to tomorrow, then verify both clocks stay paused as real time passes.
    await extension.clock.pauseAt('2026-01-02T00:00:00Z');
    const pausedWorkerTime = await extension.evaluate(() => Date.now());
    const pausedPageTime = await popup.evaluate(() => Date.now());
    // Wait in Node so this check is independent of both fake clocks.
    await delay(100);
    expect(await extension.evaluate(() => Date.now())).toBe(pausedWorkerTime);
    expect(await popup.evaluate(() => Date.now())).toBe(pausedPageTime);

    // Resuming lets both dates advance again without another manual jump.
    await extension.clock.resume();
    await expect.poll(() => extension.evaluate(() => Date.now())).toBeGreaterThan(pausedWorkerTime);
    await expect.poll(() => popup.evaluate(() => Date.now())).toBeGreaterThan(pausedPageTime);
  });

  test('time continues running after setSystemTime and fastForward', async ({ extension }) => {
    const popup = await extension.openPopup();
    await extension.clock.setSystemTime(0);
    await extension.clock.fastForward(60_000);
    const workerTime = await extension.evaluate(() => Date.now());
    const pageTime = await popup.evaluate(() => Date.now());
    // Neither command stops automatic advancement.
    await expect.poll(() => extension.evaluate(() => Date.now())).toBeGreaterThan(workerTime);
    await expect.poll(() => popup.evaluate(() => Date.now())).toBeGreaterThan(pageTime);
  });

  test('pauseAt works without open pages', async ({ extension }) => {
    await Promise.all(extension.context.pages().map((page) => page.close()));
    await extension.clock.pauseAt('2026-01-02T00:00:00Z');
    expect(extension.context.pages()).toHaveLength(0);
    // A later page inherits the paused clock.
    await extension.clock.setSystemTime(0);
    const popup = await extension.openPopup();
    await delay(100);
    expect(await popup.evaluate(() => Date.now())).toBe(0);
  });
});

test.describe('paused clock', () => {
  const initialTime = '2026-01-01T00:00:00.000Z';

  test.use({
    extensionClock: {
      time: initialTime,
      timers: true,
      paused: true,
    },
  });

  test('fastForward and setSystemTime update worker and page dates', async ({ extension }) => {
    const popup = await extension.openPopup();
    expect(await extension.evaluate(() => new Date().toISOString())).toBe(initialTime);
    expect(await popup.evaluate(() => new Date().toISOString())).toBe(initialTime);

    // A relative jump advances both clocks by five seconds.
    await extension.clock.fastForward(5000);
    expect(await extension.evaluate(() => new Date().toISOString())).toBe(
      '2026-01-01T00:00:05.000Z',
    );
    expect(await popup.evaluate(() => new Date().toISOString())).toBe('2026-01-01T00:00:05.000Z');

    // An absolute date change sets both clocks to February.
    await extension.clock.setSystemTime(new Date('2026-02-01T00:00:00Z'));
    expect(await extension.evaluate(() => new Date().toISOString())).toBe(
      '2026-02-01T00:00:00.000Z',
    );
    expect(await popup.evaluate(() => new Date().toISOString())).toBe('2026-02-01T00:00:00.000Z');
  });

  test('new and reloaded pages inherit advanced time', async ({ extension }) => {
    // Advance before opening the popup to check that new pages inherit clock history.
    await extension.clock.fastForward('01:00');
    const popup = await extension.openPopup();
    expect(await popup.evaluate(() => new Date().toISOString())).toBe('2026-01-01T00:01:00.000Z');

    await extension.clock.fastForward(5000);
    // Navigation preserves the advanced time too.
    await popup.reload();
    expect(await popup.evaluate(() => new Date().toISOString())).toBe('2026-01-01T00:01:05.000Z');
  });

  test('full timer control rejects invalid calls', async ({ extension }) => {
    // Reject invalid durations and dates before dispatching clock commands.
    await expect(extension.clock.fastForward(-1)).rejects.toThrow(/non-negative/);
    await expect(extension.clock.runFor(Infinity)).rejects.toThrow(/finite/);
    await expect(extension.clock.runFor('foo')).rejects.toThrow(/Invalid clock duration/);
    await expect(extension.clock.pauseAt('foo')).rejects.toThrow(/Invalid clock time/);
    await expect(extension.clock.setSystemTime('foo')).rejects.toThrow(/Invalid clock time/);
  });

  test('reload resets worker time to initialTime', async ({ extension }) => {
    await extension.clock.fastForward(5000);
    // A replacement worker starts from the configured date, not the advanced date.
    await extension.reload();
    expect(await extension.evaluate(() => new Date().toISOString())).toBe(initialTime);
    await extension.clock.fastForward(5000);
    expect(await extension.evaluate(() => new Date().toISOString())).toBe(
      '2026-01-01T00:00:05.000Z',
    );
  });

  test('extension uninstalls while time is paused', async ({ extension }) => {
    const worker = extension.worker;
    // Cleanup must complete even though worker timers cannot advance on their own.
    await extension.uninstall();
    expect(extension.context.serviceWorkers()).not.toContain(worker);
  });

  test.describe('manual installation', () => {
    test.use({ extensionAutoInstall: false });

    test('upgrade resets worker time to initialTime', async ({ extension }) => {
      // Clock commands require installation first.
      await expect(extension.clock.fastForward(1000)).rejects.toThrow(/not installed/);
      await extension.install('./test/data/extension-0.1.0');
      await extension.clock.fastForward(10_000);
      // Upgrading also creates a worker with the original clock configuration.
      await extension.upgrade();
      expect(await extension.evaluate(() => new Date().toISOString())).toBe(initialTime);
    });
  });

  test.describe('custom initialization', () => {
    test.use({
      extensionInitScript: { content: 'globalThis.initialTime = new Date().toISOString();' },
    });

    test('extensionInitScript sees initialTime', async ({ extension }) => {
      const popup = await extension.openPopup();
      // The init script captured the fake date before application code ran.
      expect(await extension.evaluate('globalThis.initialTime')).toBe(initialTime);
      expect(await popup.evaluate('globalThis.initialTime')).toBe(initialTime);
    });
  });
});

test.describe('classic worker', () => {
  test.use({
    extensionAutoInstall: false,
    extensionClock: {
      time: 0,
      timers: true,
      paused: true,
    },
  });

  test('fastForward advances the classic worker date', async ({ extension }) => {
    await extension.install('./test/data/extension-classic-worker');
    // Classic workers support the same duration-string input as module workers.
    await extension.clock.fastForward('01');
    expect(await extension.evaluate(() => Date.now())).toBe(1000);
  });
});

test.describe('without a worker', () => {
  test.use({
    extensionAutoInstall: false,
    extensionClock: {
      time: 0,
      timers: true,
      paused: true,
    },
  });

  test('fastForward advances the page date without a worker', async ({ extension }) => {
    // Only the page clock exists in this extension; worker controls should be skipped.
    await extension.install('./test/data/extension-no-worker');
    const popup = await extension.openPopup();
    await extension.clock.fastForward(1000);
    expect(await popup.evaluate(() => Date.now())).toBe(1000);
  });
});

test.describe('timer advancement', () => {
  test.use({ extensionClock: { time: 0, timers: true, paused: true } });

  test('runFor runs repeated intervals and chained timeouts at their due times', async ({
    extension,
  }) => {
    const popup = await extension.openPopup();
    // Schedule a 1s interval and a 1.5s timeout that schedules another timeout 1s later.
    const timeouts = {
      intervalMs: 1000,
      timeoutMs: 1500,
      chainedTimeoutMs: 1000,
    };
    await extension.evaluate(scheduleTimerEvents, timeouts);
    await popup.evaluate(scheduleTimerEvents, timeouts);

    // Run every occurrence: interval at 1s/2s/3s, timeouts at 1.5s/2.5s.
    await extension.clock.runFor(3000);
    expect(await extension.evaluate(readTimerEvents)).toEqual([1000, 1500, 2000, 2500, 3000]);
    expect(await popup.evaluate(readTimerEvents)).toEqual([1000, 1500, 2000, 2500, 3000]);

    // Manual advancement must leave the initially paused clocks paused.
    await delay(50);
    expect(await extension.evaluate(() => Date.now())).toBe(3000);
    expect(await popup.evaluate(() => Date.now())).toBe(3000);
  });

  test('fastForward fires each due timer once and skips interval repetitions', async ({
    extension,
  }) => {
    const popup = await extension.openPopup();
    // Schedule a 1s interval and a 1.5s timeout that schedules another timeout 1s later.
    const timeouts = {
      intervalMs: 1000,
      timeoutMs: 1500,
      chainedTimeoutMs: 1000,
    };
    await extension.evaluate(scheduleTimerEvents, timeouts);
    await popup.evaluate(scheduleTimerEvents, timeouts);

    // Both overdue timers fire at the destination; missed interval repetitions are skipped.
    await extension.clock.fastForward(3000);
    expect(await extension.evaluate(readTimerEvents)).toEqual([3000, 3000]);
    expect(await popup.evaluate(readTimerEvents)).toEqual([3000, 3000]);

    // The next interval and the newly scheduled timeout are both due at 4s.
    await extension.clock.runFor(1000);
    expect(await extension.evaluate(readTimerEvents)).toEqual([3000, 3000, 4000, 4000]);
    expect(await popup.evaluate(readTimerEvents)).toEqual([3000, 3000, 4000, 4000]);
  });

  test('fastForward flushes promise continuations between overdue callbacks', async ({
    extension,
  }) => {
    const popup = await extension.openPopup();
    // Two timers share a deadline: the first queues a promise that schedules a third timer.
    await extension.evaluate(schedulePromiseEvents);
    await popup.evaluate(schedulePromiseEvents);
    await extension.clock.fastForward(1000);
    // The promise runs between overdue callbacks; its new timer is beyond the jump target.
    expect(await extension.evaluate(readTimerEvents)).toEqual([1, 2, 3]);
    expect(await popup.evaluate(readTimerEvents)).toEqual([1, 2, 3]);
  });

  test('runFor runs timers scheduled by promise continuations', async ({ extension }) => {
    const popup = await extension.openPopup();
    // Two timers share a deadline: the first queues a promise that schedules a third timer.
    await extension.evaluate(schedulePromiseEvents);
    await popup.evaluate(schedulePromiseEvents);
    await extension.clock.runFor(1000);
    // Running through deadlines also executes the timer created by the promise.
    expect(await extension.evaluate(readTimerEvents)).toEqual([1, 2, 3, 4]);
    expect(await popup.evaluate(readTimerEvents)).toEqual([1, 2, 3, 4]);
  });

  test('worker clock controls abort timeouts without adding DOM timer APIs', async ({
    extension,
  }) => {
    await extension.evaluate(() => {
      const events: number[] = [];
      (globalThis as typeof globalThis & { clockEvents: number[] }).clockEvents = events;
      // Record the fake date when the abort timeout fires.
      AbortSignal.timeout(1000).addEventListener('abort', () => events.push(Date.now()));
    });
    await extension.clock.fastForward(1000);
    expect(await extension.evaluate(readTimerEvents)).toEqual([1000]);

    // Installing the clock must not introduce page-only APIs into the worker.
    expect(
      await extension.evaluate(() => ({
        animationFrame: typeof requestAnimationFrame,
        idleCallback: typeof requestIdleCallback,
      })),
    ).toEqual({ animationFrame: 'undefined', idleCallback: 'undefined' });
  });

  test('pauseAt jumps to the target and fires overdue timers once', async ({ extension }) => {
    const popup = await extension.openPopup();
    // Schedule a 1s interval and a 1.5s timeout that schedules another timeout 1s later.
    const timeouts = {
      intervalMs: 1000,
      timeoutMs: 1500,
      chainedTimeoutMs: 1000,
    };
    await extension.evaluate(scheduleTimerEvents, timeouts);
    await popup.evaluate(scheduleTimerEvents, timeouts);

    // pauseAt uses the same overdue-timer policy as fastForward, then stays paused.
    await extension.clock.pauseAt(3000);
    expect(await extension.evaluate(readTimerEvents)).toEqual([3000, 3000]);
    expect(await popup.evaluate(readTimerEvents)).toEqual([3000, 3000]);
    await delay(50);
    expect(await extension.evaluate(() => Date.now())).toBe(3000);
    expect(await popup.evaluate(() => Date.now())).toBe(3000);

    // A pause target cannot move backward from the current date.
    await expect(extension.clock.pauseAt(2000)).rejects.toThrow(/past/);
  });

  test('fixed dates preserve timer execution and system time restores date advancement', async ({
    extension,
  }) => {
    const popup = await extension.openPopup();
    // Schedule a 1s interval and a 1.5s timeout that schedules another timeout 1s later.
    const timeouts = {
      intervalMs: 1000,
      timeoutMs: 1500,
      chainedTimeoutMs: 1000,
    };
    await extension.evaluate(scheduleTimerEvents, timeouts);
    await popup.evaluate(scheduleTimerEvents, timeouts);

    // Timer deadlines still advance while callbacks observe the same fixed date.
    await extension.clock.setFixedTime(10_000);
    await extension.clock.runFor(1000);
    expect(await extension.evaluate(readTimerEvents)).toEqual([10_000]);
    expect(await popup.evaluate(readTimerEvents)).toEqual([10_000]);
    expect(await extension.evaluate(() => Date.now())).toBe(10_000);
    expect(await popup.evaluate(() => Date.now())).toBe(10_000);

    // Changing the system date itself must not trigger another callback.
    await extension.clock.setSystemTime(20_000);
    expect(await extension.evaluate(readTimerEvents)).toEqual([10_000]);
    expect(await popup.evaluate(readTimerEvents)).toEqual([10_000]);

    // The original 1.5s timeout still has 500ms left; its callback sees advancing time again.
    await extension.clock.runFor(500);
    expect(await extension.evaluate(readTimerEvents)).toEqual([10_000, 20_500]);
    expect(await popup.evaluate(readTimerEvents)).toEqual([10_000, 20_500]);
  });

  test('setSystemTime preserves timer delays even when moving backward', async ({ extension }) => {
    const popup = await extension.openPopup();
    // Schedule a 1s interval and a 1.5s timeout that schedules another timeout 1s later.
    const timeouts = {
      intervalMs: 1000,
      timeoutMs: 1500,
      chainedTimeoutMs: 1000,
    };
    await extension.evaluate(scheduleTimerEvents, timeouts);
    await popup.evaluate(scheduleTimerEvents, timeouts);

    // Moving the date backward leaves the first interval due in one second.
    await extension.clock.setSystemTime(-5000);
    await extension.clock.fastForward(1000);
    expect(await extension.evaluate(readTimerEvents)).toEqual([-4000]);
    expect(await popup.evaluate(readTimerEvents)).toEqual([-4000]);
  });
});

function scheduleTimerEvents({
  intervalMs,
  timeoutMs,
  chainedTimeoutMs,
}: {
  intervalMs: number;
  timeoutMs: number;
  chainedTimeoutMs: number;
}) {
  const events: number[] = [];
  (globalThis as typeof globalThis & { clockEvents: number[] }).clockEvents = events;
  setInterval(() => events.push(Date.now()), intervalMs);
  setTimeout(() => {
    events.push(Date.now());
    setTimeout(() => events.push(Date.now()), chainedTimeoutMs);
  }, timeoutMs);
}

function schedulePromiseEvents() {
  const events: number[] = [];
  (globalThis as typeof globalThis & { clockEvents: number[] }).clockEvents = events;
  setTimeout(() => {
    // Event 2 is a microtask; event 4 is a new timer created by that microtask.
    events.push(1);
    void Promise.resolve().then(() => {
      events.push(2);
      setTimeout(() => events.push(4), 100);
    });
  }, 100);
  setTimeout(() => events.push(3), 100);
}
