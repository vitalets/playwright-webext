---
slug: /
title: Introduction
hide_title: true
description: A Playwright toolkit for testing Chromium browser extensions.
---

import ProjectBrand from '@site/src/components/ProjectBrand';

<ProjectBrand />

**playwright-webext** is a toolkit for testing browser extensions with
[Playwright](https://playwright.dev/). It loads your extension and provides APIs for testing its pages,
background behavior, storage, and lifecycle.

## Features

- A built-in [`extension`](writing-tests.md) fixture for accessing your extension's APIs.
- Helpers for opening [popup](../guides/popup.md), [options](../guides/options.md), and
  [side-panel](../guides/side-panel.md) pages.
- Helpers for reading and writing [extension storage](../guides/storage.md).
- Set up browser state [before installing your extension](../basics/configuration.md#extensionautoinstall).
- Test [internationalization (i18n)](../guides/i18n.md) without changing your system language.
- Test [data migrations](../guides/migration.md) between extension versions.
- Test scenarios when your extension is [disabled](../api/extension.md#disable), [re-enabled](../api/extension.md#enable) and
  [uninstalled](../guides/uninstall.md).

## Motivation

[Playwright's extension guide](https://playwright.dev/docs/chrome-extensions) shows how to launch
browser with an extension, wait for its service worker, and find its ID. That gives you a working
starting point, but leaves you to maintain the setup fixtures and write helpers for extension tasks.

**playwright-webext** provides multiple helpers for extension end-to-end testing,
covering scenarios beyond the guide: preparing stored data, switching translation catalogs,
and upgrading an older build while preserving its data. You can focus your tests on the extension's
behavior while continuing to use Playwright pages, locators, and assertions.

Start with [Installation](installation.md), then [configure your tests](configuration.md).
