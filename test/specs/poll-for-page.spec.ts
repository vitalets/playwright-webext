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

test('matches native patterns and raw pattern objects with an explicit extension base', async ({
  extension,
}) => {
  const popup = await extension.openPopup();
  await popup.goto(`${extension.popupUrl}?source=test#ready`);
  const pattern = new URLPattern('/POPUP.html', extension.getURL(), { ignoreCase: true });
  expect(await extension.pollForPage(pattern)).toBe(popup);
  expect(await extension.pollForPage({ pathname: '/*.html', baseURL: extension.getURL() })).toBe(
    popup,
  );
  await expect(
    extension.pollForPage('popup.html', { timeout: 100, intervals: [10] }),
  ).rejects.toThrow(/Timeout/);
  await expect(
    extension.pollForPage(
      { pathname: '/popup.html', search: '', hash: '' },
      { timeout: 100, intervals: [10] },
    ),
  ).rejects.toThrow(/Timeout/);
});

test('raw patterns match external pages unless explicitly scoped', async ({ extension }) => {
  await extension.context.route('https://example.com/**', (route) => route.fulfill({ body: 'ok' }));
  const page = await extension.context.newPage();
  await page.goto('https://example.com/welcome.html?source=test#ready');
  expect(await extension.pollForPage({ pathname: '/welcome.html' })).toBe(page);
  await expect(
    extension.pollForPage(
      { pathname: '/welcome.html', baseURL: extension.getURL() },
      { timeout: 100, intervals: [10] },
    ),
  ).rejects.toThrow(/Timeout/);
});

test('polls pattern objects until a page navigates to a match', async ({ extension }) => {
  const page = await extension.context.newPage();
  const [matched] = await Promise.all([
    extension.pollForPage(
      { pathname: '/popup.html', baseURL: extension.getURL() },
      { intervals: [10] },
    ),
    page.goto(extension.popupUrl),
  ]);
  expect(matched).toBe(page);
});

test('rejects invalid patterns before polling', async ({ extension }) => {
  await expect(extension.pollForPage({ pathname: '(' })).rejects.toThrow(TypeError);
});

test('matches regular expressions against the full URL including query and hash', async ({
  extension,
}) => {
  const popup = await extension.openPopup();
  await popup.goto(`${extension.popupUrl}?source=test#ready`);
  expect(
    await extension.pollForPage(/^chrome-extension:\/\/[^/]+\/popup\.html\?source=test#ready$/),
  ).toBe(popup);
  await expect(
    extension.pollForPage(/\/popup\.html$/, { timeout: 100, intervals: [10] }),
  ).rejects.toThrow(/Timeout/);
});
