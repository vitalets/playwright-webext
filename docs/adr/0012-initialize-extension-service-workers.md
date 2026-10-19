# Initialize extension service workers from a prepared build

Proposal — not accepted or implemented.

Investigated on 2026-10-14. Not implemented; no approach has been accepted.

The goal is to run initialization before extension code on installation and every background-worker
restart. Evaluating after the `serviceworker` event is too late to guarantee this ordering.

## Leading proposal

Prepare a build with a generated sibling worker entry that loads initialization before the original
entry. Use separate static imports for module workers and `importScripts()` for classic workers;
placing statements before a static import does not make them execute before imported dependencies.
Preserve worker type and relative-URL resolution, and avoid generated filename collisions.

This changes the worker URL and loaded manifest. Editing the original entry instead would preserve
both, but requires handling directives, imports, and source maps. The proposal assumes synchronous
initialization that does not import the extension's module graph; asynchronous behavior is undecided.

Reuse an immutable prepared directory across tests with separate browser profiles. Preparation needs
its own lifetime so closing one extension cannot delete another's files. Any reuse must distinguish
source revisions, initialization content, locale, and instrumentation version. Upgrades need private
mutable copies. Moving builds may change path-derived extension IDs.

## Alternatives

- CDP pause/inject/resume preserves extension files, but cooperation with Playwright's worker startup
  and routing commands to child sessions needs experiments. It has not been ruled out.
- An author-provided bootstrap avoids harness-side transformation but requires build integration.
- Upstream Playwright support could integrate initialization into worker startup.

## Evidence and next checks

A temporary probe confirmed initialization before a classic worker entry and its imported script.
Two fresh profiles loaded the same prepared directory with the same extension ID. The module-worker
probe did not complete; installation-event timing was not fully tested. No performance measurements
were obtained.

Before accepting a design, verify module dependency ordering and cycles, installation events,
reloads, natural worker restarts, upgrades, and identity. Define script serialization, error handling,
asynchronous behavior, configuration scope, invalidation, and cleanup. Benchmark preparation against
browser startup before adding caching complexity.

References: [Chrome worker imports](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/basics),
[CDP auto-attachment](https://chromedevtools.github.io/devtools-protocol/tot/Target/#method-setAutoAttach),
and [Playwright init scripts](https://playwright.dev/docs/api/class-browsercontext#browser-context-add-init-script).
