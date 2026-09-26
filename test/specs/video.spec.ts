import { stat } from 'node:fs/promises';
import { expect } from '@playwright/test';
import { test } from '../../src/index.js';

test.use({ video: 'on' });

test('records video for the extension context', async ({ extension }) => {
  const page = await extension.context.newPage();
  await page.setContent('<h1>Video recording</h1>');
  await expect(page.locator('h1')).toBeVisible();

  const video = page.video();
  expect(video).not.toBeNull();
  await page.close();
  expect((await stat(await video!.path())).size).toBeGreaterThan(0);
});
