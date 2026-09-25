---
title: Installation
description: Install playwright-webext and prepare your extension for testing with Playwright.
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

## Prerequisites

You need an **unpacked Chromium Manifest V3 extension with a background service worker**, an ESM
project, and Node.js `^20.19.0 || >=22.12.0`. Your installed Playwright version may require a newer
Node.js version; see [Playwright's system requirements](https://playwright.dev/docs/intro#system-requirements).

## Install

Install the package:

<Tabs groupId="package-manager">
<TabItem value="npm" label="npm" default>

```bash
npm install -D playwright-webext
```

</TabItem>
<TabItem value="yarn" label="Yarn">

```bash
yarn add --dev playwright-webext
```

</TabItem>
<TabItem value="pnpm" label="pnpm">

```bash
pnpm add -D playwright-webext
```

</TabItem>
</Tabs>

If you haven't already installed Playwright Test and its Chromium browser, install them too:

<Tabs groupId="package-manager">
<TabItem value="npm" label="npm" default>

```bash
npm install -D @playwright/test
npx playwright install chromium
```

</TabItem>
<TabItem value="yarn" label="Yarn">

```bash
yarn add --dev @playwright/test
yarn playwright install chromium
```

</TabItem>
<TabItem value="pnpm" label="pnpm">

```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

</TabItem>
</Tabs>
