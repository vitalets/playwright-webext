---
title: ExtensionStorage
toc_max_heading_level: 3
description: Read, seed, and verify your extension’s stored data.
---

`extension.storage` exposes `local`, `sync`, `session`, and `managed` areas. Calls execute in the
current service worker and return promises. Your extension needs the `storage` permission. Chrome's
quotas and access rules still apply; `managed` storage is read-only, even though the wrapper exposes
the same methods for every area. See [Chrome's storage reference](https://developer.chrome.com/docs/extensions/reference/api/storage).

Storage handles find the current worker for each call, so they continue to work after an upgrade.
They cannot be used when the worker is unavailable, such as after disabling or uninstalling.

The examples below use `local`. The same read methods work with the other available areas.

## Methods

These methods are available on each storage area, except that `managed` only supports reads.

### get

**Call:** `extension.storage.local.get<T>(keys?)`.

**Returns:** `Promise<T>`.

Accepts a key, an array of keys, an object of defaults, `null`, or no argument. Omit the argument or
pass `null` to read all values. Missing keys are omitted unless you supply defaults.

```ts
const allValues = await extension.storage.local.get();
const selected = await extension.storage.local.get(['theme', 'language']);
const settings = await extension.storage.local.get<{ theme: string }>({ theme: 'light' });
```

The optional generic describes the expected shape; it does not validate stored values at runtime.
Without a generic, values are typed as `unknown`.

#### Wait for storage changes

Reads return the current values immediately. Use Playwright's
[`expect.poll`](https://playwright.dev/docs/test-assertions#expectpoll) when your extension writes
asynchronously:

```ts
await expect
  .poll(() => extension.storage.local.get('preferences'))
  .toEqual({ preferences: expect.objectContaining({ colorScheme: 'dark' }) });
```

Import `expect` from `@playwright/test` and use this snippet inside a test requesting `extension`.

### set

**Call:** `extension.storage.local.set<T>(items: Partial<T>)`.

**Returns:** `Promise<void>`.

Writes the supplied keys without replacing other stored values.

```ts
await extension.storage.local.set({ preferences: { colorScheme: 'dark' } });
```

### remove

**Call:** `extension.storage.local.remove<T>(keys: keyof T | Array<keyof T>)`.

**Returns:** `Promise<void>`.

Removes one key or a list of keys.

```ts
await extension.storage.local.remove('obsoleteKey');
await extension.storage.local.remove(['oldTheme', 'oldLanguage']);
```

### clear

**Call:** `extension.storage.local.clear()`.

**Returns:** `Promise<void>`.

Removes every value in the area.

```ts
await extension.storage.session.clear();
```

### getKeys

**Call:** `extension.storage.local.getKeys()`.

**Returns:** `Promise<string[]>`.

Lists keys in the area.

```ts
const keys = await extension.storage.local.getKeys();
```

## Properties

### local

Access the extension's local storage with `extension.storage.local`.

### sync

Access the extension's sync storage with `extension.storage.sync`.

### session

Access the extension's session storage with `extension.storage.session`.

### managed

Read the extension's managed storage with `extension.storage.managed`. This area is read-only.
