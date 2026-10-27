# Rules for agents

## Planning

When the user asks for a plan, do not edit files until they explicitly ask to implement it.
Treat follow-up additions and corrections as updates to the plan, not permission to implement.

## Documentation

Public documentation lives in `website/`. Internal specifications and architecture decision records
live directly in `specs/`, without an `adr/` subdirectory.

For public documentation and README changes, use
[writing-docs](.agents/skills/writing-docs/SKILL.md).

## Changelog

Update `CHANGELOG.md` only for meaningful user-facing changes, such as new features, behavior changes,
or bug fixes. Do not add entries for internal refactors, implementation details, or optimizations
that preserve public behavior, such as avoiding unnecessary file copies during directory preparation.
Keep entries concise: summarize the main change without implementation details or exhaustive behavior lists.

## Source file structure

For TypeScript implementation files, follow `.agents/rules/ts-file-structure.md`.

Apply this rule whenever creating, modifying, or refactoring implementation files. Do not
apply it to tests or test fixtures.

## Tests

When creating or editing test files, read and follow
`.agents/rules/good-tests.md`.

## Validation

After changes, run `npm run prettier`, `npm run tsc`, ESLint on changed files, and focused tests
for the affected behavior.
