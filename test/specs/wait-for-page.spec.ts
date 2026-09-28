import { expect, type Page } from '@playwright/test';
import { test } from '../../src/index.js';

test('matches existing pages by URL or synchronous predicate', async ({ extension }) => {
  const popup = await extension.openPopup();
  expect(await extension.waitForPage('popup.html')).toBe(popup);
  expect(await extension.waitForPage('/popup.html')).toBe(popup);
  expect(await extension.waitForPage(popup.url())).toBe(popup);
  const matched: Page = await extension.waitForPage((page) => page === popup);
  expect(matched).toBe(popup);
});

test('waits for a newly opened page to match a predicate', async ({ extension }) => {
  const [matched, popup] = await Promise.all([
    extension.waitForPage((page) => page.url() === extension.popupUrl, { intervals: [10] }),
    extension.openPopup(),
  ]);
  expect(matched).toBe(popup);
});

test('awaits asynchronous predicates and retries when page content changes', async ({
  extension,
}) => {
  const page = await extension.context.newPage();
  await page.setContent('<title>Loading</title>');
  let attempts = 0;
  const matched = await extension.waitForPage(
    async (candidate) => {
      if (candidate !== page) return false;
      const title = await candidate.title();
      if (++attempts === 2) await candidate.setContent('<title>Ready</title>');
      return title === 'Ready';
    },
    { intervals: [10] },
  );
  expect(matched).toBe(page);
  expect(attempts).toBe(3);
});

test('times out when an asynchronous predicate never matches', async ({ extension }) => {
  await expect(
    extension.waitForPage(() => Promise.resolve(false), { timeout: 100, intervals: [10] }),
  ).rejects.toThrow(/Timeout/);
});

test('propagates predicate errors', async ({ extension }) => {
  const error = new Error('Predicate failed');
  await expect(
    extension.waitForPage(() => {
      throw error;
    }),
  ).rejects.toThrow(error);
  await expect(extension.waitForPage(() => Promise.reject(error))).rejects.toThrow(error);
});
