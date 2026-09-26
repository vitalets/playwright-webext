---
title: Migration
description: Test stored-data migration when upgrading from an older unpacked extension build.
---

An extension update may need to migrate saved settings to a new format. Testing that migration
requires upgrading an existing installation while keeping its stored data.

## Prepare the old build

With `extensionAutoInstall: false`, playwright-webext lets you install an older build, seed its data, and upgrade it within one test.
[`extension.upgrade()`](../api/extension.md#upgrade) loads the current build configured in
`extensionPath` while preserving the extension ID and browser-profile state, so your test can check
the migration's result.

A typical migration test follows this structure:

```ts
test.use({ extensionAutoInstall: false });

test('migration v1 -> v2', async () => {
  await extension.install('./path/to/old/dist');

  // ...set up state in extension v1

  await extension.upgrade();

  // ...validate state after upgrading to v2
});
```

## Example

This example upgrades from version `1.0.0` in `./dist-v1` to version `2.0.0`, configured in
`extensionPath`.

During the update, the extension's `chrome.runtime.onInstalled` handler moves the saved `theme`
into `preferences`:

Before migration (v1):

```json
{ "theme": "dark" }
```

After migration (v2):

```json
{ "preferences": { "theme": "dark" } }
```

In the version `2.0.0` background script, check `previousVersion` so the migration runs only
when updating from version `1.x`. The extension needs the `storage` permission.

```js title="background.js"
chrome.runtime.onInstalled.addListener(async ({ reason, previousVersion }) => {
  if (reason === 'update' && previousVersion?.startsWith('1.')) {
    const { theme } = await chrome.storage.local.get('theme');
    if (theme !== undefined) {
      await chrome.storage.local.set({ preferences: { theme } });
      await chrome.storage.local.remove('theme');
    }
  }
});
```

The migration test:

```ts title="tests/migration.spec.ts"
import { expect } from '@playwright/test';
import { test } from 'playwright-webext';

test.use({ extensionAutoInstall: false });

test('migrates preferences from the old version', async ({ extension }) => {
  await extension.install('./dist-v1');

  expect(extension.manifest.version).toBe('1.0.0');
  await extension.storage.local.set({ theme: 'dark' });

  await extension.upgrade();

  expect(extension.manifest.version).toBe('2.0.0');
  await expect
    .poll(() => extension.storage.local.get('preferences'))
    .toEqual({
      preferences: { theme: 'dark' },
    });
});
```

## Under the hood

`extension.install(path)` copies the old build to a temporary directory and loads it into Chromium.
`extension.upgrade()` replaces that copy with the current build from `extensionPath` and reloads
the extension from the same directory. This preserves the extension ID and browser-profile state.

The reload replaces the service worker. `upgrade()` waits for the new worker and refreshes
`extension.manifest` before returning. Previously captured worker handles and manifest objects still
refer to the old version, so read `extension.worker` and `extension.manifest` again after upgrading.

Worker readiness does not mean the extension's migration handler has finished. Use
[`expect.poll`](https://playwright.dev/docs/test-assertions#expectpoll) to wait for migrated data.

This process tests an unpacked extension upgrade; it does not use store delivery. It requires an
explicit `install(path)` and supports one upgrade per test's extension instance. If a translation
catalog is configured, it is applied to both builds; see [i18n](i18n.md).
