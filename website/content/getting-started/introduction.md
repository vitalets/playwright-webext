---
slug: /
title: Introduction
hide_title: true
description: Playwright fixtures and helpers that make testing browser extensions easier.
---

import ProjectBrand from '@site/src/components/ProjectBrand';

<ProjectBrand />

**playwright-webext** is a set of [Playwright](https://playwright.dev/) fixtures and helpers
that make testing browser extensions easier.

## Features

- Access your extension’s APIs with the built-in [extension](writing-tests.md) fixture.
- Open [popup](../guides/popup.md), [options](../guides/options.md), and
  [side panel](../guides/side-panel.md) pages.
- Read and write [extension storage](../guides/storage.md) directly from test.
- Trigger extension actions by [emulating browser events](../guides/dispatching-events.md).
- Prepare browser state before [extension installation](../basics/configuration.md#extensionautoinstall).
- Check [internationalization (i18n)](../guides/i18n.md) without changing your system language.
- Verify [data migration](../guides/migration.md) between extension versions.
- Test the behavior when extension is [uninstalled](../guides/uninstall.md) or [disabled](../api/extension.md#disable).

See the [complete example](https://github.com/vitalets/playwright-webext/tree/main/example): a TypeScript
extension tested with playwright-webext.

## Motivation

[Playwright's extension guide](https://playwright.dev/docs/chrome-extensions) shows how to launch a
browser with an extension, wait for its service worker, and find its ID. You then need to maintain
that setup and write helpers for extension tasks.

Playwright-webext handles browser setup and extension installation, so you can focus on testing
your extension's functionality using familiar Playwright pages, locators, and assertions.

Proceed to [Getting started](installation.md).
