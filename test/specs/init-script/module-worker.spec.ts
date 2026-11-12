import { expect } from '@playwright/test';
import { test } from '../../../src/index.js';

test.describe('external script', () => {
  test.use({
    extensionInitScript: './specs/init-script/init-script.js',
  });

  test('initializes before worker dependencies and page scripts', async ({ extension }) => {
    const popup = await extension.openPopup();
    expect(await popup.evaluate(() => chrome.runtime.sendMessage('language'))).toBe('foo');
    await expect(popup.locator('#language')).toHaveText('foo');
    await popup.reload();
    await expect(popup.locator('#language')).toHaveText('foo');
    await extension.reload();
    const reopened = await extension.openPopup();
    expect(await reopened.evaluate(() => chrome.runtime.sendMessage('language'))).toBe('foo');

    const website = await extension.context.newPage();
    await website.goto('data:text/html,<h1>Website</h1>');
    expect(await website.evaluate(() => globalThis.chrome?.i18n)).toBeUndefined();
  });
});

test.describe('inline script', () => {
  test.use({
    extensionInitScript: { content: 'Math.random = () => 42;' },
  });

  test('initializes the worker and extension pages', async ({ extension }) => {
    expect(await extension.evaluate(() => Math.random())).toBe(42);
    const popup = await extension.openPopup();
    expect(await popup.evaluate(() => Math.random())).toBe(42);
  });
});

test.describe('script array', () => {
  test.use({
    extensionInitScript: [
      { content: "globalThis.foo = ['first'];" },
      './specs/init-script/init-script.js',
      { content: "globalThis.foo.push('last');" },
    ],
  });

  test('runs mixed scripts in order, including after reload', async ({ extension }) => {
    expect(await extension.evaluate('globalThis.foo')).toEqual(['first', 'file', 'last']);
    const popup = await extension.openPopup();
    expect(await popup.evaluate('globalThis.foo')).toEqual(['first', 'file', 'last']);
    await popup.reload();
    expect(await popup.evaluate('globalThis.foo')).toEqual(['first', 'file', 'last']);

    await extension.reload();
    expect(await extension.evaluate('globalThis.foo')).toEqual(['first', 'file', 'last']);
    const reopened = await extension.openPopup();
    expect(await reopened.evaluate('globalThis.foo')).toEqual(['first', 'file', 'last']);
  });
});

test.describe('empty array', () => {
  test.use({ extensionInitScript: [] });

  test('installs without initialization', async ({ extension }) => {
    expect(await extension.evaluate('globalThis.foo')).toBeUndefined();
  });
});
