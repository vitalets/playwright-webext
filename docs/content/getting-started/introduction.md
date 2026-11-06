---
slug: /
title: Introduction
hide_title: true
description: Playwright fixtures and helpers that make testing browser extensions easier.
---

import ProjectBrand from '@site/src/components/ProjectBrand';

<ProjectBrand />

**Playwright-webext** is a set of [Playwright](https://playwright.dev/) fixtures and helpers
that make testing browser extensions easier.

## Features

- Access your extension’s APIs with the built-in [extension](writing-tests.md) fixture.
- Open and interact with the [popup](../guides/popup.md), [options](../guides/options.md), and
  [side panel](../guides/side-panel.md) pages.
- Read and write [extension storage](../guides/storage.md) directly from test.
- Trigger actions by [emulating browser events](../api/extension.md#dispatch).
- Mock [time and timers](../guides/fake-timers.md) in the service worker and extension pages with automatic alarms triggering.
- Check [internationalization (i18n)](../guides/i18n.md) without changing your system language.
- Verify [data migration](../guides/migration.md) between upgrades.
- Inject a custom [init script](../basics/configuration.md#extensioninitscript) into the service worker and all extension pages.
- Install extension [lazily](../basics/configuration.md#extensionautoinstall) to prepare browser state.
- Test the flow when extension is [disabled](../api/extension.md#disable) or [uninstalled](../guides/uninstall.md).

See the [complete example](https://github.com/vitalets/playwright-webext/tree/main/example): a TypeScript
extension tested with playwright-webext.

## Motivation

[Playwright's extension guide](https://playwright.dev/docs/chrome-extensions) shows how to launch a
browser with an extension, wait for its service worker, and find its ID. You then need to maintain
that setup and write helpers for extension tasks.

Playwright-webext handles browser setup and extension installation, so you can focus on testing
your extension's functionality using familiar Playwright pages, locators, and assertions.

Proceed to [Getting started](installation.md).
