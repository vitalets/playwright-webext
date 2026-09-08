import { expect } from '@playwright/test';
import { test } from '../../src/index.js';

test.describe(() => {
  test.use({ locale: 'es' });

  test('localizes the extension through the real i18n API', async ({ extension }) => {
    expect(extension.manifest.default_locale).toBe('es');
    expect(extension.manifest.name).toBe('Extensión de prueba');
    expect(await extension.worker.evaluate(() => chrome.i18n.getMessage('greeting'))).toBe('Hola');

    // chrome.i18n.getUILanguage()
    const osLocale = Intl.DateTimeFormat().resolvedOptions().locale;
    expect(await extension.worker.evaluate(() => chrome.i18n.getUILanguage())).toBe(osLocale);
  });
});

test.describe(() => {
  test.use({ locale: 'es-ES' });

  test('falls back to the base locale', async ({ extension }) => {
    expect(extension.manifest.default_locale).toBe('es');
    expect(await extension.worker.evaluate(() => chrome.i18n.getMessage('greeting'))).toBe('Hola');
  });
});
