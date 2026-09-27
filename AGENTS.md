# Rules for agents

## Documentation

For public documentation and README changes, use
[writing-docs](.agents/skills/writing-docs/SKILL.md).

When implementing a meaningful feature, update `CHANGELOG.md` to describe the user-facing change.

## Source file structure

For TypeScript implementation files, follow `.agents/rules/ts-file-structure.md`.

Apply this rule whenever creating, modifying, or refactoring implementation files. Do not
apply it to tests or test fixtures.

## Validation

After changes, run `npm run prettier`, `npm run tsc` and focused tests for the affected behavior.
