# Writing TypeScript

Structure TypeScript source files for top-down reading: a reader should understand what the file does before encountering implementation details.

## Files in Scope

### Included files

Apply to TypeScript source files (`.ts` and `.tsx`), such as application modules, components, services, and shared utilities.

### Excluded files

Ignore configuration files (for example, `vite.config.ts`, `playwright.config.ts`, and `eslint.config.ts`), test files (for example, `*.test.ts`, `*.spec.ts`, and their `.tsx` equivalents), or files written in other languages.

These scope boundaries apply to all rules below.

## Ordering

Arrange declarations in the sequence below. The placement examples are excerpts;
unrelated declarations and documentation are omitted.

### File purpose

Start the file with a concise block comment describing the module’s overall purpose and boundaries. Do not list its exports or repeat documentation provided on individual exported members.

**❌ Bad:**

```ts
/**
 * Exports loadSettings and saveSettings.
 */
```

**✅ Good:**

```ts
/**
 * Loads and saves application settings in local storage.
 * Remote synchronization is handled by the sync module.
 */
```

### Imports

External dependencies first, then internal modules according to the project's import conventions.

**✅ Example:**

```ts
import { readFile } from 'node:fs/promises';
import { parseSettings } from './settings';
```

### Module constants

Place values and configuration shared across the file after imports.

**✅ Example:**

```ts
const STORAGE_KEY = 'settings';

export function loadSettings() {
  return storage.get(STORAGE_KEY);
}

export function saveSettings(settings: Settings) {
  return storage.set(STORAGE_KEY, settings);
}
```

### Types

Place types that define or support the file's API before its public declarations.

**✅ Example:**

```ts
export type Settings = { theme: string };

export function loadSettings() {
  return storage.get('settings') as Promise<Settings>;
}
```

### Public API

Place main functions, classes, or values exposed by the module before private functions.

**✅ Example:**

```ts
export function loadSettings(raw: string) {
  return parseSettings(raw);
}

function parseSettings(raw: string) {
  return JSON.parse(raw) as Settings;
}
```

### Internal orchestration

Follow public declarations with private functions that coordinate the module's main behavior.

**✅ Example:**

```ts
export function loadSettings(raw: string) {
  return parseAndNormalizeSettings(raw);
}

function parseAndNormalizeSettings(raw: string) {
  const settings = parseSettings(raw);
  return normalizeSettings(settings);
}
```

### Implementation order

Supporting functions ordered roughly by call flow, with callers before callees.

**✅ Example:**

```ts
function normalizeSettings(settings: Settings) {
  return { ...settings, theme: normalizeTheme(settings.theme) };
}

function normalizeTheme(theme: string) {
  return theme || 'system';
}
```

### Leaf helpers

Place small implementation details with no meaningful orchestration responsibilities last.

**✅ Example:**

```ts
function normalizeSettings(settings: Settings) {
  return { ...settings, theme: normalizeTheme(settings.theme) };
}

function normalizeTheme(theme: string) {
  return theme || 'system';
}
```

## Commenting

### JSDoc format

Use multi-line block-form JSDoc for file-level, function, and method documentation,
including existing comments. Reformat or
rewrite these comments as needed, preserving their meaning and useful details.

**❌ Bad:**

```ts
// Persists settings for the next application launch.
export async function saveSettings(settings: Settings) {
  await storage.set(STORAGE_KEY, settings);
}
```

**✅ Good:**

```ts
/**
 * Persists settings for the next application launch.
 */
export async function saveSettings(settings: Settings) {
  await storage.set(STORAGE_KEY, settings);
}
```

### Variable comments

For variable and constant documentation, follow the comment style used in the
project. Multi-line block-form JSDoc is not required.

**✅ Example:**

In a project that uses line comments for constants:

```ts
// Storage namespace shared by settings readers and writers.
const STORAGE_KEY = 'settings';
```

### Public documentation

Document all exported functions and module-level constants, except as described below. Focus on their purpose and role, not on implementation.

**✅ Example:**

Excerpt from a module exposing both settings loading and saving:

```ts
/**
 * Storage namespace shared by settings readers and writers.
 */
const STORAGE_KEY = 'settings';

/**
 * Persists settings for the next application launch.
 */
export async function saveSettings(settings: Settings) {
  await storage.set(STORAGE_KEY, settings);
}
```

### Primary export

When a module centers on one exported class or function, document its purpose in the file-level comment and omit redundant documentation on that declaration. Supporting exports do not change this guidance. Keep declaration comments only when they add distinct, useful details.

**✅ Example:**

```ts
/**
 * Loads application settings from local storage.
 */

export type Settings = { theme: string };

export async function loadSettings() {
  return storage.get('settings');
}
```

### Constructors

Do not document constructors.

**✅ Example:**

```ts
class SettingsStore {
  constructor(private storage: Storage) {}
}
```

### Internal documentation

For types, internal functions and helpers, comment them only when their purpose, behavior, or role in the module is not obvious from the code and naming.

**✅ Example:**

```ts
function getTotal(prices: number[]) {
  return prices.reduce((sum, price) => sum + price, 0);
}

/**
 * Treats legacy empty theme values as the system preference.
 */
function normalizeTheme(theme: string) {
  return theme || 'system';
}
```

### Implementation details

Do not restate implementation details that are already clear from the code.

**❌ Bad:**

```ts
/**
 * Calls storage.set with STORAGE_KEY and settings.
 */
export async function saveSettings(settings: Settings) {
  await storage.set(STORAGE_KEY, settings);
}
```

**✅ Good:**

```ts
/**
 * Persists settings for the next application launch.
 */
export async function saveSettings(settings: Settings) {
  await storage.set(STORAGE_KEY, settings);
}
```

### Type tags

Do not add `@param` or `@returns` tags when TypeScript already expresses them.

**❌ Bad:**

```ts
/**
 * Formats a price for display.
 * @param amount A number.
 * @returns A string.
 */
export function formatPrice(amount: number) {
  return amount.toFixed(2);
}
```

**✅ Good:**

```ts
/**
 * Formats a price for display.
 */
export function formatPrice(amount: number) {
  return amount.toFixed(2);
}
```

### Inline examples

Where useful, include 1–2 short inline examples, especially for reusable helpers.

**✅ Example:**

```ts
/**
 * Converts a ratio to a percentage label.
 * @example formatPercent(0.25) // '25%'
 */
export function formatPercent(ratio: number) {
  return `${ratio * 100}%`;
}
```

### Comment language

Use simple, direct language. Keep important technical details; simplify the wording, not the content.

**❌ Bad:**

```ts
/**
 * Facilitates the persistence of preferences via a debouncing
 * mechanism utilizing a 250 ms temporal interval.
 */
```

**✅ Good:**

```ts
/**
 * Saves preferences with 250 ms debounce.
 */
```

### Comment preservation

Preserve existing comments inside function and method bodies (including
constructors and callbacks) as written, including their wording, comment syntax,
and line breaks. Only adjust leading indentation when surrounding code moves.
Change or remove these comments only when explicitly requested or when a code
change makes them inaccurate. This preservation rule takes precedence over all
other commenting guidance, including for declarations nested inside these bodies.

**✅ Example:**

When moving this helper, retain its existing body comment verbatim:

```ts
function normalizeTheme(theme: string) {
  // Older clients saved an empty string for the system theme.
  return theme || 'system';
}
```

### ESLint suppressions

When suppressing ESLint for a single line, use the `// eslint-disable-next-line ...` form, not `// eslint-disable-line ...`.

**✅ Example:**

```ts
// eslint-disable-next-line no-console
console.log('Settings loaded');
```

## Return Types

Omit explicit return type annotations on functions and methods unless TypeScript requires them. Rely on inference from the implementation to keep code simpler to review.

**❌ Bad:**

```ts
function getTotal(prices: number[]): number {
  return prices.reduce((sum, price) => sum + price, 0);
}
```

**✅ Good:**

```ts
function getTotal(prices: number[]) {
  return prices.reduce((sum, price) => sum + price, 0);
}
```

## Code Quality

### Variable names

Use the type’s domain term in variable names rather than introducing a different term. For example, a value of type `SavedItem` could be named `savedItem`. Add role-specific qualifiers when needed to distinguish values, such as `sourceItem` and `targetItem`.

**✅ Example:**

```ts
const savedItem: SavedItem = loadItem();
const sourceItem: SavedItem = savedItem;
const targetItem: SavedItem = copyItem(sourceItem);
```

### Function names

Name functions and methods with verbs that describe their action. For example, prefer `getTotal` over `total`. Where practical, use specific verbs such as `find`, `save`, `remove`, or `create` rather than broad terms like `resolve`, `prepare`, or `process`. Make meaningful side effects visible, especially when a function or method both looks up and creates data. For example, prefer `findOrCreateStoredGroup` over `resolveLocalGroup`, and `saveGroupFromMatchingBindingHint` over `recognizeGroup`. General verbs are still reasonable when they accurately describe the function or method’s role, such as an event handler.

**❌ Bad:**

```ts
async function resolveLocalGroup(name: string) {
  return (await findStoredGroup(name)) ?? createStoredGroup(name);
}
```

**✅ Good:**

```ts
async function findOrCreateStoredGroup(name: string) {
  return (await findStoredGroup(name)) ?? createStoredGroup(name);
}
```

`findOrCreateStoredGroup` makes the possible creation visible; an event handler name such as `handleGroupChange` can still accurately describe a broader role.

### Control flow

Keep branches and conditions easy to follow. Use optional chaining when it simplifies access.

**❌ Bad:**

```ts
const theme = settings && settings.appearance
  ? settings.appearance.theme
  : undefined;
```

**✅ Good:**

```ts
const theme = settings?.appearance?.theme;
```

### Nesting

Prefer guard clauses and early returns. Extract meaningful operations when nested blocks obscure the main flow.

**❌ Bad:**

```ts
async function saveIfChanged(settings: Settings | undefined, changed: boolean) {
  if (settings) {
    if (changed) {
      await saveSettings(settings);
    }
  }
}
```

**✅ Good:**

```ts
async function saveIfChanged(settings: Settings | undefined, changed: boolean) {
  if (!settings || !changed) return;

  await saveSettings(settings);
}
```

### Callbacks

Avoid deeply nested callbacks. Use named helpers or `async`/`await` where appropriate without changing execution behavior.

**❌ Bad:**

```ts
function refreshSettings() {
  return loadSettings().then(settings => {
    return saveSettings(settings).then(() => {
      renderSettings(settings);
    });
  });
}
```

**✅ Good:**

```ts
async function refreshSettings() {
  const settings = await loadSettings();
  await saveSettings(settings);
  renderSettings(settings);
}
```

### Parameter lists

Keep inputs easy to understand at call sites. Group related inputs into a named object when that clarifies their meaning.

**❌ Bad:**

```ts
function createPanel(width: number, height: number, title: string) {
  return { width, height, title };
}

createPanel(320, 200, 'Settings');
```

**✅ Good:**

```ts
type PanelOptions = { width: number; height: number; title: string };

function createPanel({ width, height, title }: PanelOptions) {
  return { width, height, title };
}

createPanel({ width: 320, height: 200, title: 'Settings' });
```

### Function responsibilities

Keep functions, methods, and callbacks concise and centered on a clear responsibility.

**❌ Bad:**

```ts
async function saveSettings(settings: Settings) {
  await storage.set(STORAGE_KEY, settings);
  renderSettings(settings);
}
```

**✅ Good:**

```ts
async function saveSettings(settings: Settings) {
  await storage.set(STORAGE_KEY, settings);
}

async function saveAndRenderSettings(settings: Settings) {
  await saveSettings(settings);
  renderSettings(settings);
}
```

### Orchestration

Functions and methods that coordinate a workflow should read as a sequence of meaningful steps. Extract the implementation details of those steps into named helpers, even when short or used only once. Keep straightforward assignments and control flow inline. Apply this when writing new code as well as refactoring.

**❌ Bad:**

```ts
async function refreshSettings() {
  const settings = await loadSettings();
  document.documentElement.dataset.theme = settings.theme;
  document.title = settings.title;
}
```

**✅ Good:**

```ts
async function refreshSettings() {
  const settings = await loadSettings();
  applySettings(settings);
}

function applySettings(settings: Settings) {
  document.documentElement.dataset.theme = settings.theme;
  document.title = settings.title;
}
```

Keep the straightforward `settings` assignment inline; name the UI update step to explain its role.

### Line breaks

Break long expressions at natural boundaries. Keep URLs intact and preserve existing body comments according to the commenting rules.

**❌ Bad:**

```ts
const visibleItems = items.filter(item => item.enabled && item.category === selectedCategory).map(item => item.label);
```

**✅ Good:**

```ts
const visibleItems = items
  .filter(item => item.enabled)
  .filter(item => item.category === selectedCategory)
  .map(item => item.label);
```

### File responsibilities

Keep each module centered on a cohesive purpose. Separate distinct responsibilities when a file becomes difficult to navigate.

**✅ Example:**

Keep settings persistence in `settings-store.ts` and settings form rendering in
`settings-form.ts` when combining them makes the module difficult to navigate.

### Refactoring

Preserve useful comments and whitespace. Avoid compressing code solely to make functions or files shorter. Extract helpers to communicate intent and keep a consistent level of abstraction, not merely to shorten code. Avoid helpers whose names add no meaning beyond the expressions they wrap.

**❌ Bad:**

```ts
function findEnabledItems(items: Item[]) {
  return items.filter(isEnabled);
}

function isEnabled(item: Item) {
  return item.enabled;
}
```

**✅ Good:**

```ts
function findEnabledItems(items: Item[]) {
  return items.filter(item => item.enabled);
}
```

The helper only repeats the property name; it adds no useful abstraction.
