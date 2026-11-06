import { setTimeout as delay } from 'node:timers/promises';
import { expect } from '@playwright/test';
import { test, launchWithExtension } from '../../../src/index.js';
import { readTimerEvents } from './helpers.js';

test.use({
  launchOptions: { env: { ...process.env, TZ: 'UTC' } },
});

test.describe('without timer mocking', () => {
  const time = '2026-01-01T00:00:00.000Z';

  test.use({
    extensionClock: { time },
  });

  test('setFixedTime changes dates while performance keeps running', async ({ extension }) => {
    const popup = await extension.openPopup();
    expect(await extension.evaluate(() => new Date().toISOString())).toBe(time);
    expect(await popup.evaluate(() => new Date().toISOString())).toBe(time);
    expect(await extension.evaluate(() => new Date().getTimezoneOffset())).toBe(0);
    expect(await popup.evaluate(() => new Date().getTimezoneOffset())).toBe(0);

    // Changing the fixed date must not freeze the native performance clock.
    await extension.clock.setFixedTime('2026-02-01T00:00:00Z');
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

  test('fixed dates leave worker abort timeouts on real time', async ({ extension }) => {
    // The abort uses a real timeout even though Date stays fixed.
    const abortedAt = await extension.evaluate(async () => {
      const signal = AbortSignal.timeout(20);
      await new Promise<void>((resolve) => signal.addEventListener('abort', () => resolve()));
      return new Date().toISOString();
    });
    expect(abortedAt).toBe(time);
  });

  test('setSystemTime restores advancing dates in the worker and page', async ({ extension }) => {
    const popup = await extension.openPopup();
    // Leave the initial fixed-date mode without enabling timer mocking.
    await extension.clock.setSystemTime(0);

    await expectTimeToAdvance(() => extension.evaluate(() => Date.now()));
    await expectTimeToAdvance(() => popup.evaluate(() => Date.now()));
  });

  test('timer control methods require timer mocking', async ({ extension }) => {
    await expect(extension.clock.pauseAt(1000)).rejects.toThrow(/requires.*timers/);
    await expect(extension.clock.resume()).rejects.toThrow(/requires.*timers/);
    await expect(extension.clock.runFor(1000)).rejects.toThrow(/requires.*timers/);
    await expect(extension.clock.fastForward(1000)).rejects.toThrow(/requires.*timers/);
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
      timers: false,
    },
  });
  try {
    const popup = await extension.openPopup();
    expect(await extension.evaluate(() => new Date().toISOString())).toBe(
      '2026-01-01T00:00:00.000Z',
    );
    expect(await popup.evaluate(() => new Date().toISOString())).toBe('2026-01-01T00:00:00.000Z');
    await extension.clock.setFixedTime('2026-01-01T00:00:05Z');
    expect(await extension.evaluate(() => new Date().toISOString())).toBe(
      '2026-01-01T00:00:05.000Z',
    );
  } finally {
    await extension.close();
  }
});

test.describe('date changes without timer mocking', () => {
  test.use({ extensionClock: { time: 0, timers: false } });

  test('fixed date changes leave native timers running', async ({ extension }) => {
    const popup = await extension.openPopup();
    // Schedule real timers before changing the fixed date twice.
    await extension.evaluate(scheduleNativeTimer);
    await popup.evaluate(scheduleNativeTimer);
    await extension.clock.setFixedTime(1000);
    await extension.clock.setFixedTime(3000);
    expect(await extension.evaluate(() => Date.now())).toBe(3000);
    expect(await popup.evaluate(() => Date.now())).toBe(3000);

    // Real timers fire independently of the fixed date.
    await expect.poll(() => extension.evaluate(readTimerEvents)).toEqual([1]);
    await expect.poll(() => popup.evaluate(readTimerEvents)).toEqual([1]);
    await delay(50);
    expect(await extension.evaluate(() => Date.now())).toBe(3000);
    expect(await popup.evaluate(() => Date.now())).toBe(3000);

    // Explicit date changes can also move backward and forward again.
    await extension.clock.setFixedTime(0);
    await extension.clock.setFixedTime(1000);
    expect(await extension.evaluate(() => Date.now())).toBe(1000);
    expect(await popup.evaluate(() => Date.now())).toBe(1000);
  });

  test('reload resets the worker date and setters align both clocks', async ({ extension }) => {
    await extension.clock.setFixedTime(5000);
    // Reload discards the worker clock state and reapplies the initial date.
    await extension.reload();
    expect(await extension.evaluate(() => Date.now())).toBe(0);

    // A subsequent setter aligns the replacement worker and newly opened pages.
    await extension.clock.setFixedTime(1000);
    const popup = await extension.openPopup();
    expect(await extension.evaluate(() => Date.now())).toBe(1000);
    expect(await popup.evaluate(() => Date.now())).toBe(1000);
    await popup.reload();
    expect(await popup.evaluate(() => Date.now())).toBe(1000);
  });

  test('invalid dates leave clocks unchanged', async ({ extension }) => {
    const popup = await extension.openPopup();
    await expect(extension.clock.setSystemTime(Infinity)).rejects.toThrow(/Invalid clock time/);
    await expect(extension.clock.setFixedTime('foo')).rejects.toThrow(/Invalid clock time/);
    // Neither invalid input should have changed either clock.
    expect(await extension.evaluate(() => Date.now())).toBe(0);
    expect(await popup.evaluate(() => Date.now())).toBe(0);
  });
});

test.describe('date-only clock without a worker or open pages', () => {
  test.use({
    extensionAutoInstall: false,
    extensionClock: { time: 0 },
  });

  test('setFixedTime updates dates inherited by later pages', async ({ extension }) => {
    await extension.install('./test/data/extension-no-worker');
    await Promise.all(extension.context.pages().map((page) => page.close()));
    await extension.clock.setFixedTime(1000);
    expect(extension.context.pages()).toHaveLength(0);
    // With no worker or existing page, a later popup still inherits the fixed date.
    const popup = await extension.openPopup();
    expect(await popup.evaluate(() => Date.now())).toBe(1000);
  });
});

function scheduleNativeTimer() {
  const events: number[] = [];
  (globalThis as typeof globalThis & { clockEvents: number[] }).clockEvents = events;
  setTimeout(() => events.push(1), 20);
}

async function expectTimeToAdvance(readTime: () => Promise<number>) {
  const initialTime = await readTime();
  await expect.poll(readTime).toBeGreaterThan(initialTime);
}
