# Page types and project structure

Choose structure from the reader's task. These are the project's current choices, not a requirement
to create new pages or preserve navigation against an explicit request to change it.

## Public documentation

Public pages live in `website/content/`. Internal decisions and plans live in `docs/`. The site has
separate guide and API navigation; check `website/sidebars.ts` before moving or adding pages.

| Area            | Reader's need                               | What belongs here                                                                     |
| --------------- | ------------------------------------------- | ------------------------------------------------------------------------------------- |
| Introduction    | Understand what the package helps them test | Purpose and testable behavior, with links; omit fixture mechanics                     |
| Getting started | Run a first useful test                     | Installation, minimal configuration, writing tests, running tests                     |
| Basics          | Adapt the setup to an existing test suite   | Setup fixtures, Using context, Configuration options, in that order                   |
| Testing Guides  | Test a particular extension feature         | Storage first, then the existing feature guides; useful behavior and relevant caveats |
| API             | Look up a method or property                | Hand-written Extension and ExtensionStorage reference                                 |

The Introduction is the home page and a sidebar item above Getting started. Getting started entries
are separate pages, not anchors on one long page. Advanced configuration, fixture extension, and
fixture merging belong in Basics. Keep the initial configuration focused on `extensionPath`.

Installation uses Docusaurus package-manager tabs for npm, Yarn, and pnpm under the same Install
heading. Install this package separately from the conditional block for Playwright Test and Chromium
when they are not already installed. Prefer `npx` for npm examples.

## Task guides

A short guide may need only context, the testing action, and one example. Explain the extension's
behavior first, then introduce the testing method. Add sections when there are distinct tasks or
substantial explanations to navigate; do not split a single example into ceremonial stages.

A longer explanation can be useful when the reader needs a mental model. The i18n guide, for example,
starts with why setting Playwright's locale alone does not select extension translations, introduces
how the package helps, then separates examples, implementation background, and limitations.

There are no standalone troubleshooting or limitations pages in the current structure. This does
not prohibit relevant topic-specific limitations, such as popup tab behavior or i18n boundaries.

## API reference

Keep top-level `Methods` and `Properties` sections, with entries beneath them. Put `Call` and `Returns`
on separate lines. State property types. Include parameters, defaults, errors, and examples when they
help define the contract; do not add empty subsections to satisfy a template.

Fixture setup and package configuration have their own Basics pages. Link there instead of recreating
those sections in API reference. Likewise, link to Playwright's native object and option references.

## README and internal docs

The README should let a reader evaluate the package and start using it, then point to the website for
more detail. Do not turn it into a second copy of the entire site.

Internal architecture documents explain decisions and tradeoffs for contributors. Implementation
details belong there when they do not help a package user choose or use an API. Follow existing ADR
conventions when working on an ADR; this skill does not replace the project's domain-modeling guidance.
