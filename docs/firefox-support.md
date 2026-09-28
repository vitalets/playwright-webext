# Firefox support: blockers and evidence

Reviewed on September 27, 2026, against the installed Playwright 1.62.1. Firefox support is deferred under [ADR 0009](adr/0009-defer-firefox-support.md). The blocker is an unimplemented and unverified runtime integration, not a lack of Firefox Manifest V3 support or proof that Firefox testing is impossible.

## What prevents the current package from supporting Firefox

**Launch and installation depend on Chromium.** The [fixture](../src/index.ts) rejects other browsers, the [launcher](../src/launch.ts) calls `chromium.launchPersistentContext`, and the [installer](../src/install.ts) uses `Extensions.loadUnpacked` over CDP. Firefox requires another installation transport because Playwright's [browser CDP session API](https://playwright.dev/docs/api/class-browser#browser-new-browser-cdp-session) is Chromium-only.

**Background access depends on a native service worker.** The [Extension class](../src/extension.ts) exposes a Playwright `Worker`, delegates `evaluate()` to it, and waits for `serviceworker` and worker `close` events. Firefox's MV3 background is an event page, so readiness, evaluation, manifest retrieval, and lifecycle synchronization need another implementation.

**Storage also depends on the worker.** The [storage helpers](../src/storage.ts) execute every operation through the current worker. Installing a Firefox extension alone does not make these helpers work.

**Resource URLs and management operations assume Chromium.** The [Extension class](../src/extension.ts) constructs `chrome-extension://<id>` URLs, and the [management helper](../src/management.ts) operates Chromium's extension details page. Firefox resource origins must be discovered separately, and management operations need their own implementation or explicit exclusion.

The [Playwright extension guide](https://playwright.dev/docs/chrome-extensions) documents Chromium persistent contexts. Removing the fixture's browser guard would not address the dependencies above.

## Firefox MV3 uses an event page

Mozilla documents `background.scripts` and `background.page` for Firefox MV3. These run in a non-persistent background document with a `Window` and DOM, rather than a service worker. Firefox can unload the document while idle and recreate it for an event. `background.service_worker` remains unsupported. See the [manifest reference](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background), [background lifecycle documentation](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Background_scripts), and [open service-worker implementation issue 1573659](https://bugzilla.mozilla.org/show_bug.cgi?id=1573659).

MV3-only scope therefore does not eliminate the difference between Chromium and Firefox backgrounds. Mozilla also documents shared manifests containing both `scripts` and `service_worker`; the harness does not yet have a decision to convert manifests automatically.

## Playwright does not expose the Firefox background as a Page

The current [`backgroundPages()` documentation](https://playwright.dev/docs/api/class-browsercontext#browser-context-background-pages) says it returns an empty list; the corresponding event is no longer emitted. The installed 1.62.1 implementation in `node_modules/playwright-core/lib/coreBundle.js` confirms this. Its Firefox target handler creates pages without an extension-background attachment route.

The bundled Firefox Juggler `TargetRegistry.js` was also inspected inside the local `firefox-1532` browser archive: target discovery follows browser tabs through `gBrowser.tabs` and `TabOpen`. A hidden background document does not become a native Playwright page merely because it is a document. The [upstream target registry](https://github.com/microsoft/playwright/blob/main/browser_patches/firefox/juggler/TargetRegistry.js) is the corresponding source location; that link tracks future changes.

There is also an explicit filter in [JugglerFrameChild](https://github.com/microsoft/playwright/blob/main/browser_patches/firefox/juggler/content/JugglerFrameChild.jsm): `actorCreated()` returns early for `moz-extension://` documents. Opening a popup or options document in a tab therefore also needs investigation; successful installation does not establish native Playwright access to those documents.

Relevant Playwright issues, all closed when reviewed:

- [2874: Enable background page access of browser extension in Firefox](https://github.com/microsoft/playwright/issues/2874) is the exact request. A [maintainer response](https://github.com/microsoft/playwright/issues/2874#issuecomment-788561868) explains that Firefox support requires substantial work and welcomes contributions. Its [closure](https://github.com/microsoft/playwright/issues/2874#issuecomment-1615112984) cites limited engagement, activity, and actionability, not a shipped implementation, and invites a new issue referencing it.
- [2644: Support browser extension loading in Firefox](https://github.com/microsoft/playwright/issues/2644) covers installation.
- [7297: Support running extensions with Firefox](https://github.com/microsoft/playwright/issues/7297) covers connecting Playwright to Firefox launched with an extension.

## Raw WebDriver BiDi does not resolve direct background access

Firefox can install extensions through `webExtension.install`, but installation and script-target access are separate capabilities. See Mozilla's [BiDi extension documentation](https://firefox-source-docs.mozilla.org/remote/webdriver-bidi/Extensions.html).

[Mozilla issue 1755014: MessageHandler support for webextension contexts](https://bugzilla.mozilla.org/show_bug.cgi?id=1755014) remains open. The [message-handler context filter](https://searchfox.org/firefox-main/source/remote/shared/messagehandler/transports/BrowsingContextUtils.sys.mjs) references this missing support. [Issue 1903272](https://bugzilla.mozilla.org/show_bug.cgi?id=1903272) deliberately suppresses extension-background browsing-context events; its reproduction names `_generated_background_page.html`. A [later maintainer explanation](https://bugzilla.mozilla.org/show_bug.cgi?id=2048133#c4) also describes extension contexts lacking a navigable ID.

Consequently, discovering a background realm with `script.getRealms` and passing it to `script.evaluate` is not an established bypass: Firefox must first expose that extension context.

There is a narrower possibility to investigate. Firefox added parent-process browser-internal evaluation in [issue 1944570](https://bugzilla.mozilla.org/show_bug.cgi?id=1944570), with [remote system access](https://firefox-source-docs.mozilla.org/remote/Security.html#system-access). This might enable an internal bridge, but it is not direct extension-background support. No such bridge was prototyped here, and a parent-process extension proxy must not be assumed to be the background's actual JavaScript `Window`.

## What playwright-webextext demonstrates

Inspected [ueokande/playwright-webextext](https://github.com/ueokande/playwright-webextext) at commit `834f5b98e6a867927c91a7e17006807f0417649b`:

1. Its [launch overrides](https://github.com/ueokande/playwright-webextext/blob/834f5b98e6a867927c91a7e17006807f0417649b/src/firefox_overrides.ts) add `--start-debugger-server <port>` and enable Firefox DevTools remote debugging without a connection prompt.
2. Its [browser wrapper](https://github.com/ueokande/playwright-webextext/blob/834f5b98e6a867927c91a7e17006807f0417649b/src/firefox_browser.ts) launches through normal Playwright APIs, then installs the add-ons. The persistent-context path also patches profile permissions for MV3 builds with a Gecko ID.
3. Its [remote client](https://github.com/ueokande/playwright-webextext/blob/834f5b98e6a867927c91a7e17006807f0417649b/src/firefox_remote.ts), adapted from Mozilla's `web-ext`, uses Firefox DevTools RDP: `getRoot`, then the returned `addonsActor`, then `installTemporaryAddon` with a local path. This is a separate connection from Playwright and from WebDriver BiDi.
4. Its [protocol types](https://github.com/ueokande/playwright-webextext/blob/834f5b98e6a867927c91a7e17006807f0417649b/src/firefox_types.ts) contain installation, enumeration, and reload operations, with no background evaluation API. Its [Firefox test](https://github.com/ueokande/playwright-webextext/blob/834f5b98e6a867927c91a7e17006807f0417649b/tests/firefox.test.ts) asserts content-script changes to a normal page.

This is source evidence for an installation approach, not a runtime validation against this package's current Playwright version. Its profile-permission workaround also needs revalidation before reuse.

## Can about:addons expose the installation API?

Firefox's internal API exists. The [about:addons implementation](https://github.com/mozilla-firefox/firefox/blob/main/toolkit/mozapps/extensions/content/aboutaddons.mjs) imports `AddonManager` through `ChromeUtils.importESModule`. The [about:debugging installation action](https://github.com/mozilla-firefox/firefox/blob/main/devtools/client/aboutdebugging/src/actions/debug-targets.js) calls `AddonManager.installTemporaryAddon(file)`, where `file` is an `nsIFile` for the unpacked directory or package. The visible temporary-install button uses a [native XPCOM file picker](https://github.com/mozilla-firefox/firefox/blob/main/devtools/client/aboutdebugging/src/modules/extensions-helper.js), rather than an HTML file input.

The unresolved step is evaluating code in that privileged page through Playwright. A local probe used Playwright 1.62.1 with its matching Firefox 153.0 build (`firefox-1538`), headless, in a fresh persistent profile:

- A control `data:text/html,control` page navigated and returned its location through `page.evaluate()`.
- Both `about:addons` and `about:debugging#/runtime/this-firefox` timed out after five seconds even with `waitUntil: 'commit'`. Playwright's frame URL remained `about:blank`.
- A separate evaluation attempt after each navigation timeout also exceeded a five-second deadline. Thus the failure was not just waiting for the page's `load` event.

The probe was repeated in headed Firefox 153.0 using `firefox.launchPersistentContext(profileDirectory, { headless: false })` with an explicit, fresh profile directory. The control page again succeeded. Both internal pages exceeded a 15-second navigation timeout and a separate five-second evaluation deadline, with Playwright's frame URL still at `about:blank`. The browser was closed and the disposable profile removed afterward.

An earlier probe against cached Firefox 151.0 also timed out on both internal pages, using a 15-second navigation timeout. These experiments did not reach the installation API, so they establish that the straightforward `page.goto()` plus `page.evaluate()` route did not work in either headed or headless persistent contexts. They do not prove that every privileged automation route is impossible; browser-internal protocol bridges were not tested.

## Routes to investigate before reconsidering support

**Playwright plus Firefox DevTools RDP** is a plausible integration. Mozilla's [extension debugging guide](https://extensionworkshop.com/documentation/develop/debugging/#debugging-background-scripts) demonstrates access to actual background objects and functions. The [extension descriptor actor](https://searchfox.org/firefox-main/source/devtools/server/actors/descriptors/webextension.js) and [Web Console remoting documentation](https://firefox-source-docs.mozilla.org/devtools-user/web_console/remoting/index.html) provide implementation references. Debugger attachment can keep an event page alive, so lifecycle effects must be measured.

**An extension-page bridge** is another candidate: [`runtime.getBackgroundPage()`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/getBackgroundPage) returns the background `Window` to privileged extension pages and wakes a stopped event page. It does not itself provide arbitrary Playwright evaluation in that realm; private browsing and access to lexical variables also impose limits.

Before changing the support claim, a prototype must demonstrate automatic installation, native Playwright page access, cleanup, and the chosen background API against the actual bundled Firefox. Background evaluation would need defined argument/result serialization, error handling, and behavior across event-page restarts. The first supported subset, including which lifecycle and storage operations it exposes, remains a product decision. The runtime experiments above tested privileged-page access only; no working installation or background-evaluation adapter was produced.
