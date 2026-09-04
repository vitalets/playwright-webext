# TypeScript File Structure

Structure TypeScript source files for top-down reading: a reader should understand what the file does before encountering implementation details.
Apply only to the source files, not tests.

## Ordering Rules

1. **File purpose** — start the file with a concise block comment describing the module’s overall purpose and boundaries. Do not list its exports or repeat documentation provided on individual exported members.
2. **Imports** — external dependencies first, then internal modules according to the project's import conventions.
3. **Module-level constants and configuration** — values shared across the file.
4. **Types** — types that define or support the file's API.
5. **Exported/public API** — main functions, classes, or values exposed by the module.
6. **Internal orchestration** — private functions that coordinate the module's main behavior.
7. **Lower-level implementation** — supporting functions ordered roughly by call flow, with callers before callees.
8. **Leaf helpers and utilities** — small implementation details with no meaningful orchestration responsibilities.

## Commenting Rules

- Always use multi-line block-form JSDoc.
- Document all exported functions and module-level constants. Focus on their purpose and role, not on implementation.
- For types, internal functions and helpers, comment them only when their purpose, behavior, or role in the module is not obvious from the code and naming.
- Do not restate implementation details that are already clear from the code.
- Do not add `@param` or `@returns` tags when TypeScript already expresses them.
- Where useful, include 1–2 short inline examples, especially for reusable helpers.
- Use simple, direct language. Keep important technical details; simplify the wording, not the content.

## Example

```ts
/**
 * Provides API to load and save application settings to persistent storage.
 */

import { storage } from './storage';

/**
 * Storage key used for persisted application settings.
 */
const STORAGE_KEY = 'settings';

export type Settings = {
  theme: string;
};

/**
 * Loads persisted settings and applies the provided defaults.
 */
export async function loadSettings(defaults: Settings): Promise<Settings> {
  const stored = await readStorage();
  return normalizeSettings(stored, defaults);
}

/**
 * Persists application settings.
 */
export async function saveSettings(settings: Settings): Promise<void> {
  await writeStorage(normalizeSettings(settings, settings));
}

/**
 * Reads the raw settings value from the persistence layer.
 */
async function readStorage() {
  return storage.get(STORAGE_KEY);
}

/**
 * Centralizes persistence writes for this module.
 */
async function writeStorage(settings: Settings) {
  await storage.set(STORAGE_KEY, settings);
}

/**
 * Applies defaults and converts persisted data into the public settings shape.
 */
function normalizeSettings(settings: unknown, defaults: Settings): Settings {
  return defaults;
}

/**
 * Normalizes URLs before they are used as stable storage or comparison keys.
 * `https://example.com/` -> `https://example.com`
 */
function normalizeUrl(url: string): string {
  return url.replace(/\/$/, '');
}
```
