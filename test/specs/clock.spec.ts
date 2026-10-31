import { setTimeout as delay } from 'node:timers/promises';
import { expect } from '@playwright/test';
import { test, launchWithExtension } from '../../src/index.js';

test.describe('without timer mocking', () => {
  const time = '2026-01-01T00:00:00.000Z';

  test.use({
    extensionClock: { time },
  });

  test('setTime changes dates while performance keeps running', async ({ extension }) => {
    const popup = await extension.openPopup();
    expect(await extension.evaluate(() => new Date().toISOString())).toBe(time);
    expect(await popup.evaluate(() => new Date().toISOString())).toBe(time);

    await extension.clock.setTime('2026-02-01T00:00:00Z');
    const workerPerformance = await extension.evaluate(() => performance.now());
    const pagePerformance = await popup.evaluate(() => performance.now());
    await expect
      .poll(() => extension.evaluate(() => performance.now()))
      .toBeGreaterThan(workerPerformance);
    await expect
      .poll(() => popup.evaluate(() => performance.now()))
      .toBeGreaterThan(pagePerformance);
    // Dates stay fixed as real time passes.
    await delay(100);
    expect(await extension.evaluate(() => new Date().toISOString())).toBe(
      '2026-02-01T00:00:00.000Z',
    );
    expect(await popup.evaluate(() => new Date().toISOString())).toBe('2026-02-01T00:00:00.000Z');
  });

  test('timer control methods require timer mocking', async ({ extension }) => {
    await expect(extension.clock.pause()).rejects.toThrow(/requires.*withTimers/);
    await expect(extension.clock.resume()).rejects.toThrow(/requires.*withTimers/);
  });
});

test.describe('running clock', () => {
  test.use({
    extensionClock: {
      time: '2026-01-01T00:00:00Z',
      withTimers: true,
    },
  });

  test('pause and resume control automatic time advancement', async ({ extension }) => {
    const popup = await extension.openPopup();
    // Time advances automatically before pausing.
    const workerTime = await extension.evaluate(() => Date.now());
    const pageTime = await popup.evaluate(() => Date.now());
    await expect.poll(() => extension.evaluate(() => Date.now())).toBeGreaterThan(workerTime);
    await expect.poll(() => popup.evaluate(() => Date.now())).toBeGreaterThan(pageTime);

    await extension.clock.pause();
    const pausedWorkerTime = await extension.evaluate(() => Date.now());
    const pausedPageTime = await popup.evaluate(() => Date.now());
    // Wait in Node so this check is independent of both fake clocks.
    await delay(100);
    expect(await extension.evaluate(() => Date.now())).toBe(pausedWorkerTime);
    expect(await popup.evaluate(() => Date.now())).toBe(pausedPageTime);

    await extension.clock.resume();
    await expect.poll(() => extension.evaluate(() => Date.now())).toBeGreaterThan(pausedWorkerTime);
    await expect.poll(() => popup.evaluate(() => Date.now())).toBeGreaterThan(pausedPageTime);
  });

  test('time continues running after setTime and tick', async ({ extension }) => {
    const popup = await extension.openPopup();
    await extension.clock.setTime(0);
    await extension.clock.tick(60_000);
    const workerTime = await extension.evaluate(() => Date.now());
    const pageTime = await popup.evaluate(() => Date.now());
    // Neither command stops automatic advancement.
    await expect.poll(() => extension.evaluate(() => Date.now())).toBeGreaterThan(workerTime);
    await expect.poll(() => popup.evaluate(() => Date.now())).toBeGreaterThan(pageTime);
  });

  test('pause works without open pages', async ({ extension }) => {
    await Promise.all(extension.context.pages().map((page) => page.close()));
    await extension.clock.pause();
    expect(extension.context.pages()).toHaveLength(0);
    // A later page inherits the paused clock.
    await extension.clock.setTime(0);
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
      withTimers: true,
      paused: true,
    },
  });

  test('tick and setTime update worker and page dates', async ({ extension }) => {
    const popup = await extension.openPopup();
    expect(await extension.evaluate(() => new Date().toISOString())).toBe(initialTime);
    expect(await popup.evaluate(() => new Date().toISOString())).toBe(initialTime);

    await extension.clock.tick(5000);
    expect(await extension.evaluate(() => new Date().toISOString())).toBe(
      '2026-01-01T00:00:05.000Z',
    );
    expect(await popup.evaluate(() => new Date().toISOString())).toBe('2026-01-01T00:00:05.000Z');

    await extension.clock.setTime(new Date('2026-02-01T00:00:00Z'));
    expect(await extension.evaluate(() => new Date().toISOString())).toBe(
      '2026-02-01T00:00:00.000Z',
    );
    expect(await popup.evaluate(() => new Date().toISOString())).toBe('2026-02-01T00:00:00.000Z');
  });

  test('new and reloaded pages inherit advanced time', async ({ extension }) => {
    await extension.clock.tick('01:00');
    const popup = await extension.openPopup();
    expect(await popup.evaluate(() => new Date().toISOString())).toBe('2026-01-01T00:01:00.000Z');

    await extension.clock.tick(5000);
    // Navigation preserves the advanced time too.
    await popup.reload();
    expect(await popup.evaluate(() => new Date().toISOString())).toBe('2026-01-01T00:01:05.000Z');
  });

  test('full timer control rejects invalid calls', async ({ extension }) => {
    await expect(extension.clock.tick(-1)).rejects.toThrow(/non-negative/);
    await expect(extension.clock.setTime('foo')).rejects.toThrow(/Invalid clock time/);
  });

  test('reload resets worker time to initialTime', async ({ extension }) => {
    await extension.clock.tick(5000);
    await extension.reload();
    expect(await extension.evaluate(() => new Date().toISOString())).toBe(initialTime);
    await extension.clock.tick(5000);
    expect(await extension.evaluate(() => new Date().toISOString())).toBe(
      '2026-01-01T00:00:05.000Z',
    );
  });

  test('extension uninstalls while time is paused', async ({ extension }) => {
    const worker = extension.worker;
    await extension.uninstall();
    expect(extension.context.serviceWorkers()).not.toContain(worker);
  });

  test.describe('manual installation', () => {
    test.use({ extensionAutoInstall: false });

    test('upgrade resets worker time to initialTime', async ({ extension }) => {
      // Clock commands require installation first.
      await expect(extension.clock.tick(1000)).rejects.toThrow(/not installed/);
      await extension.install('./test/data/extension-0.1.0');
      await extension.clock.tick(10_000);
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
      withTimers: true,
      paused: true,
    },
  });

  test('tick advances the classic worker date', async ({ extension }) => {
    await extension.install('./test/data/extension-classic-worker');
    await extension.clock.tick('01');
    expect(await extension.evaluate(() => Date.now())).toBe(1000);
  });
});

test.describe('without a worker', () => {
  test.use({
    extensionAutoInstall: false,
    extensionClock: {
      time: 0,
      withTimers: true,
      paused: true,
    },
  });

  test('tick advances the page date without a worker', async ({ extension }) => {
    await extension.install('./test/data/extension-no-worker');
    const popup = await extension.openPopup();
    await extension.clock.tick(1000);
    expect(await popup.evaluate(() => Date.now())).toBe(1000);
  });
});

test('extension.clock requires extensionClock', ({ extension }) => {
  expect(() => extension.clock).toThrow(/Configure extensionClock/);
});

test('launchWithExtension applies extensionClock', async ({ channel }) => {
  const extension = await launchWithExtension({
    launchOptions: { channel },
    extensionPath: './test/data/extension',
    extensionClock: {
      time: new Date('2026-01-01T00:00:00Z'),
      withTimers: false,
    },
  });
  try {
    await extension.clock.setTime('2026-01-01T00:00:05Z');
    expect(await extension.evaluate(() => new Date().toISOString())).toBe(
      '2026-01-01T00:00:05.000Z',
    );
  } finally {
    await extension.close();
  }
});

test.describe('tick without timer mocking', () => {
  test.use({ extensionClock: { time: 0, withTimers: false } });

  test('successive ticks update dates while native timers keep running', async ({ extension }) => {
    const popup = await extension.openPopup();
    await extension.evaluate(scheduleNativeTimer);
    await popup.evaluate(scheduleNativeTimer);
    await extension.clock.tick(1000);
    await extension.clock.tick('02', { timers: 'once' });
    expect(await extension.evaluate(() => Date.now())).toBe(3000);
    expect(await popup.evaluate(() => Date.now())).toBe(3000);
    await expect.poll(() => extension.evaluate(readTimerEvents)).toEqual([1]);
    await expect.poll(() => popup.evaluate(readTimerEvents)).toEqual([1]);
    await delay(50);
    expect(await extension.evaluate(() => Date.now())).toBe(3000);
    expect(await popup.evaluate(() => Date.now())).toBe(3000);
    await extension.clock.setTime(0);
    await extension.clock.tick(1000);
    expect(await extension.evaluate(() => Date.now())).toBe(1000);
    expect(await popup.evaluate(() => Date.now())).toBe(1000);
  });

  test('ticks preserve independent dates after worker reload', async ({ extension }) => {
    await extension.clock.tick(5000);
    await extension.reload();
    await extension.clock.tick(1000);
    const popup = await extension.openPopup();
    expect(await extension.evaluate(() => Date.now())).toBe(1000);
    expect(await popup.evaluate(() => Date.now())).toBe(6000);
    await popup.reload();
    expect(await popup.evaluate(() => Date.now())).toBe(6000);
  });

  test('invalid durations and dates leave clocks unchanged', async ({ extension }) => {
    const popup = await extension.openPopup();
    await expect(extension.clock.tick(-1)).rejects.toThrow(/non-negative/);
    await expect(extension.clock.tick(Infinity)).rejects.toThrow(/finite/);
    await expect(extension.clock.tick('foo')).rejects.toThrow(/Invalid clock duration/);
    await expect(extension.clock.setTime('foo')).rejects.toThrow(/Invalid clock time/);
    expect(await extension.evaluate(() => Date.now())).toBe(0);
    expect(await popup.evaluate(() => Date.now())).toBe(0);
  });
});

test.describe('tick timer policies', () => {
  test.use({ extensionClock: { time: 0, withTimers: true, paused: true } });

  test('all runs repeated intervals and chained timeouts at their due times', async ({
    extension,
  }) => {
    const popup = await extension.openPopup();
    await extension.evaluate(scheduleTimerEvents);
    await popup.evaluate(scheduleTimerEvents);
    await extension.clock.tick(3000, { timers: 'all' });
    expect(await extension.evaluate(readTimerEvents)).toEqual([1000, 1500, 2000, 2500, 3000]);
    expect(await popup.evaluate(readTimerEvents)).toEqual([1000, 1500, 2000, 2500, 3000]);
    await delay(50);
    expect(await extension.evaluate(() => Date.now())).toBe(3000);
    expect(await popup.evaluate(() => Date.now())).toBe(3000);
  });

  test('tick defaults to once and skips interval repetitions', async ({ extension }) => {
    const popup = await extension.openPopup();
    await extension.evaluate(scheduleTimerEvents);
    await popup.evaluate(scheduleTimerEvents);
    await extension.clock.tick(3000);
    expect(await extension.evaluate(readTimerEvents)).toEqual([3000, 3000]);
    expect(await popup.evaluate(readTimerEvents)).toEqual([3000, 3000]);
    await extension.clock.tick(1000, { timers: 'all' });
    expect(await extension.evaluate(readTimerEvents)).toEqual([3000, 3000, 4000, 4000]);
    expect(await popup.evaluate(readTimerEvents)).toEqual([3000, 3000, 4000, 4000]);
  });

  test('setTime preserves timer delays even when moving backward', async ({ extension }) => {
    const popup = await extension.openPopup();
    await extension.evaluate(scheduleTimerEvents);
    await popup.evaluate(scheduleTimerEvents);
    await extension.clock.setTime(-5000);
    await extension.clock.tick(1000);
    expect(await extension.evaluate(readTimerEvents)).toEqual([-4000]);
    expect(await popup.evaluate(readTimerEvents)).toEqual([-4000]);
  });
});

test.describe('date-only clock without a worker or open pages', () => {
  test.use({
    extensionAutoInstall: false,
    extensionClock: { time: 0 },
  });

  test('tick updates dates inherited by later pages', async ({ extension }) => {
    await extension.install('./test/data/extension-no-worker');
    await Promise.all(extension.context.pages().map((page) => page.close()));
    await extension.clock.tick(1000);
    expect(extension.context.pages()).toHaveLength(0);
    const popup = await extension.openPopup();
    expect(await popup.evaluate(() => Date.now())).toBe(1000);
  });
});

function scheduleTimerEvents() {
  const events: number[] = [];
  (globalThis as typeof globalThis & { clockEvents: number[] }).clockEvents = events;
  setInterval(() => events.push(Date.now()), 1000);
  setTimeout(() => {
    events.push(Date.now());
    setTimeout(() => events.push(Date.now()), 1000);
  }, 1500);
}

function scheduleNativeTimer() {
  const events: number[] = [];
  (globalThis as typeof globalThis & { clockEvents: number[] }).clockEvents = events;
  setTimeout(() => events.push(1), 20);
}

function readTimerEvents() {
  return (globalThis as typeof globalThis & { clockEvents: number[] }).clockEvents;
}
