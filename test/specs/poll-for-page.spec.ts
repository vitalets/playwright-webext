import { expect, type Page } from '@playwright/test';
import { test } from '../../src/index.js';

test('matches existing pages by URL or synchronous predicate', async ({ extension }) => {
  const popup = await extension.openPopup();
  expect(await extension.pollForPage('popup.html')).toBe(popup);
  expect(await extension.pollForPage('/popup.html')).toBe(popup);
  expect(await extension.pollForPage(popup.url())).toBe(popup);
  const matched: Page = await extension.pollForPage((page) => page === popup);
  expect(matched).toBe(popup);
});

test('waits for a newly opened page to match a predicate', async ({ extension }) => {
  const [matched, popup] = await Promise.all([
    extension.pollForPage((page) => page.url() === extension.popupUrl, { intervals: [10] }),
    extension.openPopup(),
  ]);
  expect(matched).toBe(popup);
});

test('times out when an asynchronous predicate never matches', async ({ extension }) => {
  await expect(
    extension.pollForPage(() => Promise.resolve(false), { timeout: 100, intervals: [10] }),
  ).rejects.toThrow(/Timeout/);
});

test('propagates predicate errors', async ({ extension }) => {
  const error = new Error('Predicate failed');
  await expect(
    extension.pollForPage(() => {
      throw error;
    }),
  ).rejects.toThrow(error);
  await expect(extension.pollForPage(() => Promise.reject(error))).rejects.toThrow(error);
});
