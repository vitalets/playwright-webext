# Good Tests

Tests should make it clear what is being tested as the reader reads them, without requiring a dive into implementation details. All rules below support this guiding principle of readability.

- Write tests as straight-line sequences of plain instructions. Avoid loops, `if` statements, and other conditional logic unless explicitly requested by the user.
- Prefer inline values over introducing variables in tests to reduce the reader's cognitive load. Use variables when a meaningful name, reuse, or a complex expression makes the test easier to understand.
- Group similar small checks in one clearly named test when that is easier to read than separate tests with repetitive or lengthy titles. Split checks when they cover unrelated scenarios or make the test difficult to follow; do not enforce one behavior or assertion per test.
- When test actions can be expressed through a meaningfully named helper, prefer extracting them over keeping their details in the test body. Hide irrelevant complexity, but pass values important to the test as explicit parameters; do not silently set them inside the helper. Place helpers used only in one test file at the bottom of that file; place helpers shared across test files in a separate helpers file.
- When asserting thrown errors, use a regular expression to match keywords that convey the error's meaning, rather than the entire message.
- Test observable behavior at the highest practical level without slowing down the test suite. Avoid assertions on implementation details that are likely to change or difficult to understand.
- Derive expected results independently from requirements or worked examples. Do not calculate them using the production code under test or duplicate its implementation in the assertion.
- Prefer real collaborators. Mock external services or nondeterministic dependencies when needed, keeping internal behavior real. Assert calls, arguments, or ordering only when they are part of the observable contract. Prefer an understandable high-level behavior check over introducing mocks solely to isolate a specific defect.
- When test data values are arbitrary, prefer using neutral placeholders such as `foo`, `bar`, `baz` for strings, or 1, 2, 3 for numbers. Avoid values that describe the test scenario or imply meaning readers need to interpret; keep cognitive load minimal.
