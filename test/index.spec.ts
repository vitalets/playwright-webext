/**
 * Verifies that Playwright can load the minimal Extension Under Test and expose its manifest.
 */

import { expect } from '@playwright/test';
import { test } from '../src/index.js';

test.use({ extensionPath: './test/data/extension' });

test('loads the extension manifest', async ({ extension }) => {
  expect(extension.manifest.name).toBe('Test Extension');
  expect(extension.manifest.manifest_version).toBe(3);
});
