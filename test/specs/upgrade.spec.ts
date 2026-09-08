import { expect } from '@playwright/test';
import { test } from '../../src/index.js';

test.describe('extension upgrade', () => {
  test.use({ oldVersionExtensionPath: './data/extension-0.1.0' });

  test('0.1.0 -> current', async ({ extension }) => {
    expect(extension.manifest.version).toBe('0.1.0');

    const oldId = extension.id;
    const oldWorker = extension.worker;
    await oldWorker.evaluate(() => chrome.storage.local.set({ foo: 'bar' }));

    await extension.upgrade();

    expect(extension.manifest.version).toBe('1.0.0');
    expect(extension.id).toBe(oldId);
    expect(extension.worker).not.toBe(oldWorker);
    expect(await extension.worker.evaluate(() => chrome.storage.local.get('foo'))).toEqual({
      foo: 'bar',
    });

    await expect
      .poll(() => extension.worker.evaluate(() => chrome.storage.local.get('onInstalled')))
      .toEqual({ onInstalled: { reason: 'update', previousVersion: '0.1.0' } });

    await expect(extension.upgrade()).rejects.toThrow('already been used');
  });
});

test.describe('localized upgrade', () => {
  test.use({
    locale: 'es',
    oldVersionExtensionPath: './data/extension-0.1.0',
  });

  test('0.1.0 -> current (+i18n)', async ({ extension }) => {
    expect(extension.manifest.name).toBe('Extensión de prueba antigua');
    expect(await extension.worker.evaluate(() => chrome.i18n.getMessage('greeting'))).toBe(
      'Hola antigua',
    );

    await extension.upgrade();

    expect(extension.manifest.name).toBe('Extensión de prueba');
    expect(await extension.worker.evaluate(() => chrome.i18n.getMessage('greeting'))).toBe('Hola');
  });
});

test('rejects upgrade when no old version is configured', async ({ extension }) => {
  await expect(extension.upgrade()).rejects.toThrow('use.oldVersionExtensionPath');
});
