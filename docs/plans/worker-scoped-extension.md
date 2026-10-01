# Extension launch API and custom worker fixtures

ADR 0011 records the accepted design. Implementation and validation are complete; this plan replaces
the earlier built-in `extensionW` plan.

## Public API

- Export `launchWithExtension()` returning an `Extension` with `.context`.
- Use `extension.close()` to close the browser context and clean up temporary copies.
- Accept `extensionPath`, `extensionAutoInstall` (default true), `launchOptions`, and
  `contextOptions`. Lifecycle waits use native context timeouts; the runner limits fixtures and tests.
- Keep `headless` inside `launchOptions`; its timeout controls browser startup separately.
- Own browser creation, installation, temporary copies, and cleanup after partial setup failure.
- Keep native context methods unchanged; repeated `extension.close()` calls await the same teardown.
- Have the built-in fixture and `launchWithExtension()` share `launchContext()` and construct
  `Extension` directly, so the fixture can track video before automatic installation.
- Keep native persistent-context defaults and option inheritance; remove the complete list of
  defaults and undefined properties used to block ambient options.
- Resolve explicit launch and installation paths from the working directory. Resolve the built-in
  fixture’s configured `extensionPath` from the config directory.

## Fixtures and configuration

- Keep the isolated `extension` fixture, including its video reporting and config-relative paths.
- Remove `extensionW` without a deprecation period; there are no existing users to accommodate.
- Make `extensionPath` a worker-scoped option. Keep `extensionAutoInstall` test-scoped.
- Preserve a combined `WebextOptions` type for `defineConfig<WebextOptions>({...})`.
- Document file-level overrides of `extensionPath`; describe-level overrides are unsupported.

## Shared-fixture recipe

The public shared-context guide includes this recipe.

```ts
import { test as base, launchWithExtension, type Extension } from 'playwright-webext';

export const test = base.extend<{ sharedExtension: Extension }, { sharedExtensionW: Extension }>({
  sharedExtensionW: [
    async ({ extensionPath, headless, launchOptions }, use) => {
      const extension = await launchWithExtension({
        extensionPath,
        launchOptions: { ...launchOptions, headless },
      });

      await use(extension);
      await extension.close();
    },
    { scope: 'worker' },
  ],
  sharedExtension: async ({ sharedExtensionW }, use) => {
    await sharedExtensionW.storage.local.clear();
    await use(sharedExtensionW);
  },
});
```

## Implementation and validation

- Use the writing-docs skill for public documentation and update the changelog.
- Document native option inheritance at creation time: a lazy shared fixture can inherit the first
  requesting test's settings. Later tests reuse that context. Auto worker setup can happen earlier.
- Keep shared-state cleanup explicit, and document worker restarts, retries, and separate workers.
- Verify partial-setup cleanup, normal teardown, teardown after test failure, and temporary copies.
- Verify temporary copy cleanup completion and error handling through `extension.close()`, including
  calls after the browser has already closed.
- Verify worker option injection, file overrides, config-relative configured paths, direct API paths,
  manual installation, upgrades, and native context timeouts.
- Verify supplied options override inherited settings and that native defaults remain intact.
- Check persistent-context limitations around inherited `storageState`; preserve explicit state
  restoration and avoid promising that all inherited `use` settings are supported.
- Verify localization behavior when browser locale is inherited rather than explicitly supplied.
- Preserve built-in fixture video retention and attachments; custom fixtures do not receive that
  integration. Verify automatic traces and screenshots across tests sharing a context.
- Run formatting, TypeScript, ESLint on changed files, and focused behavior tests.
- ADR 0010 is superseded by ADR 0011; ADR 0002 describes the custom launch API.

## Validation results

- Focused browser tests passed for launch, shared fixtures, installation, upgrades, localization,
  storage restoration, video recording, native context timeouts, and explicit extension teardown, including
  cleanup errors and partial installation failure.
- A separate two-test run verified trace and screenshot attachments for a shared context and
  teardown after a test failure.
- A standalone script successfully launched and closed the built package outside Playwright Test.
- Formatting, TypeScript, ESLint on changed source and tests, package build, documentation typecheck,
  and documentation build passed.
