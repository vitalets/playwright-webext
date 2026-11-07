import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { test } from '../../../src/index.js';

test.use({
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

test.describe('browser-local time', () => {
  // https://github.com/microsoft/playwright/issues/43983
  test.skip(true, 'Playwright timezoneId does not apply to service workers');
  test.use({ timezoneId: 'Europe/Madrid' });

  test('resolves browser-local time before worker and page initialization', async ({
    extension,
  }) => {
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

  test('setFixedTime resolves browser-local dates with and without open pages', async ({
    extension,
  }) => {
    await extension.install();
    await Promise.all(extension.context.pages().map((page) => page.close()));
    // Resolve summer time through a temporary page, then close that page.
    await extension.clock.setFixedTime('2030-07-01T23:00');
    expect(extension.context.pages()).toHaveLength(0);
    const popup = await extension.openPopup();
    expect(await extension.evaluate(() => new Date().toISOString())).toBe(
      '2030-07-01T21:00:00.000Z',
    );
    expect(await popup.evaluate(() => new Date().toISOString())).toBe('2030-07-01T21:00:00.000Z');

    // Reuse the open popup to resolve the same local hour with the winter UTC offset.
    await extension.clock.setFixedTime('2030-01-01T23:00');
    expect(await extension.evaluate(() => new Date().toISOString())).toBe(
      '2030-01-01T22:00:00.000Z',
    );
    expect(await popup.evaluate(() => new Date().toISOString())).toBe('2030-01-01T22:00:00.000Z');
  });

  test.describe('date only', () => {
    test.use({ extensionClock: { time: '2026-01-01' } });

    test('starts at browser-local midnight and changes fixed dates across seasons', async ({
      extension,
    }) => {
      await extension.install();
      const popup = await extension.openPopup();
      expect(await extension.evaluate('globalThis.initialTime.iso')).toBe(
        '2025-12-31T23:00:00.000Z',
      );
      expect(await popup.evaluate('globalThis.initialTime.iso')).toBe('2025-12-31T23:00:00.000Z');

      await extension.clock.setFixedTime('2026-07-01');
      expect(await extension.evaluate(() => new Date().toISOString())).toBe(
        '2026-06-30T22:00:00.000Z',
      );
      expect(await popup.evaluate(() => new Date().toISOString())).toBe('2026-06-30T22:00:00.000Z');
    });

    test.describe('paused timers', () => {
      test.use({ extensionClock: { time: '2026-01-01', timers: true, paused: true } });

      test('sets and pauses at browser-local midnight without open pages', async ({
        extension,
      }) => {
        await extension.install();
        await Promise.all(extension.context.pages().map((page) => page.close()));
        await extension.clock.setSystemTime('2026-07-01');
        expect(await extension.evaluate(() => new Date().toISOString())).toBe(
          '2026-06-30T22:00:00.000Z',
        );
        const popup = await extension.openPopup();

        await extension.clock.pauseAt('2026-07-02');
        expect(await extension.evaluate(() => new Date().toISOString())).toBe(
          '2026-07-01T22:00:00.000Z',
        );
        expect(await popup.evaluate(() => new Date().toISOString())).toBe(
          '2026-07-01T22:00:00.000Z',
        );
      });
    });
  });

  test.describe('time only', () => {
    test.use({ extensionClock: { time: '23:00' } });

    test('uses the current browser date before worker and page initialization', async ({
      extension,
    }) => {
      // Madrid is already on January 2, although the UTC date is still January 1.
      await extension.context.clock.setFixedTime(new Date('2030-01-01T23:30:45.123Z'));
      await extension.install();
      const popup = await extension.openPopup();
      expect(await extension.evaluate('globalThis.initialTime.iso')).toBe(
        '2030-01-02T22:00:00.000Z',
      );
      expect(await popup.evaluate('globalThis.initialTime.iso')).toBe('2030-01-02T22:00:00.000Z');

      // Midnight stays on the current local date and clears seconds and milliseconds.
      await extension.clock.setFixedTime('00:00');
      expect(await extension.evaluate(() => new Date().toISOString())).toBe(
        '2030-01-01T23:00:00.000Z',
      );
      expect(await popup.evaluate(() => new Date().toISOString())).toBe('2030-01-01T23:00:00.000Z');
    });
  });

  test('time only preserves the fake date without open pages and rejects invalid times', async ({
    extension,
  }) => {
    await extension.install();
    await Promise.all(extension.context.pages().map((page) => page.close()));
    // A temporary page supplies the current fake date for the time-only input.
    await extension.clock.setFixedTime('12:34');
    expect(extension.context.pages()).toHaveLength(0);
    expect(await extension.evaluate(() => new Date().toISOString())).toBe(
      '2030-01-01T11:34:00.000Z',
    );
    await expect(extension.clock.setFixedTime('24:00')).rejects.toThrow(/Invalid clock time/);
    await expect(extension.clock.setFixedTime('23:60')).rejects.toThrow(/Invalid clock time/);
  });

  test.describe('paused timers without open pages', () => {
    test.use({ extensionClock: { time: '2030-01-01T23:00', timers: true, paused: true } });

    test('resolves initial time and closes its temporary page', async ({ extension }) => {
      await Promise.all(extension.context.pages().map((page) => page.close()));
      await extension.install();
      expect(extension.context.pages()).toHaveLength(0);
      const popup = await extension.openPopup();
      expect(await extension.evaluate('globalThis.initialTime.iso')).toBe(
        '2030-01-01T22:00:00.000Z',
      );
      expect(await popup.evaluate('globalThis.initialTime.iso')).toBe('2030-01-01T22:00:00.000Z');
      // Time-only system changes preserve the local calendar date, even when moving backward.
      await extension.clock.setSystemTime('12:34');
      expect(await extension.evaluate(() => new Date().toISOString())).toBe(
        '2030-01-01T11:34:00.000Z',
      );
      expect(await popup.evaluate(() => new Date().toISOString())).toBe('2030-01-01T11:34:00.000Z');
    });
  });

  test.describe('time-only pause targets', () => {
    test.use({ extensionClock: { time: '2030-01-01T12:00', timers: true, paused: true } });

    test('uses the current browser date for both clocks without rolling into tomorrow', async ({
      extension,
    }) => {
      await extension.install();
      await Promise.all(extension.context.pages().map((page) => page.close()));
      // Resolve 13:00 on the current fake date without leaving a temporary page open.
      await extension.clock.pauseAt('13:00');
      expect(extension.context.pages()).toHaveLength(0);
      const popup = await extension.openPopup();
      expect(await extension.evaluate(() => new Date().toISOString())).toBe(
        '2030-01-01T12:00:00.000Z',
      );
      expect(await popup.evaluate(() => new Date().toISOString())).toBe('2030-01-01T12:00:00.000Z');

      // An earlier local hour is rejected rather than interpreted as tomorrow.
      await expect(extension.clock.pauseAt('12:00')).rejects.toThrow(/past/);
      expect(await extension.evaluate(() => new Date().toISOString())).toBe(
        '2030-01-01T12:00:00.000Z',
      );
      expect(await popup.evaluate(() => new Date().toISOString())).toBe('2030-01-01T12:00:00.000Z');
    });
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
    // Failed initialization must leave a new page using its real clock.
    const page = await extension.context.newPage();
    expect(await page.evaluate(() => Math.abs(Date.now() - performance.timeOrigin))).toBeLessThan(
      60_000,
    );
  });
});
