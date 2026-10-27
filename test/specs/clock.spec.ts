import { setTimeout as delay } from 'node:timers/promises';
import { expect } from '@playwright/test';
import { test, launchWithExtension } from '../../src/index.js';

test.describe('fixed-time mode', () => {
  const time = '2026-01-01T00:00:00.000Z';

  test.use({
    extensionClock: { time },
  });

  test('setFixedTime changes dates while performance keeps running', async ({ extension }) => {
    const popup = await extension.openPopup();
    expect(await extension.evaluate(() => new Date().toISOString())).toBe(time);
    expect(await popup.evaluate(() => new Date().toISOString())).toBe(time);

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

  test('timer control methods require full-control mode', async ({ extension }) => {
    await expect(extension.clock.pause()).rejects.toThrow(/requires.*full-control/);
    await expect(extension.clock.resume()).rejects.toThrow(/requires.*full-control/);
    await expect(extension.clock.runFor(1000)).rejects.toThrow(/requires.*full-control/);
    await expect(extension.clock.setSystemTime(0)).rejects.toThrow(/requires.*full-control/);
  });
});

test.describe('running clock', () => {
  test.use({
    extensionClock: {
      time: '2026-01-01T00:00:00Z',
      mode: 'full-control',
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

  test('time continues running after setSystemTime and runFor', async ({ extension }) => {
    const popup = await extension.openPopup();
    await extension.clock.setSystemTime(0);
    await extension.clock.runFor(60_000);
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
      mode: 'full-control',
      paused: true,
    },
  });

  test('runFor and setSystemTime update worker and page dates', async ({ extension }) => {
    const popup = await extension.openPopup();
    expect(await extension.evaluate(() => new Date().toISOString())).toBe(initialTime);
    expect(await popup.evaluate(() => new Date().toISOString())).toBe(initialTime);

    await extension.clock.runFor(5000);
    expect(await extension.evaluate(() => new Date().toISOString())).toBe(
      '2026-01-01T00:00:05.000Z',
    );
    expect(await popup.evaluate(() => new Date().toISOString())).toBe('2026-01-01T00:00:05.000Z');

    await extension.clock.setSystemTime(new Date('2026-02-01T00:00:00Z'));
    expect(await extension.evaluate(() => new Date().toISOString())).toBe(
      '2026-02-01T00:00:00.000Z',
    );
    expect(await popup.evaluate(() => new Date().toISOString())).toBe('2026-02-01T00:00:00.000Z');
  });

  test('new and reloaded pages inherit advanced time', async ({ extension }) => {
    await extension.clock.runFor('01:00');
    const popup = await extension.openPopup();
    expect(await popup.evaluate(() => new Date().toISOString())).toBe('2026-01-01T00:01:00.000Z');

    await extension.clock.runFor(5000);
    // Navigation preserves the advanced time too.
    await popup.reload();
    expect(await popup.evaluate(() => new Date().toISOString())).toBe('2026-01-01T00:01:05.000Z');
  });

  test('full timer control rejects invalid calls', async ({ extension }) => {
    await expect(extension.clock.setFixedTime(0)).rejects.toThrow(/requires.*fixed-time/);
    await expect(extension.clock.runFor(-1)).rejects.toThrow(/non-negative/);
    await expect(extension.clock.setSystemTime('foo')).rejects.toThrow(/Invalid clock time/);
  });

  test('reload resets worker time to initialTime', async ({ extension }) => {
    await extension.clock.runFor(5000);
    await extension.reload();
    expect(await extension.evaluate(() => new Date().toISOString())).toBe(initialTime);
    await extension.clock.runFor(5000);
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
      await expect(extension.clock.runFor(1000)).rejects.toThrow(/not installed/);
      await extension.install('./test/data/extension-0.1.0');
      await extension.clock.runFor(10_000);
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

test.describe('worker fake selection', () => {
  test.use({
    extensionClock: {
      time: 0,
      mode: 'full-control',
      paused: true,
      workerFake: ['Date'],
    },
  });

  test('workerFake limits faking to Date', async ({ extension }) => {
    // Excluded APIs keep running while Date is paused.
    const performanceTime = await extension.evaluate(() => performance.now());
    await expect
      .poll(() => extension.evaluate(() => performance.now()))
      .toBeGreaterThan(performanceTime);
    expect(await extension.evaluate(() => Date.now())).toBe(0);
  });
});

test.describe('classic worker', () => {
  test.use({
    extensionAutoInstall: false,
    extensionClock: {
      time: 0,
      mode: 'full-control',
      paused: true,
    },
  });

  test('runFor advances the classic worker date', async ({ extension }) => {
    await extension.install('./test/data/extension-classic-worker');
    await extension.clock.runFor('01');
    expect(await extension.evaluate(() => Date.now())).toBe(1000);
  });
});

test.describe('without a worker', () => {
  test.use({
    extensionAutoInstall: false,
    extensionClock: {
      time: 0,
      mode: 'full-control',
      paused: true,
    },
  });

  test('runFor advances the page date without a worker', async ({ extension }) => {
    await extension.install('./test/data/extension-no-worker');
    const popup = await extension.openPopup();
    await extension.clock.runFor(1000);
    expect(await popup.evaluate(() => Date.now())).toBe(1000);
  });
});

test('extension.clock requires extensionClock', ({ extension }) => {
  expect(() => extension.clock).toThrow(/Configure extensionClock/);
});

test('launchWithExtension applies extensionClock', async () => {
  const extension = await launchWithExtension({
    extensionPath: './test/data/extension',
    extensionClock: {
      time: new Date('2026-01-01T00:00:00Z'),
      mode: 'fixed-time',
    },
  });
  try {
    await extension.clock.setFixedTime('2026-01-01T00:00:05Z');
    expect(await extension.evaluate(() => new Date().toISOString())).toBe(
      '2026-01-01T00:00:05.000Z',
    );
  } finally {
    await extension.close();
  }
});
