---
slug: /
title: Introduction
hide_title: true
description: A Playwright toolkit for testing Chromium browser extensions.
---

import ProjectBrand from '@site/src/components/ProjectBrand';

<ProjectBrand />

`playwright-webext` is a toolkit for testing browser extensions with Playwright. It automaically loads your
extension and provides APIs for interacting with extension pages,
background code, and storage, as well as installing, updating, and uninstalling the extension.

## What you can test

- Pages your extension opens, including its [welcome page](../guides/welcome-page.md),
  [popup](../guides/popup.md), and [options page](../guides/options.md).
- Background behavior and [saved settings](../api/storage.md).
- [Translations](../guides/i18n.md).
- [Settings after an upgrade](../guides/migration.md) and
  [uninstall behavior](../guides/uninstall.md).

Start with [Installation](installation.md), then [configure your tests](configuration.md).
