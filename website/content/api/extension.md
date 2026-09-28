---
title: Extension
toc_max_heading_level: 3
description: API reference for extension metadata, worker evaluation, pages, and lifecycle controls.
---

The `extension` fixture is available in your tests and lets you open extension pages, run code in the
service worker, access storage, and manage the extension's lifecycle.
The [`extensionW` fixture](../advanced/shared-context.md) provides the same API with a context shared
between tests in a Playwright worker.

## Properties

### context

**Type:** [`BrowserContext`](https://playwright.dev/docs/api/class-browsercontext).

The persistent Chromium context hosting the extension. It is isolated per test for `extension` and
shared within a worker for `extensionW`.

```ts
const page = await extension.context.newPage();
```

### id

**Type:** `string`.

The installed extension's ID. The ID is preserved during [unpacked upgrades](../guides/migration.md).

### manifest

**Type:** `chrome.runtime.ManifestV3`.

A manifest snapshot read through `chrome.runtime.getManifest()` when the extension becomes ready.
Installation, upgrade, and re-enabling refresh the snapshot.

```ts
expect(extension.manifest.version).toBe('1.0.0');
```

### popupUrl

**Type:** `string` (readonly).

The full extension URL of `action.default_popup` from the manifest snapshot. Throws when no popup
is declared or the extension is not ready.

### optionsUrl

**Type:** `string` (readonly).

The full extension URL of `options_ui.page`, falling back to `options_page`, from the manifest
snapshot. Throws when neither is declared or the extension is not ready.

### sidePanelUrl

**Type:** `string` (readonly).

The full extension URL of `side_panel.default_path` from the manifest snapshot. Throws when no
default path is declared or the extension is not ready. Ignores runtime `chrome.sidePanel.setOptions()`
overrides, including per-tab settings.

### worker

**Type:** [`Worker`](https://playwright.dev/docs/api/class-worker).

Looks up the currently running extension service worker on each access. Throws when no worker is
available, including after disabling or uninstalling.
Read it again after an upgrade or enable operation instead of retaining an old handle.

### storage

**Type:** [`ExtensionStorage`](storage.md).

Provides access to `chrome.storage.local`, `sync`, `session`, and the read-only `managed` area through
the current worker. See [ExtensionStorage](storage.md) for methods.

## Methods

### evaluate

**Call:** `extension.evaluate(pageFunction, arg?)`  
**Returns:** `Promise<R>`

Evaluates a function or expression in the current service worker. Follows
[`Worker.evaluate()`](https://playwright.dev/docs/api/class-worker#worker-evaluate), including its
argument serialization and return-value behavior. Functions run outside the test's JavaScript scope;
pass values as the optional argument.

```ts
await extension.evaluate(() => chrome.tabs.create({ url: 'https://example.com' }));
```

Requires a running worker and the permissions needed by the Chrome API being called. A worker has
no page DOM; use a Playwright [`Page`](https://playwright.dev/docs/api/class-page) to interact with extension UI.

### getURL

**Call:** `extension.getURL(path?: string)`  
**Returns:** `string`

Resolves a resource path under `chrome-extension://<id>/`. The default path is `''`; a leading slash
is accepted. Does not emulate dynamic URLs from
`web_accessible_resources` entries with `use_dynamic_url`.

```ts
const url = extension.getURL('settings/advanced.html');
```

### waitForPage

**Call:** `extension.waitForPage(url: string, options?: { timeout?: number; intervals?: number[] })`  
**Returns:** <code>Promise&lt;<a href="https://playwright.dev/docs/api/class-page">Page</a>&gt;</code>

Waits for a page in `extension.context` with the exact resolved URL. Relative paths, including paths
with a leading slash, resolve under the extension URL. Absolute URLs can match any page in the
context. Checks both existing pages and pages that open or navigate later.

```ts
const welcomePage = await extension.waitForPage('welcome.html');
await expect(welcomePage.getByRole('heading', { name: 'Welcome' })).toBeVisible();

const feedbackPage = await extension.waitForPage('https://example.com/uninstalled');
```

Forwards `timeout` and `intervals` to
[`expect.poll`](https://playwright.dev/docs/test-assertions#expectpoll), using its defaults when
omitted. Rejects if no matching page appears before the timeout. Returns once the URL matches;
use locator assertions to check the page's content.

### install

**Call:** `extension.install(path?: string)`  
**Returns:** `Promise<void>`

Installs `extensionPath` when no path is supplied. With a custom path, installs a private copy of
that build so it can later be replaced by `upgrade()`. Relative paths use the same base directory as
[`extensionPath`](../basics/configuration.md#extensionpath).

Waits for the extension worker and refreshes the manifest. It does not wait for all application
startup handlers to finish. Use with [`extensionAutoInstall: false`](../basics/configuration.md#extensionautoinstall)
to control initial installation. Each instance supports one successful installation;
calling `install()` again, including after uninstalling, rejects.

```ts
await extension.install();
```

See [Welcome page](../guides/welcome-page.md) for checking pages opened during automatic installation.

### openPopup

**Call:** `extension.openPopup()`  
**Returns:** <code>Promise&lt;<a href="https://playwright.dev/docs/api/class-page">Page</a>&gt;</code>

Opens `action.default_popup` in a new regular tab and navigates to its extension URL. Throws when the
manifest has no popup declaration.

```ts
const popupPage = await extension.openPopup();
await popupPage.getByRole('button', { name: 'Save' }).click();
await popupPage.close();
```

This hosts the popup document in a tab, not the native toolbar popup. See the
[Popup guide](../guides/popup.md#limitations) for active-tab, focus, and permission differences.

### openOptions

**Call:** `extension.openOptions()`  
**Returns:** <code>Promise&lt;<a href="https://playwright.dev/docs/api/class-page">Page</a>&gt;</code>

Opens `options_ui.page`, falling back to `options_page`, in a new regular tab. Throws when neither
is declared. Ignores `options_ui.open_in_tab` and does not invoke
`chrome.runtime.openOptionsPage()`.

```ts
const optionsPage = await extension.openOptions();
await optionsPage.getByLabel('Theme').selectOption('dark');
await optionsPage.close();
```

See the [Options page guide](../guides/options.md#limitations) for differences from embedded options.

### openSidePanel

**Call:** `extension.openSidePanel()`  
**Returns:** <code>Promise&lt;<a href="https://playwright.dev/docs/api/class-page">Page</a>&gt;</code>

Opens `side_panel.default_path` in a new regular tab and returns it after navigation. Throws before
creating a tab when the manifest has no default path. Ignores runtime side panel configuration.

```ts
const sidePanelPage = await extension.openSidePanel();
await sidePanelPage.getByRole('button', { name: 'Save' }).click();
await sidePanelPage.close();
```

See the [Side panel guide](../guides/side-panel.md#limitations) for differences from the native panel.

### disable

**Call:** `extension.disable()`  
**Returns:** `Promise<void>`

Disables the installed extension and waits for its worker to stop. Worker evaluation and storage
access are unavailable while the extension is disabled.

```ts
await extension.disable();
```

### enable

**Call:** `extension.enable()`  
**Returns:** `Promise<void>`

Enables the installed extension, waits for readiness, and refreshes the manifest. If already enabled,
returns without restarting the worker.

```ts
await extension.disable();
await extension.enable();
```

### upgrade

**Call:** `extension.upgrade()`  
**Returns:** `Promise<void>`

Updates the installed extension with the build at the configured `extensionPath` and reloads it.
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

**Call:** `extension.uninstall()`  
**Returns:** `Promise<void>`

Uninstalls the extension. Subsequent worker and storage operations are unavailable. Cached `id` and
`manifest` values do not prove that the extension is still installed.

```ts
await extension.uninstall();
```

See [Uninstall](../guides/uninstall.md) for checking the feedback page.
