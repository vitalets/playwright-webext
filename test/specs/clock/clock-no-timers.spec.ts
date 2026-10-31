import { setTimeout as delay } from 'node:timers/promises';
import { expect } from '@playwright/test';
import { test, launchWithExtension } from '../../../src/index.js';
import { readTimerEvents } from './helpers.js';

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

function scheduleNativeTimer() {
  const events: number[] = [];
  (globalThis as typeof globalThis & { clockEvents: number[] }).clockEvents = events;
  setTimeout(() => events.push(1), 20);
}
