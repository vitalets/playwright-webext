import { realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { expect } from '@playwright/test';
import { test } from '../../src/index.js';

test.use({ extensionPath: './data/extension-with-dnr' });

test('loads an extension with static DNR rules from prepared dir', async ({
  extension,
  extensionPath,
}, testInfo) => {
  const configDir = dirname(testInfo.config.configFile!);
  const originalPath = await realpath(resolve(configDir, extensionPath));
  const loadedPath = await realpath(extension.loadedPath);
  expect(loadedPath).not.toBe(originalPath);
  expect(dirname(dirname(loadedPath))).toBe(await realpath(tmpdir()));
});
