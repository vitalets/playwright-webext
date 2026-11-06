import { expect } from '@playwright/test';
import { test } from '../../../src/index.js';
import { readTimerEvents } from './helpers.js';

test.use({ extensionAutoInstall: false });

test.describe('default fixed time', () => {
  test.use({ extensionClock: {} });

  test('samples the browser date once for pages and the worker', async ({ extension }) => {
    const page = extension.context.pages()[0] ?? (await extension.context.newPage());
    // A browser date different from Node's proves where the default comes from.
    await page.evaluate(() => {
      Date.now = () => 123456789;
    });
    await extension.install();
    const popup = await extension.openPopup();
    expect(await extension.evaluate(() => Date.now())).toBe(123456789);
    expect(await popup.evaluate(() => Date.now())).toBe(123456789);
  });
});

test.describe('default timer time', () => {
  test.use({ extensionClock: { timers: true, paused: true } });

  test('advances timers from the current date without existing pages', async ({ extension }) => {
    await Promise.all(extension.context.pages().map((page) => page.close()));
    const beforeInstall = Date.now();
    await extension.install();
    const initialTime = await extension.evaluate(() => Date.now());
    expect(initialTime).toBeGreaterThanOrEqual(beforeInstall);
    expect(initialTime).toBeLessThanOrEqual(Date.now());
    const popup = await extension.openPopup();
    expect(await popup.evaluate(() => Date.now())).toBe(initialTime);
    await extension.evaluate(scheduleTimer);
    await popup.evaluate(scheduleTimer);
    await extension.clock.runFor(1000);
    expect(await extension.evaluate(readTimerEvents)).toEqual([1]);
    expect(await popup.evaluate(readTimerEvents)).toEqual([1]);
    expect(await extension.evaluate(() => Date.now())).toBe(initialTime + 1000);
    expect(await popup.evaluate(() => Date.now())).toBe(initialTime + 1000);
  });
});

test.describe('default alarm time', () => {
  test.use({ extensionClock: { alarms: true, paused: true } });

  test('advances alarms from the current date', async ({ extension }) => {
    const beforeInstall = Date.now();
    await extension.install();
    const initialTime = await extension.evaluate(() => Date.now());
    expect(initialTime).toBeGreaterThanOrEqual(beforeInstall);
    expect(initialTime).toBeLessThanOrEqual(Date.now());
    await extension.evaluate(async () => {
      const events: number[] = [];
      (globalThis as typeof globalThis & { clockEvents: number[] }).clockEvents = events;
      chrome.alarms.onAlarm.addListener(() => events.push(1));
      await chrome.alarms.create('foo', { delayInMinutes: 1 });
    });
    await extension.clock.fastForward(60_000);
    expect(await extension.evaluate(readTimerEvents)).toEqual([1]);
    expect(await extension.evaluate(() => Date.now())).toBe(initialTime + 60_000);
    const popup = await extension.openPopup();
    expect(await popup.evaluate(() => Date.now())).toBe(initialTime + 60_000);
  });
});

function scheduleTimer() {
  const events: number[] = [];
  (globalThis as typeof globalThis & { clockEvents: number[] }).clockEvents = events;
  setTimeout(() => events.push(1), 1000);
}
