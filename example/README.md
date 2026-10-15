# Extension example

Build and test a TypeScript extension with [CRXJS](https://crxjs.dev/). The extension opens a welcome
page on first installation, has a popup with a Close button, and opens `https://example.com/uninstall`
when uninstalled. It saves the installation date in local storage. Its name, description, and pages
are translated into English and Spanish.

## Run the example

Use Node.js 20.19+ or 22.12+. From this directory:

```sh
npm ci
npx playwright install chromium
npm test
```

`npm test` builds the extension into `dist/prod/` and runs behavior tests in English, with separate Spanish
checks for each page. Run `npm run tsc` to check the extension, configuration, and test types.

To try the extension manually, run `npm run build`, open `chrome://extensions`, enable Developer mode,
and load `dist/prod/` as an unpacked extension. Production builds also create `dist/prod.zip`. Chrome selects translations using its browser language.
For live development, run `npm run dev` and load `dist/dev/`.

## Test the repository version

The example declares a published `playwright-webext` version so it can be copied outside this
repository. To test local changes, build the package from the repository root, then install a local
copy in the example:

```sh
npm run build
cd example
npm ci
npm install .. --no-save --package-lock=false --install-links --ignore-scripts
npm test
```

The install command preserves the dependency version and lockfile. It installs a packed copy instead
of a symlink so the package uses the example's Playwright installation. Repeat the build and local
install after changing the library. Tests use normal ESM imports from `playwright-webext`.

## Files

- `src/`: extension pages and background worker.
- `public/_locales/`: translation catalogs copied into the build.
- `manifest.config.ts` and `vite.config.ts`: CRXJS manifest and build configuration.
- `playwright.config.ts`: test configuration, loading `./dist/prod` relative to this file.
- `test/`: popup, welcome and installation, and uninstall tests.

The welcome test polls for a page because installation can open it before the test starts. The
uninstall test intercepts the external URL so it does not depend on a live website.
