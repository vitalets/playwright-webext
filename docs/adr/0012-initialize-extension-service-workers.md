---
status: proposed
---

# Initialize extension service workers from a prepared build

The required behavior is to run initialization in the Extension Under Test's background service
worker before any extension code, on first installation and every worker restart. Website service
workers are outside this investigation. No implementation approach has been accepted yet.

Investigated on 2026-10-14. The leading proposal is an `extensionInitScript` launch option and a
prepared extension directory reused across tests with identical configuration. Preparing once per
Playwright test worker would avoid copying the entire extension for every test while preserving
separate browser profiles. The option alone does not provide this reuse; preparation needs a lifetime
separate from each `Extension` instance.

## Instrumentation proposal

Change `background.service_worker` from the original entry, such as `background.js`, to a generated
sibling file, such as `pw-background.js`. Preserve the existing worker type and other manifest fields.
Generate a separate `pw-init.js` containing the initialization code, leaving the original worker and
its dependencies unchanged. Generated filenames must avoid collisions with extension files.

For a module worker, the wrapper would contain:

```js
import './pw-init.js';
import './background.js';
```

For a classic worker, the wrapper would contain:

```js
importScripts('./pw-init.js', './background.js');
```

The separate initialization module is necessary because statements placed before a static import
still execute after imported dependencies. The initial proposal assumes synchronous initialization
that does not import the extension's module graph. Asynchronous initialization remains undecided.
[Chrome supports static imports and importScripts, but not dynamic import() in extension service workers](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/basics).

The wrapper changes the worker's URL and the entry reported by `chrome.runtime.getManifest()`.
Placing it beside the original entry preserves the base directory for relative URLs. Directly
instrumenting the original entry would preserve the manifest and worker URL, but requires careful
source editing around directives, imports, and source maps.

## Preparation and performance

The current `ExtensionCopy` copies the full directory and belongs to an individual installer.
Shared preparation would need its own cleanup ownership: closing one extension must not remove files
used by another browser. Keep the prepared directory unchanged until all consumers close. Reusing
files does not require sharing browser contexts or extension storage.

Reuse must distinguish the source build revision, initialization content, locale, and instrumentation
version. A source path alone cannot detect rebuilds. Explicit preparation in a worker-scoped fixture
is a simpler starting point than a persistent disk cache. Run-wide preparation could reduce copying
further, at the cost of coordinating publication and cleanup across processes.

Upgrade tests replace files at the installed path and therefore need a private mutable directory.
They must not modify a shared prepared build. Moving an unpacked extension to a different directory
can also change its ID when the manifest does not supply a fixed key; identity requirements need
verification before choosing the directory lifecycle.

Other possible optimizations are build-time instrumentation, hard-linking unchanged files, and
copy-on-write clones. Hard links require preventing writes through shared files, including source
rebuilds. Node's `COPYFILE_FICLONE` attempts a copy-on-write reflink and falls back to copying; it still
requires directory traversal and is not a portable performance guarantee.
[Node filesystem documentation](https://nodejs.org/api/fs.html#fspromisescopyfilesrc-dest-mode).

CDP does not accept a ZIP or CRX payload for extension installation. `Extensions.loadUnpacked`
accepts an unpacked filesystem path. Extracting an archive once could supply a reusable directory,
but does not remove the filesystem requirement.
[CDP Extensions protocol definition](https://github.com/ChromeDevTools/devtools-protocol/blob/master/pdl/domains/Extensions.pdl).

## Other approaches considered

- **CDP pause, inject, resume:** Arm target auto-attachment before installation, evaluate initialization
  in each paused worker, then resume it. This preserves extension files. However, installed Playwright
  1.62.1 already sends `Runtime.runIfWaitingForDebugger` during worker startup. Cooperation between
  debugger sessions, child-session command routing, and identifying the extension before installation
  returns its ID require experiments. This remains an alternative, not a proven failure.
- **Author-provided test bootstrap:** Explicit initialization in the extension's own build avoids
  harness-side transformation but requires author integration.
- **Upstream Playwright support:** Initialization inside Playwright's worker startup sequence could
  provide tighter integration, but depends on upstream adoption or maintaining a patch.
- **Script-load interception:** Rewriting the worker response is speculative for extension resources.
  Ordinary Playwright routing has service-worker script limitations.
- **Evaluate after the serviceworker event:** Does not guarantee execution before extension code.
  Playwright's existing `addInitScript` covers pages and frames, not service workers.

References: [CDP auto-attachment](https://chromedevtools.github.io/devtools-protocol/tot/Target/#method-setAutoAttach),
[Playwright init scripts](https://playwright.dev/docs/api/class-browsercontext#browser-context-add-init-script),
and [Playwright service-worker routing](https://playwright.dev/docs/service-workers).

## Evidence and remaining verification

A temporary Chromium probe confirmed that a classic wrapper initialized a global before both the
original entry and a script it imported. The same prepared directory loaded into two fresh browser
profiles with the same extension ID. An installation listener observed the initialized value in one
run; this was not a complete installation-event timing test. The probe was stopped before the module
case completed. No product implementation was changed.

Before accepting the design, verify module dependency ordering, cyclic graphs, installation events,
reloads, natural worker termination and restart, and upgrades. Define script input and serialization,
error reporting, asynchronous behavior, configuration scope, cache invalidation, and cleanup.
Benchmark representative extension builds against browser startup and installation costs; no copying
or end-to-end performance measurements were obtained during this investigation.
