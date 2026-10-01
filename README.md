<div align="center">
  <a href="https://vitalets.github.io/playwright-webext">
    <img width="128" alt="playwright-webext" src="website/static/img/brand/logo.svg">
  </a>
</div>

<h2 align="center">playwright-webext</h2>
<div align="center">

Browser extensions testing with [Playwright](https://playwright.dev/)

</div>

<div align="center">

[![lint](https://github.com/vitalets/playwright-webext/actions/workflows/lint.yaml/badge.svg)](https://github.com/vitalets/playwright-webext/actions/workflows/lint.yaml)
[![test](https://github.com/vitalets/playwright-webext/actions/workflows/test.yaml/badge.svg)](https://github.com/vitalets/playwright-webext/actions/workflows/test.yaml)
[![npm version](https://img.shields.io/npm/v/playwright-webext)](https://www.npmjs.com/package/playwright-webext)
[![license](https://img.shields.io/npm/l/playwright-webext)](https://github.com/vitalets/playwright-webext/blob/main/LICENSE)

</div>

## Features

- Access your extension’s APIs with the built-in [`extension`](https://vitalets.github.io/playwright-webext/getting-started/writing-tests/) fixture.
- Open [popup](https://vitalets.github.io/playwright-webext/guides/popup/), [options](https://vitalets.github.io/playwright-webext/guides/options/), and
  [side panel](https://vitalets.github.io/playwright-webext/guides/side-panel/) pages.
- Read and write [extension storage](https://vitalets.github.io/playwright-webext/guides/storage/) directly from test.
- Defer [extension installation](https://vitalets.github.io/playwright-webext/basics/configuration/#extensionautoinstall) to prepare the browser state.
- Test [internationalization (i18n)](https://vitalets.github.io/playwright-webext/guides/i18n/) without changing your system language.
- Test [data migrations](https://vitalets.github.io/playwright-webext/guides/migration/) between extension versions.
- Test extension behavior when [disabled](https://vitalets.github.io/playwright-webext/api/extension/#disable), [re-enabled](https://vitalets.github.io/playwright-webext/api/extension/#enable), or
  [uninstalled](https://vitalets.github.io/playwright-webext/guides/uninstall/).

## Documentation

Check out the [documentation website](https://vitalets.github.io/playwright-webext/).

## Motivation

[Playwright's extension guide](https://playwright.dev/docs/chrome-extensions) shows how to launch
browser with an extension, wait for its service worker, and find its ID. That gives you a working
starting point, but leaves you to maintain the setup fixtures and write helpers for extension tasks.

Playwright-webext provides helpers beyond the default guide: storage setup, localization
testing, migrations and much more. These helpers let you focus on your extension's
behavior using familiar Playwright pages, locators, and assertions.

Proceed to [Getting started](https://vitalets.github.io/playwright-webext/getting-started/installation/).

## License

[MIT](https://github.com/vitalets/playwright-webext/blob/main/LICENSE).
