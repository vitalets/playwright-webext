---
slug: /
title: Introduction
hide_title: true
description: A Playwright toolkit for testing Chromium browser extensions.
---

import ProjectBrand from '@site/src/components/ProjectBrand';

<ProjectBrand />

**playwright-webext** is a toolkit for testing browser extensions with
[Playwright](https://playwright.dev/). It provides ready-to-use APIs for testing extension pages, background behavior, storage, migrations, i18n, and much more.

## Features

- Access your extension’s APIs with the built-in [`extension`](writing-tests.md) fixture.
- Open [popup](../guides/popup.md), [options](../guides/options.md), and
  [side panel](../guides/side-panel.md) pages.
- Read and write [extension storage](../guides/storage.md).
- Defer [extension installation](../basics/configuration.md#extensionautoinstall) to prepare the browser state first.
- Test [internationalization (i18n)](../guides/i18n.md) without changing your system language.
- Test [data migrations](../guides/migration.md) between extension versions.
- Test extension behavior when [disabled](../api/extension.md#disable), [re-enabled](../api/extension.md#enable), or
  [uninstalled](../guides/uninstall.md).

## Motivation

[Playwright's extension guide](https://playwright.dev/docs/chrome-extensions) shows how to launch
browser with an extension, wait for its service worker, and find its ID. That gives you a working
starting point, but leaves you to maintain the setup fixtures and write helpers for extension tasks.

Playwright-webext provides helpers beyond the default guide: storage setup, localization
testing, migrations and much more. These helpers let you focus on your extension's
behavior using familiar Playwright pages, locators, and assertions.

Proceed to [Getting started](installation.md).
