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

Access to `chrome.storage.local`.

#### Usage

```ts
const values = await extension.storage.local.get();
```

#### Arguments

None.

#### Returns

`StorageArea`

### sync

Access to `chrome.storage.sync`.

#### Usage

```ts
const values = await extension.storage.sync.get();
```

#### Arguments

None.

#### Returns

`StorageArea`

### session

Access to `chrome.storage.session`.

#### Usage

```ts
const values = await extension.storage.session.get();
```

#### Arguments

None.

#### Returns

`StorageArea`

### managed

Access to `chrome.storage.managed`. This area is read-only.

#### Usage

```ts
const values = await extension.storage.managed.get();
```

#### Arguments

None.

#### Returns

`StorageArea`

## Methods

These methods are available on each storage area, except that `managed` only supports reads.

### get

Reads stored values from the area.

#### Usage

```ts
const allValues = await extension.storage.local.get();
const selected = await extension.storage.local.get(['theme', 'language']);
const settings = await extension.storage.local.get<{ theme: string }>({ theme: 'light' });
```

#### Arguments

- `keys` (`keyof T | Array<keyof T> | Partial<T> | null`, optional) — A key, an array of keys,
  or an object supplying defaults for missing keys. Omit it or pass `null` to read all values.
  Missing keys are omitted unless defaults are supplied.

The optional generic `T` describes the expected shape; it does not validate stored values at runtime.
Without a generic, values are typed as `unknown`.

#### Returns

`Promise<T>` — Resolves to an object containing the selected stored values.

### expect

Creates Playwright's retrying assertions for stored values. Uses
[`expect.poll`](https://playwright.dev/docs/test-assertions#expectpoll) with its configured timeout.

#### Usage

```ts
await extension.storage.local.expect('saved').toEqual(true);
await extension.storage.local.expect(['saved', 'theme']).toEqual({ saved: true, theme: 'dark' });
await extension.storage.local.expect().toEqual({ saved: true, theme: 'dark' });
```

#### Arguments

- `keys` (`string | string[]`, optional) — A string selects that key's value. An array selects
  an object of values, even for a single-element array. Missing keys are omitted; an empty array
  selects an empty object. Omit the argument to select all values.

#### Returns

`ReturnType<typeof expect.poll>` — Playwright's retrying matchers. Chain a matcher and await
the resulting assertion.

### set

Writes the supplied keys without replacing other stored values.

#### Usage

```ts
await extension.storage.local.set({ preferences: { colorScheme: 'dark' } });
```

#### Arguments

- `items` (`Partial<T>`) — Keys and values to write.

#### Returns

`Promise<void>`

### remove

Removes one key or a list of keys.

#### Usage

```ts
await extension.storage.local.remove('obsoleteKey');
await extension.storage.local.remove(['oldTheme', 'oldLanguage']);
```

#### Arguments

- `keys` (`keyof T | Array<keyof T>`) — One key or an array of keys to remove.

#### Returns

`Promise<void>`

### clear

Removes every value in the area.

#### Usage

```ts
await extension.storage.session.clear();
```

#### Arguments

None.

#### Returns

`Promise<void>`

### getKeys

Lists keys in the area.

#### Usage

```ts
const keys = await extension.storage.local.getKeys();
```

#### Arguments

None.

#### Returns

`Promise<string[]>` — Resolves to the keys in the area.
