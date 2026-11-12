# Writing Tests

Tests should make it clear what is being tested as the reader reads them, without requiring a dive into implementation details. All rules below support this guiding principle of readability.

## Test titles

Keep test titles focused on the main behavior being tested. Use concise inline comments to explain secondary checks or distinct phases instead of listing every step in the title.

**❌ Bad:**

```ts
test('saves settings, reloads them, and checks the theme', async () => {
  // ...
});
```

**✅ Good:**

```ts
test('persists settings', async () => {
  // ...
});
```

## Control flow

Write tests as straight-line sequences of plain instructions. Avoid loops, `if` statements, and other conditional logic unless explicitly requested by the user.

**❌ Bad:**

```ts
test('checks blank strings', () => {
  for (const value of ['', ' ']) {
    expect(isBlank(value)).toBe(true);
  }
});
```

**✅ Good:**

```ts
test('checks blank strings', () => {
  expect(isBlank('')).toBe(true);
  expect(isBlank(' ')).toBe(true);
});
```

## Inline values

Prefer inline values over variables that force the reader to look up a value without making the test clearer.

**❌ Bad:**

```ts
test('formats label', () => {
  const value = 'foo';
  expect(formatLabel(value)).toBe('FOO');
});
```

**✅ Good:**

```ts
test('formats label', () => {
  expect(formatLabel('foo')).toBe('FOO');
});
```

## Related checks

Group similar small checks in one clearly named test when that is easier to read than separate tests with repetitive or lengthy titles. Split checks when they cover unrelated scenarios or make the test difficult to follow; do not enforce one behavior or assertion per test.

**❌ Bad:**

```ts
test('recognizes an empty string as blank', () => {
  expect(isBlank('')).toBe(true);
});
test('recognizes a space as blank', () => {
  expect(isBlank(' ')).toBe(true);
});
```

**✅ Good:**

```ts
test('recognizes blank strings', () => {
  expect(isBlank('')).toBe(true);
  expect(isBlank(' ')).toBe(true);
});
```

## Helper extraction

When test actions can be expressed through a meaningfully named helper, prefer extracting them over keeping their details in the test body. Hide irrelevant complexity.

**❌ Bad:**

```ts
test('loads settings', () => {
  localStorage.setItem('settings', JSON.stringify({ theme: 'dark' }));
  // ...
});
```

**✅ Good:**

```ts
test('loads settings', () => {
  saveSettings({ theme: 'dark' });
  // ...
});

function saveSettings(settings: Settings) {
  localStorage.setItem('settings', JSON.stringify(settings));
}
```

## Helper parameters

Pass values important to the test as explicit helper parameters; do not silently set them inside the helper.

**❌ Bad:**

```ts
test('loads settings', () => {
  saveSettings();
  expect(loadSettings().theme).toBe('dark');
});

function saveSettings() {
  localStorage.setItem('settings', JSON.stringify({ theme: 'dark' }));
}
```

**✅ Good:**

```ts
test('loads settings', () => {
  saveSettings({ theme: 'dark' });
  expect(loadSettings().theme).toBe('dark');
});

function saveSettings(settings: Settings) {
  localStorage.setItem('settings', JSON.stringify(settings));
}
```

## Local helpers

Keep a few small helpers specific to one test file at the bottom of that file. When helpers become numerous or lengthy enough to make the test file difficult to navigate, move them into a nearby helpers file.

**✅ Example:**

```ts
test('loads settings', () => {
  // ...
});

function createSettings() { /* ... */ }
```

## Shared helpers

Place helpers shared across test files in a separate helpers file.

**✅ Example:**

```ts
import { saveSettings } from './helpers';

test('loads settings', () => {
  saveSettings({ theme: 'dark' });
  // ...
});
```

## Error matching

When asserting thrown errors, use a regular expression to match keywords that convey the error's meaning, rather than the entire message.

**❌ Bad:**

```ts
test('rejects missing settings', () => {
  expect(() => loadSettings()).toThrow('Settings file could not be found at /tmp/settings.json.');
});
```

**✅ Good:**

```ts
test('rejects missing settings', () => {
  expect(() => loadSettings()).toThrow(/could not be found/);
});
```

## Observable behavior

Test observable behavior at the highest practical level without slowing down the test suite. Avoid assertions on implementation details that are likely to change or difficult to understand.

**❌ Bad:**

```ts
test('caches values', () => {
  expect(cache.entries.size).toBe(1);
});
```

**✅ Good:**

```ts
test('caches values', () => {
  expect(cache.get('foo')).toBe('bar');
});
```

## Existing coverage

Before adding a test, check whether an existing higher-level test already covers the behavior. If it does, avoid adding a redundant lower-level test unless it covers a distinct edge case or failure mode.

**✅ Example:**

```ts
// Existing test.
test('applies discount', () => {
  expect(checkout({ subtotal: 100, discountPercent: 10 }).total).toBe(90);
});

// Redundant addition.
test('calculates discount', () => {
  expect(calculateDiscount(100, 10)).toBe(10);
});
```

## Expected results

Derive expected results independently from requirements or worked examples. Do not calculate them using the production code under test or duplicate its implementation in the assertion.

**❌ Bad:**

```ts
test('calculates total', () => {
  expect(calculateTotal(order)).toBe(calculateSubtotal(order) + calculateTax(order));
});
```

**✅ Good:**

```ts
test('calculates total', () => {
  expect(calculateTotal(order)).toBe(120);
});
```

## Mocks and collaborators

Prefer real collaborators. Mock external services or nondeterministic dependencies when needed, keeping internal behavior real. Prefer an understandable high-level behavior check over introducing mocks solely to isolate a specific defect.

**❌ Bad:**

```ts
test('calculates total', () => {
  vi.spyOn(cart, 'calculateTotal').mockReturnValue(3);
  expect(cart.calculateTotal()).toBe(3);
});
```

**✅ Good:**

```ts
test('calculates total', () => {
  cart.addItem({ price: 1, quantity: 3 });
  expect(cart.calculateTotal()).toBe(3);
});
```

## Interaction assertions

Assert calls, arguments, or ordering only when they are part of the observable contract.

**❌ Bad:**

```ts
test('saves settings', async () => {
  await saveSettings({ theme: 'dark' });
  expect(serializer.serialize).toHaveBeenCalledWith({ theme: 'dark' });
});
```

**✅ Good:**

```ts
test('saves settings', async () => {
  await saveSettings({ theme: 'dark' });
  expect(await loadSettings()).toEqual({ theme: 'dark' });
});
```

## Test data

When test data values are arbitrary, prefer using neutral placeholders such as `foo`, `bar`, `baz` for strings, or 1, 2, 3 for numbers. Avoid values that describe the test scenario or imply meaning readers need to interpret; keep cognitive load minimal.

**❌ Bad:**

```ts
test('uppercases text', () => {
  expect(toUpperCase('settings storage key')).toBe('SETTINGS STORAGE KEY');
});
```

**✅ Good:**

```ts
test('uppercases text', () => {
  expect(toUpperCase('foo')).toBe('FOO');
});
```
