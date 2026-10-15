# Extension example

Build and test a TypeScript extension with [CRXJS](https://crxjs.dev/). The extension opens a welcome
page on first installation, has a popup with a Close button, and opens `https://example.com/uninstall`
when uninstalled. It saves the installation date in local storage. Its name, description, and pages
are translated into English and Spanish.

## Run the example

> Run commands from the example directory:
>
> ```sh
> cd example
> ```

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
