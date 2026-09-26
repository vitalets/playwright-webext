<div align="center">
  <img width="128" alt="playwright-webext" src="website/static/img/brand/logo.svg">
</div>

<h2 align="center">playwright-webext</h2>
<div align="center">

[Playwright](https://playwright.dev/) toolkit for testing browser extensions.

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
- Test scenarios when your extension is [disabled](https://vitalets.github.io/playwright-webext/api/extension/#disable), [re-enabled](https://vitalets.github.io/playwright-webext/api/extension/#enable) and
  [uninstalled](https://vitalets.github.io/playwright-webext/guides/uninstall/).

## Documentation

Check out the [documentation](https://vitalets.github.io/playwright-webext/).

## Motivation

[Playwright's extension guide](https://playwright.dev/docs/chrome-extensions) shows how to launch
browser with an extension, wait for its service worker, and find its ID. That gives you a working
starting point, but leaves you to maintain the setup fixtures and write helpers for extension tasks.

**playwright-webext** provides multiple helpers for extension end-to-end testing,
covering scenarios beyond the guide: preparing stored data, switching translation catalogs,
and upgrading an older build while preserving its data. You can focus your tests on the extension's
behavior while continuing to use Playwright pages, locators, and assertions.

Start with [Installation](https://vitalets.github.io/playwright-webext/getting-started/installation/), then [configure your tests](https://vitalets.github.io/playwright-webext/getting-started/configuration/).

## License

[MIT](https://github.com/vitalets/playwright-webext/blob/main/LICENSE).
