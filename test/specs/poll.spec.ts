import { expect, test } from '@playwright/test';
import { poll } from '../../src/index.js';

test('returns the first truthy synchronous value without calling again', async () => {
  const value = { ready: true };
  let calls = 0;
  const result = await poll(() => (++calls === 3 ? value : undefined), {
    intervals: [1],
  });
  expect(result).toBe(value);
  expect(calls).toBe(3);
});

test('awaits asynchronous callbacks and retries falsy values', async () => {
  const values = [undefined, null, false, 0, '', 'ready'];
  const result = await poll(() => values.shift(), { intervals: [1] });
  expect(result).toBe('ready');
  expect(values).toEqual([]);
});

test('rejects when the callback stays falsy', async () => {
  await expect(poll(() => false, { timeout: 50, intervals: [1] })).rejects.toThrow('Timeout 50ms');
});

test('propagates callback errors', async () => {
  await expect(
    poll(() => {
      throw new Error('callback failed');
    }),
  ).rejects.toThrow('callback failed');
});
