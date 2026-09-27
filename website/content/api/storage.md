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

## Properties

### local

**Type:** `StorageArea`.

### sync

**Type:** `StorageArea`.

### session

**Type:** `StorageArea`.

### managed

**Type:** `StorageArea`. This area is read-only.

## Methods

These methods are available on each storage area, except that `managed` only supports reads.

### get

**Call:** `extension.storage.local.get<T>(keys?)`  
**Returns:** `Promise<T>`

Accepts a key, an array of keys, an object of defaults, `null`, or no argument. Omit the argument or
pass `null` to read all values. Missing keys are omitted unless you supply defaults.

```ts
const allValues = await extension.storage.local.get();
const selected = await extension.storage.local.get(['theme', 'language']);
const settings = await extension.storage.local.get<{ theme: string }>({ theme: 'light' });
```

The optional generic describes the expected shape; it does not validate stored values at runtime.
Without a generic, values are typed as `unknown`.

### expect

**Call:** `extension.storage.local.expect(key?: string)`

Returns Playwright's retrying assertions for a key's value. Chain a matcher and await the assertion.
Omit the key or pass `undefined` to assert against all values in the storage area.
Uses [`expect.poll`](https://playwright.dev/docs/test-assertions#expectpoll) with its configured
timeout, so you can assert values written asynchronously. A missing key has the value `undefined`.

```ts
await extension.storage.local.expect('saved').toEqual(true);
await extension.storage.local.expect('theme').not.toEqual('light');
await extension.storage.local.expect().toEqual({ saved: true, theme: 'dark' });
await extension.storage.local
  .expect('preferences')
  .toEqual(expect.objectContaining({ colorScheme: 'dark' }));
```

Import `expect` from `@playwright/test` when using matchers such as `expect.objectContaining`.

### set

**Call:** `extension.storage.local.set<T>(items: Partial<T>)`  
**Returns:** `Promise<void>`

Writes the supplied keys without replacing other stored values.

```ts
await extension.storage.local.set({ preferences: { colorScheme: 'dark' } });
```

### remove

**Call:** `extension.storage.local.remove<T>(keys: keyof T | Array<keyof T>)`  
**Returns:** `Promise<void>`

Removes one key or a list of keys.

```ts
await extension.storage.local.remove('obsoleteKey');
await extension.storage.local.remove(['oldTheme', 'oldLanguage']);
```

### clear

**Call:** `extension.storage.local.clear()`  
**Returns:** `Promise<void>`

Removes every value in the area.

```ts
await extension.storage.session.clear();
```

### getKeys

**Call:** `extension.storage.local.getKeys()`  
**Returns:** `Promise<string[]>`

Lists keys in the area.

```ts
const keys = await extension.storage.local.getKeys();
```
