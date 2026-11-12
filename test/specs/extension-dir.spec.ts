import { resolve } from 'node:path';
import { expect } from '@playwright/test';
import { test } from '../../src/index.js';

test.describe.serial('prepared directory reuse in regular tests', () => {
  // A non-default locale triggers directory preparation.
  test.use({ locale: 'es' });

  let preparedDir: string;

  test('records the prepared directory', ({ extension }) => {
    preparedDir = extension.loadedPath;
    expect(preparedDir).not.toBe(resolve('test/data/extension'));
  });

  test('reuses the prepared directory in the next test', ({ extension }) => {
    expect(extension.loadedPath).toBe(preparedDir);
  });
});

test.describe.serial('prepared directory cleanup after upgrade', () => {
  test.use({ extensionAutoInstall: false });

  test('upgrades the prepared build', async ({ extension }) => {
    await extension.install('./test/data/extension-0.1.0');
    await extension.upgrade();
    expect(extension.manifest.version).toBe('1.0.0');
  });

  test('installs the original build in the next test', async ({ extension }) => {
    await extension.install('./test/data/extension-0.1.0');
    expect(extension.manifest.version).toBe('0.1.0');
  });
});
