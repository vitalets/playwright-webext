# Rules for agents

## Source file structure

For TypeScript implementation files, follow `.agents/rules/ts-file-structure.md`.

Apply this rule whenever creating, modifying, or refactoring implementation files. Do not
apply it to tests or test fixtures.

## Validation

After changes, run `npm run prettier`, `npm run tsc` and focused tests for the affected behavior.
