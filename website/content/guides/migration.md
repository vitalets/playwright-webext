---
title: Migration
description: Test stored-data migration when upgrading from an older unpacked extension build.
---

Install an older build, seed its stored data, then call [`extension.upgrade()`](../api/extension.md#upgrade)
to replace it with the build configured in `extensionPath`.

## Prepare two builds

Keep an older unpacked build in `dist-old/` and the current build in `dist/`. Configure
`extensionPath: './dist'` as shown in [Configuration options](../basics/configuration.md).

This example assumes the old build has version `1.0.0`, the new build has version `2.0.0`, and the
new extension migrates `{ theme: 'dark' }` into `{ preferences: { colorScheme: 'dark' } }` from its
`chrome.runtime.onInstalled` update handler. Both builds need a background service worker and the
`storage` permission. The migration itself belongs to your extension.

## Verify the migration

```ts title="tests/migration.spec.ts"
import { expect } from '@playwright/test';
import { test } from 'playwright-webext';

test.use({ extensionAutoInstall: false });

test('migrates preferences from the old version', async ({ extension }) => {
  await extension.install('./dist-old');
  expect(extension.manifest.version).toBe('1.0.0');
  const oldId = extension.id;
  await extension.storage.local.set({ theme: 'dark' });

  await extension.upgrade();

  expect(extension.id).toBe(oldId);
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

The package installs a private copy of the old build, then replaces its contents at the same path.
The extension ID and browser-profile state are preserved. The worker is replaced and
`extension.manifest` is refreshed; previously captured manifest objects remain snapshots of the old
version. Read `extension.worker` again after upgrading rather than retaining an old worker handle.

`upgrade()` waits for worker replacement and the new manifest, not completion of your migration
handler. Use `expect.poll` to wait for migrated data.

An upgrade requires an explicit `install(path)` and can run only once per test's extension instance.
It tests an unpacked upgrade, not store delivery. A configured translation catalog is applied to
both builds; see [i18n](i18n.md).
