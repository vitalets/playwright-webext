# Isolate extension directories containing static DNR rules

Always prepare a private directory for each extension instance whose manifest declares a nonempty
`declarative_net_request.rule_resources` array, including disabled rulesets. Reuse the existing
`PreparedExtensionDir` machinery before the first installation. This decision is accepted; the
implementation uses the shared extension installer.

Chromium cleans metadata before loading an extension and writes compiled static DNR rules into the
loaded directory. As described in [ADR 0013](0013-install-extensions-through-cdp.md), concurrent
browsers sharing that directory can interfere with these operations. Successful installation does
not establish that shared metadata is safe: another browser can subsequently clean or rewrite it.
The reported filename error is one possible symptom; additional DNR failures remain a risk rather
than a reproduced finding.

Preparing a directory only after the `_metadata` error would leave successful installations sharing
mutable files. Retrying the same path also repeats cleanup against another browser's metadata.
Proactive isolation addresses ownership of these files instead of depending on a particular error.
Switching back to CLI loading would lose lazy installation and would not isolate metadata.

## Scope and consequences

Each instance gets a real private root and its own generated metadata. Existing preparation copies
static rule files and writes the manifest, links unchanged resources, and excludes source `_metadata`.
Never delete or modify source metadata as part of this change.

The new condition depends on declared static rulesets, not DNR permission, enabled status, or existing
metadata. Extensions without static rules retain direct loading unless another existing preparation
condition applies. Dynamic-only DNR extensions do not need this additional condition.

Without a manifest `key`, a private installation path can change the extension ID between instances.
Accept this existing consequence of prepared directories; preserve any supplied key without
synthesizing one. The prepared path remains stable within an instance, including supported upgrades.
Automatic preparation must not itself grant upgrade eligibility, which still requires an explicit
`extension.install(path)` call.

## Deferred optimization

An explicit exclusive-access opt-out could allow direct loading when the extension author guarantees
that no other browser uses the source directory for the entire browser lifetime. Do not infer this
from `workers: 1`: one test can launch multiple browsers, worker-scoped browsers can overlap, and
separate test runs can share a build. Defer this optimization until preparation cost justifies it;
it must not bypass preparation needed for localization, init scripts, or upgrades.

## Implementation plan

1. Add manifest inspection for a nonempty `declarative_net_request.rule_resources` array in
   `src/manifest.ts`. Parse the manifest rather than searching for a permission or substring. Cover
   absent and empty arrays, disabled static rulesets, and permission-only manifests.
2. Extend `ExtensionInstaller.resolveInstallPath` in `src/install.ts` with the static-rules condition.
   Inspect the selected source when installation is requested, preserving lazy installation. Existing
   custom-path, locale, and init-script preparation can short-circuit the additional inspection.
   Both fixture installation and `launchWithExtension` already use this installer.
3. Reuse `prepareDirectory` and its existing ownership and cleanup lifecycle. Preserve the same private
   path on retries and upgrades. Keep current upgrade eligibility and error propagation behavior.
4. Add regression coverage using a temporary source fixture: install the same static-DNR build into
   two live browsers, assert distinct loaded roots and real copied rule files, and verify actual
   network-rule behavior in both. Keep the first browser open while loading and closing the second;
   verify the first still works and source metadata is untouched. Use local HTTP responses so the
   behavior test does not depend on external services or reproducing a timing race.
5. Cover a source with preexisting metadata, an initially disabled ruleset enabled after installation,
   cleanup of only owned directories, and the direct-load path for a build without static rules.
   Exercise automatic and lazy installation and rerun existing launch, reload, enable/disable,
   localization, init-script, and upgrade coverage. Include ID preservation within an instance and
   preservation of an explicit manifest key.
6. Add a concise `CHANGELOG.md` entry when implementing the behavior. Document the private-directory
   behavior and its ID consequence in the relevant public installation documentation, following the
   writing-docs skill.
7. Run `npm run prettier`, `npm run tsc`, ESLint on changed TypeScript files, and focused tests. Run
   the suite with two workers on Windows and Linux; repeat the concurrency regression on Windows to
   check the original environment. Run documentation checks if public website content changes.
