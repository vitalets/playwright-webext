# Worker-scoped extension fixture

Design approved. Implementation and validation in progress.

## Agreed direction

- Introduce a worker-scoped extension fixture named `extensionW`, primarily to
  reduce setup cost by reusing an extension between tests.
- Keep the existing test-scoped `extension` fixture as the isolated option. Reuse is opt-in
  through `extensionW`.
- Read existing extension and context options from `workerInfo.project.use`. Support options
  configured in the Playwright configuration file, including project-level settings. File-level
  and describe-level `test.use()` overrides and computed test fixture values do not apply.
  Apply missing defaults explicitly because `project.use` does not contain resolved fixture defaults.
- Test authors decide whether tests depend on shared state and own any necessary cleanup. Document
  that `extensionW` shares its browser context between tests and requires manual cleanup when needed.
  Do not require tests to be independent as part of this fixture's contract.
- Public documentation must include a test-scoped fixture example that performs cleanup for
  the shared extension.
- Ignore video configuration for `extensionW` and document this known limitation.

## Implementation follow-through

- Use `workerInfo.project.timeout` for extension lifecycle waits, consistent with Playwright's
  default worker fixture timeout.
- Preserve Playwright's automatic per-test traces and screenshots. Installed Playwright source
  handles existing contexts at test boundaries; verify this with two tests sharing a context.
  Pages left open by earlier tests can appear in later screenshots.
- Prevent context creation from inheriting the first requesting test's context option overrides
  through Playwright instrumentation. Verify config/project options remain authoritative.
- Keep cleanup specific to the example extension. Explain that clearing extension storage does
  not reset every kind of browser or extension state.
- Verify reuse within a worker, isolation between workers and from `extension`, teardown,
  configuration defaults and precedence, ignored video settings, and the cleanup example.

ADR 0010 records the accepted opt-in exception to ADR 0001's isolation policy. Reconcile the
fixture description in ADR 0002 when implementation lands.
