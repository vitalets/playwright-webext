import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { test } from '../../../src/index.js';

test.use({
  timezoneId: 'Europe/Madrid',
  launchOptions: { env: { ...process.env, TZ: 'Europe/Madrid' } },
  extensionAutoInstall: false,
  extensionClock: { time: '2030-01-01T23:00' },
  extensionInitScript: {
    content: `globalThis.initialTime = {
      iso: new Date().toISOString(),
      hour: new Date().getHours(),
      zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };`,
  },
});

test('resolves browser-local time before worker and page initialization', async ({ extension }) => {
  const pages = extension.context.pages();
  await extension.install();
  expect(extension.context.pages()).toEqual(pages);
  const popup = await extension.openPopup();
  expect(await extension.evaluate('globalThis.initialTime')).toEqual({
    iso: '2030-01-01T22:00:00.000Z',
    hour: 23,
    zone: 'Europe/Madrid',
  });
  expect(await popup.evaluate('globalThis.initialTime')).toEqual({
    iso: '2030-01-01T22:00:00.000Z',
    hour: 23,
    zone: 'Europe/Madrid',
  });
});

test('setTime resolves browser-local dates with and without open pages', async ({ extension }) => {
  await extension.install();
  await Promise.all(extension.context.pages().map((page) => page.close()));
  await extension.clock.setTime('2030-07-01T23:00');
  expect(extension.context.pages()).toHaveLength(0);
  const popup = await extension.openPopup();
  expect(await extension.evaluate(() => new Date().toISOString())).toBe('2030-07-01T21:00:00.000Z');
  expect(await popup.evaluate(() => new Date().toISOString())).toBe('2030-07-01T21:00:00.000Z');

  await extension.clock.setTime('2030-01-01T23:00');
  expect(await extension.evaluate(() => new Date().toISOString())).toBe('2030-01-01T22:00:00.000Z');
  expect(await popup.evaluate(() => new Date().toISOString())).toBe('2030-01-01T22:00:00.000Z');
});

test.describe('paused timers without open pages', () => {
  test.use({ extensionClock: { time: '2030-01-01T23:00', withTimers: true, paused: true } });

  test('resolves initial time and closes its temporary page', async ({ extension }) => {
    await Promise.all(extension.context.pages().map((page) => page.close()));
    await extension.install();
    expect(extension.context.pages()).toHaveLength(0);
    const popup = await extension.openPopup();
    expect(await extension.evaluate('globalThis.initialTime.iso')).toBe('2030-01-01T22:00:00.000Z');
    expect(await popup.evaluate('globalThis.initialTime.iso')).toBe('2030-01-01T22:00:00.000Z');
  });
});

test.describe('explicit UTC', () => {
  test.use({ extensionClock: { time: '2030-01-01T23:00Z' } });

  test('preserves the absolute instant without opening a page', async ({ extension }) => {
    await Promise.all(extension.context.pages().map((page) => page.close()));
    const openedPages: Page[] = [];
    extension.context.on('page', (page) => openedPages.push(page));
    await extension.install();
    expect(openedPages).toHaveLength(0);
    const popup = await extension.openPopup();
    expect(await extension.evaluate('globalThis.initialTime.iso')).toBe('2030-01-01T23:00:00.000Z');
    expect(await popup.evaluate('globalThis.initialTime.iso')).toBe('2030-01-01T23:00:00.000Z');
  });
});

test.describe('explicit offset', () => {
  test.use({ extensionClock: { time: '2030-01-01T23:00+03:00' } });

  test('preserves the absolute instant without opening a page', async ({ extension }) => {
    await Promise.all(extension.context.pages().map((page) => page.close()));
    const openedPages: Page[] = [];
    extension.context.on('page', (page) => openedPages.push(page));
    await extension.install();
    expect(openedPages).toHaveLength(0);
    const popup = await extension.openPopup();
    expect(await extension.evaluate('globalThis.initialTime.iso')).toBe('2030-01-01T20:00:00.000Z');
    expect(await popup.evaluate('globalThis.initialTime.iso')).toBe('2030-01-01T20:00:00.000Z');
  });
});

test.describe('invalid input', () => {
  test.use({ extensionClock: { time: 'foo' } });

  test('rejects before installing clocks and cleans up the temporary page', async ({
    extension,
  }) => {
    await Promise.all(extension.context.pages().map((page) => page.close()));
    await expect(extension.install()).rejects.toThrow(/Invalid clock time/);
    expect(extension.context.pages()).toHaveLength(0);
    expect(extension.context.serviceWorkers()).toHaveLength(0);
    const page = await extension.context.newPage();
    expect(await page.evaluate(() => Math.abs(Date.now() - performance.timeOrigin))).toBeLessThan(
      60_000,
    );
  });
});
