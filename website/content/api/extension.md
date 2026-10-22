---
title: Extension
toc_max_heading_level: 3
description: API reference for extension metadata, worker evaluation, pages, and lifecycle controls.
---

The `extension` fixture is available in your tests and lets you open extension pages, run code in the
service worker, access storage, and manage the extension's lifecycle.
`launchWithExtension()` returns the same API for [custom fixtures](../advanced/shared-context.md).

## Properties

### context

The persistent Chromium context hosting the extension. The `extension` fixture creates one per test.
With `launchWithExtension()`, close it through `await extension.close()` to release the browser
and prepared extension directories.

#### Usage

```ts
const page = await extension.context.newPage();
```

#### Arguments

None.

#### Returns

[`BrowserContext`](https://playwright.dev/docs/api/class-browsercontext)

### hasServiceWorker

Returns whether the loaded build declares a service worker, or `undefined` before installation.
A declared worker may currently be stopped or disabled. The value refreshes on install and upgrade.

#### Usage

```ts
expect(extension.hasServiceWorker).toBe(false);
```

#### Returns

`boolean | undefined`

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

### ready

Whether initial installation and manifest acquisition have completed. Starts as `false` with deferred
installation, becomes `true` once ready, and stays `true` while disabled. Successful uninstall or browser
context closure sets it to `false`. It does not query changes made outside this instance.

#### Usage

```ts
if (!extension.ready) await extension.install();
```

#### Returns

`boolean`

### manifest

A resolved manifest snapshot read through `chrome.runtime.getManifest()` when the extension becomes
ready. Uses the service worker when declared, or a temporary extension document otherwise. The
temporary document is closed after reading.
Installation, reload, upgrade, and re-enabling refresh the snapshot.

#### Usage

```ts
expect(extension.manifest.version).toBe('1.0.0');
```

#### Arguments

None.

#### Returns

`chrome.runtime.ManifestV3`

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

### worker

Looks up the currently running extension service worker on each access. Throws when no worker is
available, including after disabling or uninstalling.
Read it again after a reload, upgrade, or enable operation instead of retaining an old handle.

#### Usage

```ts
const worker = extension.worker;
```

#### Arguments

None.

#### Returns

[`Worker`](https://playwright.dev/docs/api/class-worker)

## Methods

### close

Closes the browser context and removes prepared extension directories. Use this to release instances
created with `launchWithExtension()`; the built-in `extension` fixture handles teardown automatically.

Cleanup still runs if closing the context fails. Repeated calls await the same teardown and report
its result.

#### Usage

```ts
await extension.close();
```

#### Returns

`Promise<void>`

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

### dispatch

Emulates a Chrome event in the current service worker. Use it to exercise event handlers without
staging a browser action or another extension build.

#### Usage

```ts
await extension.dispatch('runtime.onInstalled', {
  reason: 'update',
  previousVersion: '1.0',
});
```

Event names are relative to `chrome`, with TypeScript checking the event's listener arguments.
Events can take zero or multiple arguments:

```ts
await extension.dispatch('runtime.onStartup');
await extension.dispatch('storage.onChanged', { theme: { newValue: 'dark' } }, 'local');
```

Dispatch only notifies listeners in the current worker. For example, dispatching `storage.onChanged`
does not change storage. Requires a running worker, an available event with Chromium's internal
`dispatch` method, and arguments supported by Playwright's
[evaluation serialization](https://playwright.dev/docs/evaluating#evaluation-argument).
Callbacks and ports cannot be passed from the test process.

The call does not wait for listeners to register. Use [`waitForFunction()`](#waitforfunction)
before dispatching when listeners may still be registering, such as after a worker reload:

```ts
await extension.waitForFunction(() => chrome.runtime.onInstalled.hasListeners());
await extension.dispatch('runtime.onInstalled', {
  reason: 'update',
  previousVersion: '1.0',
});
```

`hasListeners()` checks whether at least one listener is registered; it does not guarantee that all
application listeners are ready. Dispatch does not wait for asynchronous listener work to finish;
use retrying assertions for resulting changes. Dispatch is not retried, including if a listener
closes the worker.

#### Arguments

- `name` (`ExtensionEventName`) — Chrome event path, such as `runtime.onInstalled` or
  `storage.local.onChanged`.
- `...args` (`ExtensionEventArgs<typeof name>`) — Arguments accepted by the event's listener.

#### Returns

`Promise<void>` — Resolves after dispatch returns. Rejects if the worker or event is unavailable,
or the event does not expose a callable `dispatch` method.

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

### enableDevMode

Enables Chromium's Developer mode for esxtensions. Requires an installed extension, but works while it is disabled.

#### Usage

```ts
await extension.enableDevMode();
```

Resolves when the setting is applied. Usefull when your extension triggers reload internally with `chrome.runtime.reload()`.

#### Arguments

None.

#### Returns

`Promise<void>`

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

### install

Installs `extensionPath` when no path is supplied. With a custom path, prepares a private directory for
that build so it can later be replaced by `upgrade()`.

Refreshes the manifest and waits for the extension worker if one is declared. It does not wait for
all application startup handlers to finish. Use with [`extensionAutoInstall: false`](../basics/configuration.md#extensionautoinstall)
to control initial installation. Each instance supports one successful installation;
calling `install()` again, including after uninstalling, rejects.

#### Usage

```ts
await extension.install();
```

See [Welcome page](../guides/welcome-page.md) for checking pages opened during automatic installation.

#### Arguments

- `path` (`string`, optional) — Build directory to install. Defaults to the configured
  [`extensionPath`](../basics/configuration.md#extensionpath). Explicit relative paths resolve from
  the current working directory. Calling `install()` without a path uses the original build path;
  for the built-in fixture, that path is resolved relative to the Playwright configuration file.

#### Returns

`Promise<void>`

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

### reload

Reloads the enabled extension, refreshes the manifest, and waits for a replacement service worker
if one is declared. Works without a background worker. Enables Chromium's Developer mode so the
unpacked extension can reload. Rejects while the extension is disabled.

#### Usage

```ts
await extension.reload();
```

#### Arguments

None.

#### Returns

`Promise<void>`

### setFileAccess

Controls Chromium's **Allow access to file URLs** setting.

#### Usage

```ts
await extension.setFileAccess(true);
```

#### Arguments

- `allowed` (`boolean`) — Whether to allow access to `file://` URLs.

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

### upgrade

Updates the installed extension with the build at the configured `extensionPath` and reloads it.
Preserves the extension ID and profile state, refreshes the manifest, and waits for a worker if
the new build declares one. Supports upgrades that add or remove a background worker. Requires a
prior `install(path)` with a custom path; an extension instance supports one upgrade. Repeated calls
reject.

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

### waitForFunction

Polls a function or expression in the current service worker until its evaluated result is truthy.
Asynchronous results are awaited on each attempt. Retries while a declared worker is unavailable.
Rejects immediately if the installed manifest declares no worker; evaluation errors also reject the call.

#### Usage

Wait for settings saved asynchronously by the extension (requires the `storage` permission):

```ts
const theme = await extension.waitForFunction(
  async (key) => (await chrome.storage.local.get(key))[key],
  'theme',
  { timeout: 5_000 },
);
expect(theme).toBe('dark');
```

#### Arguments

- `pageFunction` — Function or string expression, with the same serialization as
  [`evaluate()`](#evaluate).
- `arg` — Optional argument passed to the function. Pass `undefined` to supply options without an argument.
- `options` (object, optional) — `timeout` and `intervals`, following
  [`poll()`](utils.md#arguments), including its defaults.

#### Returns

`Promise<Awaited<R>>` — Resolves to the first truthy evaluated value, rather than the `JSHandle`
returned by Playwright's `page.waitForFunction()`. Rejects if the polling timeout expires.

### pollForPage

Waits for a page in `extension.context` matching a URL, regular expression, URL pattern, or predicate.
Relative paths, including paths
with a leading slash, resolve under the extension URL. Absolute URLs can match any page in the
context by exact resolved URL. Checks both existing pages and pages that open or navigate later. If several pages match, the first matching page is returned.

#### Usage

```ts
const welcomePage = await extension.pollForPage('welcome.html');
const feedbackPage = await extension.pollForPage(/feedback/);
```

For pattern matching, pass a `URLPattern` instance or a raw `URLPatternInit` object. This requires
global `URLPattern` support, available in Node.js 24+. The package does not include a polyfill.

```ts
// Match /welcome.html on any host, allowing any query string or hash.
const page = await extension.pollForPage({ pathname: '/welcome.html' });
```

Raw objects are passed to `new URLPattern()` without an implicit base URL. Set `baseURL` to
`extension.getURL()` to scope the pattern to the extension:

```ts
// Match the extension's welcome page, allowing any query string or hash.
const welcomePage = await extension.pollForPage({
  pathname: '/welcome.html',
  baseURL: extension.getURL(),
});
```

For custom matching, pass a predicate that receives the Playwright `Page` instance. The predicate
runs in your test and is polled until it returns `true`; asynchronous results are awaited.

```ts
const welcomePage = await extension.pollForPage(async (page) => (await page.title()) === 'Welcome');
```

#### Arguments

- `urlOrPredicate` (`string | RegExp | URLPattern | URLPatternInit | ((page: Page) => boolean | Promise<boolean>)`) —
  Extension-relative path, absolute URL, regular expression, URL pattern, pattern initialization object,
  or predicate to match.
- `options` (object, optional):
  - `timeout` (`number`, optional) — Polling timeout in milliseconds.
  - `intervals` (`number[]`, optional) — Delays between polling attempts in milliseconds.

Both options follow [`poll()`](utils.md#arguments), including its defaults.

#### Returns

<code>Promise&lt;<a href="https://playwright.dev/docs/api/class-page">Page</a>&gt;</code> — Resolves to the matching page.
Rejects if no matching page appears before the timeout, the predicate throws or rejects, or the
pattern is invalid or unsupported by the runtime.

### pollForPageClosed

Waits until a Playwright page is closed. Also succeeds if the page has already closed, so you can
call it after the action that closes the page.

#### Usage

```ts
const popupPage = await extension.openPopup();
await popupPage.getByRole('button', { name: 'Close' }).click();
await extension.pollForPageClosed(popupPage);
```

#### Arguments

- `page` ([Page](https://playwright.dev/docs/api/class-page)) — Page to wait for.
- `options` (object, optional) — `timeout` and `intervals`, following
  [`poll()`](utils.md#arguments), including its defaults.

#### Returns

`Promise<void>` — Resolves when the page is closed. Rejects if the polling timeout expires.
