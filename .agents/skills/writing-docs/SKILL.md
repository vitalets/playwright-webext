---
name: writing-docs
description: Write, edit, and review playwright-webext documentation, including Docusaurus pages in website/content and the README. Use for clearer prose, useful examples, and documentation structure. Applies project editorial preferences; not implementation comments or website styling.
---

# Writing docs

Help extension developers get their tests working with as little reading as necessary. Assume basic
TypeScript and Playwright knowledge, but explain behavior specific to this package.

## Before writing

Read the target page, relevant neighboring pages, and the implementation or tests supporting its
claims. Use `website/sidebars.ts` to understand the reading order. Existing docs are context, not an
unquestioned style template: some still contain repetition.

Identify the reader's task and what this page needs to add. Infer these from the request and existing
context; ask only when a missing answer would change the result. For structure changes, read
[Page types and project structure](reference/doc-types.md). When editing prose or examples, read
[Project examples](reference/examples.md).

## Editorial rules

- Lead with what the reader wants to do. Introduce the extension feature before the method that tests
  it. Explain the underlying problem when it makes the solution understandable, as with localization.
- Use familiar words, concrete subjects, and direct verbs. Prefer “use”, “open”, “read”, and “set”.
  Keep connected, natural paragraphs rather than turning every sentence into a bullet or heading.
- Describe features without praise. Avoid “handy”, “powerful”, “seamless”, “easy”, and “simply”. The
  introduction should explain the package's purpose; fixture and implementation details belong later.
- Prose beside code must add information the reader needs: purpose, a non-obvious prerequisite,
  timing, a consequence, or a limitation. Do not narrate imports, method calls, or assertions already
  clear in the sample. Do not remind readers to substitute their own example URLs or values.
- Keep short connective instructions when they help the reader act. Do not delete a useful explanation
  just because a method name hints at it. For example, a path's base directory is not evident in code.
- Link to Playwright for its standard options, fixtures, commands, and assertions. Explain only this
  package's additions or differences. Forwarded Playwright options need names and links, not copied
  descriptions. Keep configuration details in Basics rather than duplicating them in API pages.
- Use headings for distinct tasks or lookup needs. A short guide can be a few paragraphs and one
  example. Do not add a conclusion, “Next steps”, troubleshooting, or limitations section to fill a
  template. Put a relevant caveat near the behavior; a topic may need its own limitations section.
- Preserve facts while editing. Never invent defaults, requirements, API options, errors, or performance
  numbers to make a sentence more specific. Keep uncertainty and negative statements when they express
  a real condition or boundary. See [Editing principles](reference/strunk-white-principles.md) for
  sentence-level guidance when needed.

## Code examples

Choose the smallest example that demonstrates the page's purpose.

For testing guides, assert useful extension behavior: popup text, a scheduled alarm, saved settings,
translated text, or a feedback page. Avoid examples whose only result is a matching context identity,
manifest version, extension ID, or worker count, unless that fact is the actual subject of the page.
The package's own regression tests can contain such assertions; they are not automatically good
user-facing examples.

For fixture setup, a short extension skeleton is sufficient. Do not invent a popup fixture or a
complete application to explain `base.extend()`. A complete test should include the imports it needs;
a reference snippet or explicitly partial skeleton can rely on context already established. Do not
repeat full setup around every snippet.

Verify current exports in `src/index.ts`. The current convention is `test` from `playwright-webext`
(or the user's fixture module), and `expect`, `defineConfig`, and `mergeTests` from `@playwright/test`.
Use the public API rather than test-internal import paths. Keep filename titles on blocks where the
file's location matters.

Use the simplest correct waiting pattern. A stable value can use a direct assertion; asynchronous
changes may need a retrying assertion or `expect.poll`. Subscribe to an event before triggering it.
Do not replace a necessary wait with a race to shorten an example. Preserve the accepted patterns for
welcome-page polling and uninstall-page capture described in the project examples.

## Review before finishing

Review the draft in this order:

1. **Structure:** Does it answer the reader's task in a useful order? Is advanced setup interrupting
   Getting started? Can a link replace a digression?
2. **Deletion:** For each paragraph, ask what the reader loses if it disappears. Remove repeated
   facts, code narration, obvious substitutions, and empty introductions. Keep prerequisites and
   caveats that affect success.
3. **Language:** Replace abstract phrases and opinion with ordinary, precise English. Read the prose
   as connected sentences; avoid both dense clauses and choppy fragments.
4. **Accuracy:** Check examples, imports, defaults, timing, and limitations against source and focused
   tests. Make sure edits did not change the behavior being described.

For review-only requests, report concrete issues with suggested edits. For requested changes, edit
the files within scope; do not reorganize the whole site during a wording fix.

Preserve Docusaurus frontmatter, MDX imports, tabs, code titles, and working links. If changing a heading
or path, check links to its anchor or page and update affected navigation. Never edit generated files
in `website/.docusaurus` or `website/build`.

Follow `AGENTS.md` validation. Read current package scripts before running commands. For website
changes, also run `npm run docs:tsc` and `npm run docs:build`; use focused behavior tests when changing
behavioral examples. Do not add package tests solely for editorial changes. A site build checks
rendering and links, not whether a code sample succeeds against a real extension.

Adapted from [ratacat/claude-skills: writing-documentation](https://github.com/ratacat/claude-skills/tree/main/skills/writing-documentation),
using the project's documentation reviews from September 23–25, 2026. Current user instructions and
verified implementation take precedence over these editorial defaults.
