---
title: Migration
description: Test stored-data migration when upgrading from an older unpacked extension build.
---

An extension update may need to migrate saved settings to a new format. Testing that migration
requires upgrading an existing installation while keeping its stored data.

`playwright-webext` lets you install an older build, seed its data, and upgrade it within one test.
[`extension.upgrade()`](../api/extension.md#upgrade) loads the current build configured in
`extensionPath` while preserving the extension ID and browser-profile state, so your test can check
the migration's result.

## Prepare the old build

Place an older unpacked build in `./dist-v1`. The current build is already configured in
`extensionPath`.

This example assumes the old build has version `1.0.0`, the current build has version `2.0.0`, and the
current extension migrates `{ theme: 'dark' }` into `{ preferences: { colorScheme: 'dark' } }` from its
`chrome.runtime.onInstalled` update handler. Both builds need a background service worker and the
`storage` permission. The migration itself belongs to your extension.

## Verify the migration

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
      preferences: { colorScheme: 'dark' },
    });
});
```

Custom install paths, like `extensionPath`, resolve relative to your Playwright configuration file.
Wait for any old-build initialization before seeding data if that initialization also writes storage.

## Upgrade behavior

The package copies the old build to a temporary directory and installs it from there. During the
upgrade, it replaces that directory's contents with the current build.
The extension ID and browser-profile state are preserved. The worker is replaced and
`extension.manifest` is refreshed; previously captured manifest objects remain snapshots of the old
version. Read `extension.worker` again after upgrading rather than retaining an old worker handle.

`upgrade()` waits for worker replacement and the new manifest, not completion of your migration
handler. Use [`expect.poll`](https://playwright.dev/docs/test-assertions#expectpoll) to wait for migrated data.

An upgrade requires an explicit `install(path)` and can run only once per test's extension instance.
It tests an unpacked upgrade, not store delivery. A configured translation catalog is applied to
both builds; see [i18n](i18n.md).
