import { expect } from '@playwright/test';
import { test } from '../../src/index.js';

test('opens the side panel document in a regular tab', async ({ extension }) => {
  expect(extension.sidePanelUrl).toBe(extension.getURL('side-panel.html'));
  const page = await extension.openSidePanel();

  await expect(page).toHaveURL(extension.getURL('side-panel.html'));
  await expect(page.getByRole('heading', { name: 'Test Side Panel' })).toBeVisible();
});

test('uses the manifest path despite runtime side panel overrides', async ({ extension }) => {
  await extension.evaluate(() => chrome.sidePanel.setOptions({ path: 'options.html' }));

  expect(extension.sidePanelUrl).toBe(extension.getURL('side-panel.html'));
  const page = await extension.openSidePanel();
  await expect(page.getByRole('heading', { name: 'Test Side Panel' })).toBeVisible();
});

test('rejects a missing side panel without opening a tab', async ({ extension }) => {
  extension.manifest.side_panel = undefined;
  const pages = extension.context.pages();

  expect(() => extension.sidePanelUrl).toThrow(
    'Extension does not define side_panel.default_path.',
  );
  await expect(extension.openSidePanel()).rejects.toThrow('side_panel.default_path');
  expect(extension.context.pages()).toEqual(pages);
});
