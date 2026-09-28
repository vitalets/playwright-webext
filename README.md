<div align="center">
  <a href="https://vitalets.github.io/playwright-webext">
    <img width="128" alt="playwright-webext" src="website/static/img/brand/logo.svg">
  </a>
</div>

<h2 align="center">playwright-webext</h2>
<div align="center">

[Playwright](https://playwright.dev/) toolkit for testing browser extensions

</div>

<div align="center">

[![lint](https://github.com/vitalets/playwright-webext/actions/workflows/lint.yaml/badge.svg)](https://github.com/vitalets/playwright-webext/actions/workflows/lint.yaml)
[![test](https://github.com/vitalets/playwright-webext/actions/workflows/test.yaml/badge.svg)](https://github.com/vitalets/playwright-webext/actions/workflows/test.yaml)
[![npm version](https://img.shields.io/npm/v/playwright-webext)](https://www.npmjs.com/package/playwright-webext)
[![license](https://img.shields.io/npm/l/playwright-webext)](https://github.com/vitalets/playwright-webext/blob/main/LICENSE)

</div>

## Features

- A built-in [`extension`](https://vitalets.github.io/playwright-webext/getting-started/writing-tests/) fixture for accessing your extension's APIs.
- Helpers for opening [popup](https://vitalets.github.io/playwright-webext/guides/popup/), [options](https://vitalets.github.io/playwright-webext/guides/options/), and
  [side-panel](https://vitalets.github.io/playwright-webext/guides/side-panel/) pages.
- Helpers for reading and writing [extension storage](https://vitalets.github.io/playwright-webext/guides/storage/).
- Set up browser state [before installing your extension](https://vitalets.github.io/playwright-webext/basics/configuration/#extensionautoinstall).
- Test [internationalization (i18n)](https://vitalets.github.io/playwright-webext/guides/i18n/) without changing your system language.
- Test [data migrations](https://vitalets.github.io/playwright-webext/guides/migration/) between extension versions.
- Test extension [disabling](https://vitalets.github.io/playwright-webext/api/extension/#disable), [re-enabling](https://vitalets.github.io/playwright-webext/api/extension/#enable) and
  [uninstall](https://vitalets.github.io/playwright-webext/guides/uninstall/).

## Documentation

Check out the [documentation](https://vitalets.github.io/playwright-webext/).

## Motivation

[Playwright's extension guide](https://playwright.dev/docs/chrome-extensions) shows how to launch
browser with an extension, wait for its service worker, and find its ID. That gives you a working
starting point, but leaves you to maintain the setup fixtures and write helpers for extension tasks.

Playwright-webext provides helpers beyond the default guide: storage setup, localization
testing, migrations and much more. These helpers let you focus on your extension's
behavior using familiar Playwright pages, locators, and assertions.

Start with [Installation](https://vitalets.github.io/playwright-webext/getting-started/installation/), then [configure your tests](https://vitalets.github.io/playwright-webext/getting-started/configuration/).

## License

[MIT](https://github.com/vitalets/playwright-webext/blob/main/LICENSE).
