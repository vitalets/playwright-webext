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

The persistent Chromium context hosting the extension. It is isolated per test for `extension` and
shared within a worker for `extensionW`.

#### Usage

```ts
const page = await extension.context.newPage();
```

#### Arguments

None.

#### Returns

[`BrowserContext`](https://playwright.dev/docs/api/class-browsercontext)

### id

The installed extension's ID. The ID is preserved during [unpacked upgrades](../guides/migration.md).

#### Usage

```ts
const extensionId = extension.id;
```

#### Arguments

None.

#### Returns

`string`

### manifest

A manifest snapshot read through `chrome.runtime.getManifest()` when the extension becomes ready.
Installation, upgrade, and re-enabling refresh the snapshot.

#### Usage

```ts
expect(extension.manifest.version).toBe('1.0.0');
```

#### Arguments

None.

#### Returns

`chrome.runtime.ManifestV3`

### popupUrl

The full extension URL of `action.default_popup` from the manifest snapshot. Throws when no popup
is declared or the extension is not ready.

#### Usage

```ts
const popupUrl = extension.popupUrl;
```

#### Arguments

None.

#### Returns

`string` (readonly)

### optionsUrl

The full extension URL of `options_ui.page`, falling back to `options_page`, from the manifest
snapshot. Throws when neither is declared or the extension is not ready.

#### Usage

```ts
const optionsUrl = extension.optionsUrl;
```

#### Arguments

None.

#### Returns

`string` (readonly)

### sidePanelUrl

The full extension URL of `side_panel.default_path` from the manifest snapshot. Throws when no
default path is declared or the extension is not ready. Ignores runtime `chrome.sidePanel.setOptions()`
overrides, including per-tab settings.

#### Usage

```ts
const sidePanelUrl = extension.sidePanelUrl;
```

#### Arguments

None.

#### Returns

`string` (readonly)

### worker

Looks up the currently running extension service worker on each access. Throws when no worker is
available, including after disabling or uninstalling.
Read it again after an upgrade or enable operation instead of retaining an old handle.

#### Usage

```ts
const worker = extension.worker;
```

#### Arguments

None.

#### Returns

[`Worker`](https://playwright.dev/docs/api/class-worker)

### storage

Provides access to `chrome.storage.local`, `sync`, `session`, and the read-only `managed` area through
the current worker. See [ExtensionStorage](storage.md) for methods.

#### Usage

```ts
await extension.storage.local.set({ theme: 'dark' });
```

#### Arguments

None.

#### Returns

[`ExtensionStorage`](storage.md)

## Methods

### evaluate

Evaluates a function or expression in the current service worker. Follows
[`Worker.evaluate()`](https://playwright.dev/docs/api/class-worker#worker-evaluate), including its
argument serialization and return-value behavior. Functions run outside the test's JavaScript scope;
pass values as the optional argument.

#### Usage

```ts
await extension.evaluate(() => chrome.tabs.create({ url: 'https://example.com' }));
```

Requires a running worker and the permissions needed by the Chrome API being called. A worker has
no page DOM; use a Playwright [`Page`](https://playwright.dev/docs/api/class-page) to interact with extension UI.

#### Arguments

- `pageFunction` — Function or string expression to evaluate. See
  [`Worker.evaluate()`](https://playwright.dev/docs/api/class-worker#worker-evaluate).
- `arg` — Optional argument passed to the function, using Playwright's
  [evaluation argument serialization](https://playwright.dev/docs/evaluating#evaluation-argument).

#### Returns

`Promise<R>` — Resolves to the evaluated result, awaiting it if it is a promise.

### getURL

Resolves a resource path under `chrome-extension://<id>/`. A leading slash is accepted.
Does not emulate dynamic URLs from
`web_accessible_resources` entries with `use_dynamic_url`.

#### Usage

```ts
const url = extension.getURL('settings/advanced.html');
```

#### Arguments

- `path` (`string`, optional) — Resource path inside the extension. Defaults to `''`.

#### Returns

`string` — The fully qualified extension resource URL.

### waitForPage

Waits for a page in `extension.context` with the exact resolved URL. Relative paths, including paths
with a leading slash, resolve under the extension URL. Absolute URLs can match any page in the
context. Checks both existing pages and pages that open or navigate later.

#### Usage

```ts
const welcomePage = await extension.waitForPage('welcome.html');
const feedbackPage = await extension.waitForPage('https://example.com/uninstalled');
```

Returns once the URL matches; use locator assertions to check the page's content.

#### Arguments

- `url` (`string`) — Extension-relative path or absolute URL to match.
- `options` (object, optional):
  - `timeout` (`number`, optional) — Polling timeout in milliseconds.
  - `intervals` (`number[]`, optional) — Delays between polling attempts in milliseconds.

Both options follow [`waitUntil()`](utils.md#arguments), including its defaults.

#### Returns

<code>Promise&lt;<a href="https://playwright.dev/docs/api/class-page">Page</a>&gt;</code> — Resolves to the matching page.
Rejects if no matching page appears before the timeout.

### install

Installs `extensionPath` when no path is supplied. With a custom path, installs a private copy of
that build so it can later be replaced by `upgrade()`.

Waits for the extension worker and refreshes the manifest. It does not wait for all application
startup handlers to finish. Use with [`extensionAutoInstall: false`](../basics/configuration.md#extensionautoinstall)
to control initial installation. Each instance supports one successful installation;
calling `install()` again, including after uninstalling, rejects.

#### Usage

```ts
await extension.install();
```

See [Welcome page](../guides/welcome-page.md) for checking pages opened during automatic installation.

#### Arguments

- `path` (`string`, optional) — Build directory to install. Defaults to the configured
  [`extensionPath`](../basics/configuration.md#extensionpath). Relative paths resolve from the
  Playwright configuration file's directory, or the current working directory when no config file
  is used.

#### Returns

`Promise<void>`

### openPopup

Opens `action.default_popup` in a new regular tab and navigates to its extension URL. Throws when the
manifest has no popup declaration.

#### Usage

```ts
const popupPage = await extension.openPopup();
```

This hosts the popup document in a tab, not the native toolbar popup. See the
[Popup guide](../guides/popup.md#limitations) for active-tab, focus, and permission differences.

#### Arguments

None.

#### Returns

<code>Promise&lt;<a href="https://playwright.dev/docs/api/class-page">Page</a>&gt;</code>

### openOptions

Opens `options_ui.page`, falling back to `options_page`, in a new regular tab. Throws when neither
is declared. Ignores `options_ui.open_in_tab` and does not invoke
`chrome.runtime.openOptionsPage()`.

#### Usage

```ts
const optionsPage = await extension.openOptions();
```

See the [Options page guide](../guides/options.md#limitations) for differences from embedded options.

#### Arguments

None.

#### Returns

<code>Promise&lt;<a href="https://playwright.dev/docs/api/class-page">Page</a>&gt;</code>

### openSidePanel

Opens `side_panel.default_path` in a new regular tab and returns it after navigation. Throws before
creating a tab when the manifest has no default path. Ignores runtime side panel configuration.

#### Usage

```ts
const sidePanelPage = await extension.openSidePanel();
```

See the [Side panel guide](../guides/side-panel.md#limitations) for differences from the native panel.

#### Arguments

None.

#### Returns

<code>Promise&lt;<a href="https://playwright.dev/docs/api/class-page">Page</a>&gt;</code>

### disable

Disables the installed extension and waits for its worker to stop. Worker evaluation and storage
access are unavailable while the extension is disabled.

#### Usage

```ts
await extension.disable();
```

#### Arguments

None.

#### Returns

`Promise<void>`

### enable

Enables the installed extension, waits for readiness, and refreshes the manifest. If already enabled,
returns without restarting the worker.

#### Usage

```ts
await extension.disable();
await extension.enable();
```

#### Arguments

None.

#### Returns

`Promise<void>`

### upgrade

Updates the installed extension with the build at the configured `extensionPath` and reloads it.
Preserves the extension ID and profile state, waits for worker replacement, and refreshes the
manifest. Requires a prior `install(path)` with a custom path; an extension instance supports one
upgrade. Repeated calls reject.

#### Usage

```ts
await extension.install('./dist-old');
await extension.upgrade();
```

Use this inside a test with automatic installation disabled. See [Migration](../guides/migration.md)
for a complete example, including waiting for data migration.

#### Arguments

None.

#### Returns

`Promise<void>`

### uninstall

Uninstalls the extension. Subsequent worker and storage operations are unavailable. Cached `id` and
`manifest` values do not prove that the extension is still installed.

#### Usage

```ts
await extension.uninstall();
```

See [Uninstall](../guides/uninstall.md) for checking the feedback page.

#### Arguments

None.

#### Returns

`Promise<void>`
