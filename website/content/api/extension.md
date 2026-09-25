---
title: Extension
toc_max_heading_level: 3
description: API reference for extension metadata, worker evaluation, pages, and lifecycle controls.
---

Access an `Extension` through the `extension` fixture in your tests.

## Methods

### evaluate

**Call:** `extension.evaluate(pageFunction, arg?)`.

**Returns:** `Promise<R>`.

Evaluates a function or expression in the current service worker. Follows
[`Worker.evaluate()`](https://playwright.dev/docs/api/class-worker#worker-evaluate), including its
argument serialization and return-value behavior. Functions run outside the test's JavaScript scope;
pass values as the optional argument.

```ts
const name = await extension.evaluate(() => chrome.runtime.getManifest().name);
const greeting = await extension.evaluate((key) => chrome.i18n.getMessage(key), 'greeting');
```

Requires a running worker and the permissions needed by the Chrome API being called. A worker has
no page DOM; use a Playwright `Page` to interact with extension UI.

### getURL

**Call:** `extension.getURL(path?: string)`.

**Returns:** `string`.

Resolves a resource path under `chrome-extension://<id>/`. The default path is `''`; a leading slash
is accepted. Requires installation. Does not emulate dynamic URLs from
`web_accessible_resources` entries with `use_dynamic_url`.

```ts
const page = await extension.context.newPage();
await page.goto(extension.getURL('settings/advanced.html'));
```

### install

**Call:** `extension.install(path?: string)`.

**Returns:** `Promise<void>`.

Installs `extensionPath` when no path is supplied. With a custom path, installs a private copy of
that build so it can later be replaced by `upgrade()`. Relative paths use the same base directory as
[`extensionPath`](../basics/configuration.md#extensionpath).

Waits for the extension worker and refreshes the manifest. It does not wait for all application
startup handlers to finish. Use with [`extensionAutoInstall: false`](../basics/configuration.md#extensionautoinstall)
to control initial installation. A successful installation consumes the instance's installation slot;
calling `install()` again, including after uninstalling, rejects.

```ts
await extension.install();
```

See [Welcome page](../guides/welcome-page.md) for checking pages opened during automatic installation.

### openPopup

**Call:** `extension.openPopup()`.

**Returns:** `Promise<Page>`.

Opens `action.default_popup` in a new regular tab and navigates to its extension URL. Throws when the
manifest has no popup declaration. Requires installation.

```ts
const popup = await extension.openPopup();
await popup.getByRole('button', { name: 'Save' }).click();
await popup.close();
```

This hosts the popup document in a tab, not the native toolbar popup. See the
[Popup guide](../guides/popup.md#what-this-tests) for active-tab, focus, and permission differences.

### openOptions

**Call:** `extension.openOptions()`.

**Returns:** `Promise<Page>`.

Opens `options_ui.page`, falling back to `options_page`, in a new regular tab. Throws when neither
is declared. Requires installation. Ignores `options_ui.open_in_tab` and does not invoke
`chrome.runtime.openOptionsPage()`.

```ts
const options = await extension.openOptions();
await options.getByLabel('Theme').selectOption('dark');
await options.close();
```

See the [Options page guide](../guides/options.md#tab-behavior) for differences from embedded options.

### disable

**Call:** `extension.disable()`.

**Returns:** `Promise<void>`.

Disables the installed extension through Chromium's extension management UI, waits for its worker
to stop, and closes the management page. Worker evaluation and storage access are unavailable while
the extension is disabled.

```ts
await extension.disable();
```

### enable

**Call:** `extension.enable()`.

**Returns:** `Promise<void>`.

Enables the installed extension through Chromium's extension management UI, waits for readiness,
and refreshes the manifest. If already enabled, returns without restarting the worker. Closes the
management page afterward.

```ts
await extension.disable();
await extension.enable();
```

### upgrade

**Call:** `extension.upgrade()`.

**Returns:** `Promise<void>`.

Replaces the private old-build copy with the configured `extensionPath` contents and reloads it.
Preserves the extension ID and profile state, waits for worker replacement, and refreshes the
manifest. Requires a prior `install(path)` with a custom path; an extension instance supports one
upgrade. Repeated calls reject.

```ts
await extension.install('./dist-old');
await extension.upgrade();
```

Use this inside a test with automatic installation disabled. See [Migration](../guides/migration.md)
for a complete example, including waiting for data migration.

### uninstall

**Call:** `extension.uninstall()`.

**Returns:** `Promise<void>`.

Calls `chrome.management.uninstallSelf({ showConfirmDialog: false })` from the extension worker and
waits for the worker to stop. Requires a running worker. Subsequent worker and storage operations
are unavailable. Cached `id` and `manifest` values do not prove that the extension is still installed.

```ts
await extension.uninstall();
```

See [Uninstall](../guides/uninstall.md) for checking the feedback page.

## Properties

### context

**Type:** [`BrowserContext`](https://playwright.dev/docs/api/class-browsercontext).

The isolated persistent Chromium context hosting the extension. Available even before installation
when `extensionAutoInstall` is `false`.

```ts
const page = await extension.context.newPage();
await page.goto('https://example.com');
```

### id

**Type:** `string`.

The installed extension's ID. Throws before installation. Paths can affect IDs; a manifest `key`
can provide a stable ID. The ID is preserved during [unpacked upgrades](../guides/migration.md).

### manifest

**Type:** `chrome.runtime.ManifestV3`.

A manifest snapshot read through `chrome.runtime.getManifest()` when the extension becomes ready.
Throws before readiness. Installation, upgrade, and re-enabling refresh the snapshot; an object you
previously captured remains unchanged.

```ts
expect(extension.manifest.version).toBe('1.0.0');
```

### worker

**Type:** [`Worker`](https://playwright.dev/docs/api/class-worker).

Looks up the currently running extension service worker on each access. Throws when no worker is
available, including after disabling or uninstalling. The getter does not restart an idle worker.
Read it again after an upgrade or enable operation instead of retaining an old handle.

### storage

Provides Promise-based access to `chrome.storage.local`, `sync`, `session`, and `managed` through
the current worker. See the [ExtensionStorage](storage.md) for methods and examples.
