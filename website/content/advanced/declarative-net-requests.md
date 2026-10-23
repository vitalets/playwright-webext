---
title: Declarative net requests
description: Test extensions with static network rules without shared metadata conflicts.
---

Extensions can use [`declarativeNetRequest`](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest)
to block, redirect, or modify network requests.
If your manifest declares static rules in
[`declarative_net_request.rule_resources`](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest#manifest),
playwright-webext automatically loads each extension instance from a private temporary directory.
No extra configuration is needed to run these tests in parallel.

Keep the source build available and avoid rebuilding it while tests are running: unchanged resources
are linked into the temporary directory. Read [`extension.id`](../api/extension.md#id) after
installation rather than hard-coding an ID. Without a manifest `key`, the temporary path can produce
a different ID for each instance.

This preparation also applies to rulesets disabled by default. A DNR permission alone, or using only
dynamic rules, does not trigger it. To inspect the directory used for installation, read
[`extension.loadedPath`](../api/extension.md#loadedpath).

<details>
<summary>Under the hood</summary>

Chromium stores compiled static rules in an `_metadata` directory inside the loaded extension.
Before loading, it cleans up previous metadata; afterward, it writes the compiled rules. Browsers
sharing the same extension directory can therefore clear or overwrite each other's metadata.

One possible symptom is:

```text
Cannot load extension with file or directory name _metadata.
Filenames starting with "_" are reserved for use by the system.
```

This can happen if one browser recreates `_metadata` between another browser's cleanup and filename
check. The CLI `--load-extension` approach skips this hard failure, but still shares the metadata.
playwright-webext installs through CDP to support lazy installation.

To isolate metadata from the first load, the package writes a manifest and copies static rule files
into a private directory, excluding any source `_metadata`. Other resources are linked. This happens
even with one test worker, since a test can open multiple browsers. The fixture removes its private
directory during teardown; with `launchWithExtension()`, call `extension.close()`.

</details>
