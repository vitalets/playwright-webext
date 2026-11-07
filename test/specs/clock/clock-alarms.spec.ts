import { setTimeout as delay } from 'node:timers/promises';
import { cp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect } from '@playwright/test';
import { test } from '../../../src/index.js';

test.use({
  extensionPath: './data/extension-alarms',
  extensionClock: { time: 0, alarms: true, timers: true, paused: true },
});

test('startup alarms in the real-world past wait for mocked time', async ({ extension }) => {
  await delay(100);
  expect(await extension.evaluate(readAlarms)).toEqual([]);
  await extension.clock.runFor('59:00');
  expect(await extension.evaluate(readAlarms)).toEqual([]);
  await extension.clock.runFor('01:00');
  expect(await extension.evaluate(readAlarms)).toEqual([
    { name: 'my-alarm', scheduledTime: 3_600_000, now: 3_600_000 },
  ]);
  expect(await extension.evaluate(() => chrome.alarms.get('my-alarm'))).toBeUndefined();
});

test('runFor delivers repeats at every deadline', async ({ extension }) => {
  await extension.evaluate(() => chrome.alarms.create('foo', { periodInMinutes: 10 }));
  await extension.clock.runFor('35:00');
  expect(await extension.evaluate(readAlarms)).toEqual([
    { name: 'foo', scheduledTime: 600_000, now: 600_000 },
    { name: 'foo', scheduledTime: 1_200_000, now: 1_200_000 },
    { name: 'foo', scheduledTime: 1_800_000, now: 1_800_000 },
  ]);
  expect(await extension.evaluate(() => chrome.alarms.get('foo'))).toMatchObject({
    scheduledTime: 2_400_000,
  });
});

test('fastForward delivers once and preserves Chromium recurrence cadence', async ({
  extension,
}) => {
  await extension.evaluate(() => chrome.alarms.create('foo', { periodInMinutes: 10 }));
  await extension.clock.fastForward('35:00');
  expect(await extension.evaluate(readAlarms)).toEqual([
    { name: 'foo', scheduledTime: 600_000, now: 2_100_000 },
  ]);
  expect(await extension.evaluate(() => chrome.alarms.get('foo'))).toMatchObject({
    scheduledTime: 2_400_000,
  });
});

test('setSystemTime keeps absolute and relative alarm deadlines without delivering', async ({
  extension,
}) => {
  await extension.evaluate(async () => {
    await chrome.alarms.create('foo', { when: 60_000 });
    await chrome.alarms.create('bar', { delayInMinutes: 2 });
  });
  await extension.clock.setSystemTime(180_000);
  expect(await extension.evaluate(readAlarms)).toEqual([]);
  expect(await extension.evaluate(() => chrome.alarms.get('foo'))).toMatchObject({
    scheduledTime: 60_000,
  });
  expect(await extension.evaluate(() => chrome.alarms.get('bar'))).toMatchObject({
    scheduledTime: 120_000,
  });
  await extension.clock.runFor(0);
  expect(await extension.evaluate(readAlarms)).toEqual([
    { name: 'foo', scheduledTime: 60_000, now: 180_000 },
    { name: 'bar', scheduledTime: 120_000, now: 180_000 },
  ]);
  await expect(extension.clock.setFixedTime(0)).rejects.toThrow(/setFixedTime.*alarms/);
});

test('listeners can cancel and replace pending alarms', async ({ extension }) => {
  await extension.evaluate(async () => {
    await chrome.alarms.create('foo', { when: 1000 });
    await chrome.alarms.create('bar', { when: 2000 });
    await chrome.alarms.create('baz', { when: 3000 });
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name !== 'foo') return;
      void chrome.alarms.clear('bar');
      void chrome.alarms.create('baz', { when: 4000 });
    });
  });
  await extension.clock.runFor(5000);
  expect(await extension.evaluate(readAlarms)).toEqual([
    { name: 'foo', scheduledTime: 1000, now: 1000 },
    { name: 'baz', scheduledTime: 4000, now: 4000 },
  ]);
});

test('once-only advancement defers alarms created by listeners', async ({ extension }) => {
  await extension.evaluate(async () => {
    await chrome.alarms.create('foo', { when: 1000 });
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'foo') void chrome.alarms.create('bar', { when: Date.now() });
    });
  });
  await extension.clock.fastForward(5000);
  expect(await extension.evaluate(readAlarms)).toEqual([
    { name: 'foo', scheduledTime: 1000, now: 5000 },
  ]);
  await extension.clock.runFor(0);
  expect(await extension.evaluate(readAlarms)).toEqual([
    { name: 'foo', scheduledTime: 1000, now: 5000 },
    { name: 'bar', scheduledTime: 5000, now: 5000 },
  ]);
});

test('worker timers and alarms share chronological advancement', async ({ extension }) => {
  await extension.evaluate(() => {
    setTimeout(() => {
      void chrome.alarms.create('foo', { when: 2000 });
    }, 1000);
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name !== 'foo') return;
      setTimeout(() => {
        void chrome.alarms.create('bar', { when: 4000 });
      }, 1000);
    });
  });
  await extension.clock.runFor(5000);
  expect(await extension.evaluate(readAlarms)).toEqual([
    { name: 'foo', scheduledTime: 2000, now: 2000 },
    { name: 'bar', scheduledTime: 4000, now: 4000 },
  ]);
});

test('unnamed alarms support replacement, callbacks, listing and removal', async ({
  extension,
}) => {
  const result = await extension.evaluate(async () => {
    await chrome.alarms.clearAll();
    await chrome.alarms.create({ when: 1000 });
    await chrome.alarms.create({ when: 2000 });
    const alarm = await new Promise<chrome.alarms.Alarm | undefined>((resolve) =>
      chrome.alarms.get(resolve),
    );
    const alarms = await chrome.alarms.getAll();
    const cleared = await chrome.alarms.clear();
    const clearedAgain = await chrome.alarms.clear();
    return { alarm, alarms, cleared, clearedAgain };
  });
  expect(result).toMatchObject({
    alarm: { name: '', scheduledTime: 2000 },
    alarms: [{ name: '', scheduledTime: 2000 }],
    cleared: true,
    clearedAgain: false,
  });
});

test('one-shots disappear before listeners and immediate alarms wait for advancement', async ({
  extension,
}) => {
  const beforeAdvance = await extension.evaluate(async () => {
    chrome.alarms.onAlarm.addListener((alarm) => {
      void chrome.alarms
        .get(alarm.name)
        .then((pending) => chrome.storage.local.set({ pending: pending ?? null }));
    });
    await chrome.alarms.create('foo', { when: 0 });
    return readAlarmsCount();
    function readAlarmsCount() {
      return (globalThis as typeof globalThis & { alarmEvents: unknown[] }).alarmEvents.length;
    }
  });
  expect(beforeAdvance).toBe(0);
  await extension.clock.runFor(0);
  expect(await extension.evaluate(readAlarms)).toEqual([{ name: 'foo', scheduledTime: 0, now: 0 }]);
  await extension.storage.local.expect('pending').toBeNull();
});

test('backward date changes postpone alarms without shifting their timestamps', async ({
  extension,
}) => {
  await extension.evaluate(() => chrome.alarms.create('foo', { when: 1000 }));
  await extension.clock.setSystemTime(-1000);
  await extension.clock.runFor(1000);
  expect(await extension.evaluate(readAlarms)).toEqual([]);
  await extension.clock.runFor(1000);
  expect(await extension.evaluate(readAlarms)).toEqual([
    { name: 'foo', scheduledTime: 1000, now: 1000 },
  ]);
});

test('pauseAt delivers once, retains cadence and stops automatic delivery', async ({
  extension,
}) => {
  await extension.evaluate(() => chrome.alarms.create('foo', { periodInMinutes: 10 }));
  await extension.clock.pauseAt(2_100_000);
  await delay(100);
  expect(await extension.evaluate(readAlarms)).toEqual([
    { name: 'foo', scheduledTime: 600_000, now: 2_100_000 },
  ]);
  expect(await extension.evaluate(() => chrome.alarms.get('foo'))).toMatchObject({
    scheduledTime: 2_400_000,
  });
});

test('reload discards emulated alarms and reapplies the initial clock', async ({ extension }) => {
  await extension.evaluate(() => chrome.alarms.create('foo', { when: 1000 }));
  await extension.clock.runFor(500);
  await extension.reload();
  expect(await extension.evaluate(() => chrome.alarms.get('foo'))).toBeUndefined();
  expect(await extension.evaluate(() => Date.now())).toBe(0);
  expect(await extension.evaluate(() => chrome.alarms.get('my-alarm'))).toMatchObject({
    scheduledTime: 3_600_000,
  });
});

test('endless immediate rescheduling fails descriptively', async ({ extension }) => {
  await extension.evaluate(() => {
    chrome.alarms.onAlarm.addListener(() => {
      void chrome.alarms.create('foo', { when: Date.now() });
    });
    void chrome.alarms.create('foo', { when: 0 });
  });
  await expect(extension.clock.runFor(2000)).rejects.toThrow(
    /endless chain.*immediately due alarms/,
  );
});

test('native alarms from extension pages cannot reach emulated worker listeners', async ({
  extension,
}) => {
  const popup = await extension.openPopup();
  await popup.evaluate(() => chrome.alarms.create('native', { delayInMinutes: 0.02 }));
  await expect.poll(() => popup.evaluate(() => chrome.alarms.get('native'))).toBeUndefined();
  expect(await extension.evaluate(readAlarms)).toEqual([]);
});

test.describe('local midnight', () => {
  // https://github.com/microsoft/playwright/issues/43983
  test.skip(true, 'Playwright timezoneId does not apply to service workers');
  test.use({
    timezoneId: 'Europe/Madrid',
    extensionClock: { time: '2026-03-28T23:00', alarms: true, paused: true },
  });

  test('synchronous rescheduling follows local midnight across spring DST', async ({
    extension,
  }) => {
    await extension.evaluate(scheduleMidnights);
    await extension.clock.runFor('59:00');
    expect(await extension.evaluate(readAlarms)).toEqual([]);
    await extension.clock.runFor('01:05');
    expect(await extension.evaluate(readMidnights)).toEqual(['2026-03-28T23:00:05.000Z']);
    await extension.clock.runFor('23:00:00');
    expect(await extension.evaluate(readMidnights)).toEqual([
      '2026-03-28T23:00:05.000Z',
      '2026-03-29T22:00:05.000Z',
    ]);
  });

  test('future dates follow local midnight across autumn DST', async ({ extension }) => {
    await extension.clock.setSystemTime('2030-10-26T23:00');
    await extension.evaluate(scheduleMidnights);
    await extension.clock.runFor('01:00:05');
    expect(await extension.evaluate(readMidnights)).toEqual(['2030-10-26T22:00:05.000Z']);
    await extension.clock.runFor('25:00:00');
    expect(await extension.evaluate(readMidnights)).toEqual([
      '2030-10-26T22:00:05.000Z',
      '2030-10-27T23:00:05.000Z',
    ]);
  });
});

test.describe('native alarm behavior', () => {
  test.use({ extensionClock: { time: 0, timers: true, paused: true } });

  test('alarms remain native when emulation is disabled', async ({ extension }) => {
    await extension.evaluate(() => chrome.alarms.create('foo', { delayInMinutes: 1 }));
    await extension.clock.runFor('02:00');
    expect(await extension.evaluate(readAlarms)).toEqual([]);
    expect(await extension.evaluate(() => chrome.alarms.get('foo'))).toMatchObject({
      scheduledTime: expect.any(Number),
    });
    expect(
      (await extension.evaluate(() => chrome.alarms.get('foo')))!.scheduledTime,
    ).toBeGreaterThan(120_000);
  });
});

test.describe('classic worker startup', () => {
  test.use({ extensionAutoInstall: false });

  test('installs alarm emulation before classic application code', async ({
    extension,
  }, testInfo) => {
    const directory = testInfo.outputPath('extension');
    await cp(new URL('../../data/extension-alarms', import.meta.url), directory, {
      recursive: true,
    });
    const manifestPath = join(directory, 'manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as chrome.runtime.ManifestV3;
    delete manifest.background!.type;
    await writeFile(manifestPath, JSON.stringify(manifest));
    await extension.install(directory);
    await extension.clock.runFor('01:00:00');
    expect(await extension.evaluate(readAlarms)).toEqual([
      { name: 'my-alarm', scheduledTime: 3_600_000, now: 3_600_000 },
    ]);
  });
});

test.describe('automatic advancement', () => {
  test.use({ extensionClock: { time: 0, alarms: true } });

  test('alarm-only clocks start running without explicit resume', async ({ extension }) => {
    const popup = await extension.openPopup();
    await extension.evaluate(() => chrome.alarms.create('foo', { delayInMinutes: 0.001 }));
    await expect
      .poll(() => extension.evaluate(readAlarms))
      .toEqual([{ name: 'foo', scheduledTime: expect.any(Number), now: expect.any(Number) }]);
    const pageTime = await popup.evaluate(() => Date.now());
    await expect.poll(() => popup.evaluate(() => Date.now())).toBeGreaterThan(pageTime);
  });
});

test.describe('alarm-only mocking', () => {
  test.use({ extensionClock: { time: 0, alarms: true, paused: true } });

  test('worker and page timers stay native while dates and alarms are paused', async ({
    extension,
  }) => {
    const popup = await extension.openPopup();
    expect(
      await extension.evaluate(
        () => new Promise<number>((resolve) => setTimeout(() => resolve(Date.now()), 20)),
      ),
    ).toBe(0);
    expect(
      await popup.evaluate(
        () => new Promise<number>((resolve) => setTimeout(() => resolve(Date.now()), 20)),
      ),
    ).toBe(0);
    await extension.clock.runFor(1000);
    expect(await popup.evaluate(() => Date.now())).toBe(1000);
    await popup.reload();
    expect(await popup.evaluate(() => Date.now())).toBe(1000);
    await extension.clock.setSystemTime(2000);
    await extension.evaluate(() => chrome.alarms.create('foo', { when: 2100 }));
    await extension.clock.resume();
    await expect
      .poll(() => extension.evaluate(readAlarms))
      .toEqual([{ name: 'foo', scheduledTime: 2100, now: expect.any(Number) }]);
    await expect.poll(() => popup.evaluate(() => Date.now())).toBeGreaterThan(2000);
    await extension.clock.pauseAt(10_000);
    await delay(100);
    expect(await extension.evaluate(() => Date.now())).toBe(10_000);
    expect(await popup.evaluate(() => Date.now())).toBe(10_000);
  });
});

function readAlarms() {
  return (
    globalThis as typeof globalThis & {
      alarmEvents: { name: string; scheduledTime: number; now: number }[];
    }
  ).alarmEvents;
}

function scheduleMidnights() {
  void chrome.alarms.clearAll();
  const schedule = () => {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    next.setHours(0, 0, 5, 0);
    void chrome.alarms.create('midnight', { when: next.getTime() });
  };
  chrome.alarms.onAlarm.addListener(schedule);
  schedule();
}

function readMidnights() {
  return (globalThis as typeof globalThis & { alarmEvents: { now: number }[] }).alarmEvents.map(
    (event) => new Date(event.now).toISOString(),
  );
}
