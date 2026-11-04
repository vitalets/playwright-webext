# Playwright worker clock prototype

The worker uses a vendored copy of Playwright's injected clock, replacing Sinon.
Pages continue to use the consumer's public `BrowserContext.clock` API. The engines
may differ across Playwright versions; exact cross-context synchronization is not promised.

## Source and build

`src/clock/worker-clock/from-playwright/clock.ts` retains the upstream implementation, with a local provenance comment added below the copyright:
https://github.com/microsoft/playwright/blob/0ea36910324ed8aa2a5f460317cbd35881ee88d4/packages/injected/src/clock.ts

Its upstream copyright and license notice are retained in the source and bundle.
The vendored directory is excluded from project formatting, linting, and type checking
so upstream diffs remain reviewable. The adjacent `utilityScript.d.ts` contains only
the upstream Builtins type from the same commit. The type-only import is removed by esbuild.
`src/clock/worker-clock/playwright-wrapper.ts` contains the typed worker adapter and is bundled
after the upstream engine. Its declared engine boundary keeps upstream types isolated;
the Node-side controls derive their type from the adapter.
`npm run build:clock` produces the injected bundle without downloading anything.
To update, replace the source from a chosen commit, update this reference, rebuild,
and run the clock tests against the supported Playwright versions.

## Adapter decisions

- Keep `extension.clock` and its options unchanged.
- Install before application code, for both module and classic workers.
- Select worker APIs explicitly; do not add animation-frame or idle-callback APIs.
- Fixed-date mode mocks Date, Intl and Temporal when available, leaving timers native.
- Full mode also mocks timers, performance, event timestamps and AbortSignal.timeout.
- Restore AbortSignal.timeout immediately in fixed-date mode: upstream creates this
  shim even when it is excluded from `toFake`.
- Pause the controller before uninstalling and restore the event timestamp and
  AbortSignal.timeout descriptors that upstream uninstall does not restore.
- Preserve current reload/upgrade behavior: worker time resets to configured time.
  Pages still inherit clock history through Playwright.

## Remaining boundaries

Commands are dispatched independently to page and worker event loops. Sharing an
engine does not impose ordering between those event loops. Browser-managed APIs
such as chrome.alarms are not virtualized by this adapter.

The upstream engine lazily creates a MessageChannel to yield between callbacks;
its ports remain until the worker is destroyed. Lifecycle cleanup currently runs
immediately before worker reload, upgrade or uninstall.
