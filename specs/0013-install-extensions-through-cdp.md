# Install extensions through CDP

We use `Extensions.loadUnpacked` instead of the `--load-extension` launch argument shown in
[Playwright's extension tutorial](https://playwright.dev/docs/chrome-extensions). Installing through
CDP allows lazy installation after browser launch, so tests can control when installation happens.

## Metadata and filename validation

Chromium's [unpacked installer](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/extensions/browser/unpacked_installer.cc)
cleans up metadata before loading and indexes static DNR rules afterward. Command-line loading skips
the hard illegal-filename check applied to unpacked loading through CDP; later validation can still
report an install warning. Skipping the hard check does not skip metadata cleanup or DNR indexing.

`_metadata` is not created unconditionally for every unpacked extension. Static DNR rules use it for
compiled rulesets; Chromium also uses it for content-verification files during packaged-extension
installation. See the reserved paths in
[file_util.cc](https://chromium.googlesource.com/chromium/src/+/HEAD/extensions/common/file_util.cc)
and the verification writers in
[sandboxed_unpacker.cc](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/extensions/browser/sandboxed_unpacker.cc).

`CheckForIllegalFilenames` examines immediate files and directories in the extension root, rejecting
names beginning with `_` except `_locales`, `_platform_specific`, and `__MACOSX`. `_metadata` is not
an exception: its presence at check time is sufficient, regardless of its contents. Before this check,
`MaybeCleanupMetadataFolder` removes known verification files and indexed rulesets, then removes the
metadata directory if empty.

Concurrent browsers loading the same extension directory can therefore interfere with metadata
cleanup and creation. One browser recreating `_metadata` between another browser's cleanup and
filename check is a plausible explanation for the Windows CI failure observed on 2026-10-23, not a
confirmed reproduction. Command-line loading avoids this particular hard failure but still shares
the mutable metadata directory. Keep this distinction when investigating parallel installation.
