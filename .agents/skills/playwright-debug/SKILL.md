---
name: playwright-debug
description: Debug failing Playwright tests using playwright-cli attached to a live, paused test. Use to inspect page state, locators, console errors, and requests around a failure, then fix and rerun when requested.
---

# Playwright debug

Use the test's own setup and data to reproduce the failure in a live browser. Diagnose by default;
when the task requests a fix, apply the evidence-backed change and verify it with a normal test run.

## Select and start the test

Read the failure, spec, fixtures, and Playwright config. Select the failing test, or an existing test
that renders the page and data needed to investigate. Keep the original failure output: debug mode
changes timing, so a passing debug run alone does not establish that a failure is fixed.

Check `npx playwright test --help` for `--debug=cli` and `npx playwright-cli --help` for the available
inspection commands. If the required CLI cannot run, report the setup error rather than silently
upgrading project dependencies. Use an installed `playwright-cli` directly when available.

In this repository, use `npm test --` to select `test/playwright.config.ts`. The config currently
defines no named projects; do not copy `--project=chrome` from another project's example. Use
`--list` with the same file and grep filter if needed to confirm that it selects one intended test
(`-g` is a regular expression).

```bash
PLAYWRIGHT_HTML_OPEN=never npm test -- <spec-file> -g '<test-name-regex>' --debug=cli
```

Start this in a persistent background/async terminal invocation. With `exec_command`, use a short
`yield_time_ms` and retain the returned terminal `session_id`; poll it with `write_stdin`. The test
must remain running while subsequent terminal calls drive the browser. Wait for debugging
instructions, the paused-at-start message, and a browser session name such as `tw-abcdef`.

The terminal session ID and the browser session name are different: use the former to read the test
process output, and the latter in CLI commands. Copy the actual browser session name into every
command below.

## Attach and advance

Attach from a separate terminal invocation:

```bash
npx playwright-cli attach tw-abcdef
```

Advance one step per terminal invocation, reading the reported pause location after every call:

```bash
npx playwright-cli --session=tw-abcdef step-over
```

Do not batch steps or run a blind loop. Stop after the test has confirmed that the relevant page or
element is rendered, for example after its own `expect(...).toBeVisible()`. If that assertion is the
failure being investigated, stop before it and inspect the state that should satisfy it. A reported
pause location may identify the next action; check it against the source and the completed action.

Prefer this `step-over` workflow over `pause-at <file>:<line>`. The supplied reference reports that
`pause-at` reproducibly closed the session immediately after attaching, regardless of path format.
This is an observed issue, not a claim that every CLI version has the same defect.

## Inspect the live page

Use the smallest inspection that can test the current hypothesis:

```bash
npx playwright-cli --session=tw-abcdef snapshot
npx playwright-cli --session=tw-abcdef console error
npx playwright-cli --session=tw-abcdef requests
npx playwright-cli --session=tw-abcdef screenshot --filename=test-results/debug.png
npx playwright-cli --session=tw-abcdef eval "() => { const el = [...document.querySelectorAll('h4')].find(e => e.textContent.includes('Some Heading')); return el && { text: el.textContent, fontSize: getComputedStyle(el).fontSize }; }"
```

Check CLI help for network inspection: the bundled CLI currently exposes `requests`; some versions
use `network`. Ensure the screenshot's parent directory exists. Inspect the snapshot's URL and use
the CLI's tab commands when the test opens multiple pages, so observations come from the intended
page. Refresh the snapshot before reusing element references after navigation or page changes.

Prefer read-only evaluation while gathering evidence. If an interactive action changes the page,
distinguish that state from the state produced by the test and reproduce again when necessary.
Connect observations to a concrete cause, such as a wrong locator, missing setup, application error,
or an action occurring before its prerequisite. Preserve the intended assertion when fixing a test.

## Finish and verify

Resume the test when inspection is complete:

```bash
npx playwright-cli --session=tw-abcdef resume
```

Read the original async terminal's output through completion and record its exit status and test
result. Treat `Session closed` on the final resume as benign only if that output confirms that the
test completed. If the session closes earlier, inspect the test process for a crash, setup failure,
or premature exit before retrying. Stop any remaining debug process you started when finished.

When a fix was requested, make the smallest change supported by the evidence and rerun the selected
test without `--debug=cli`, using the same file, filter, and config. Follow repository validation
requirements for changed files. A debug run's success does not replace this normal run.

Report the cause, relevant evidence, any changes, and the normal rerun result. State any blocker or
remaining uncertainty if the failure could not be reproduced or the rerun could not finish.

Reference: [Playwright CLI test debugging](https://github.com/microsoft/playwright-cli/blob/main/skills/playwright-cli/references/playwright-tests.md).
