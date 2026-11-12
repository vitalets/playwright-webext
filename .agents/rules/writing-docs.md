# Writing Docs

Apply this guidance when writing, editing, or reviewing READMEs, guides, API
references, and contributor documentation. Apply the language and accuracy rules
to plans, specs, and design documents too, while following their existing formats.
Code comments follow the project's code-commenting rules.

## Objective

Help the reader accomplish their task with as little reading as necessary.
Simplify the wording without losing technical meaning.

## Reader and structure

### Reader context

Identify the reader's task and expected knowledge from the request and existing
documentation. Explain what this reader needs; omit background they can
reasonably be expected to know. Ask only when missing context would change the
result.

**❌ Bad:**

In a setup guide for developers who already use TypeScript:

> TypeScript is a programming language that adds types to JavaScript. Install
> the package with `npm install example-client`.

**✅ Good:**

> Install the package with `npm install example-client`.

### Information order

Lead with the reader's task or the feature's purpose. Introduce implementation
details when they help the reader understand or use the feature. Explain the
underlying problem first when the solution would otherwise be confusing.

**❌ Bad:**

> The client uses a subscription registry and a file watcher. Call `watch()` to
> reload settings when the configuration file changes.

**✅ Good:**

> To reload settings when the configuration file changes, call `watch()`.

The internal registry does not help the reader use this feature.

### Document structure

Choose structure for the document's purpose. Use headings for distinct tasks or
lookup needs, and lists or tables for steps and comparisons. Keep related
explanatory sentences in connected paragraphs. Add introductions, conclusions,
troubleshooting, or next steps only when they supply useful information.

**❌ Bad:**

> ### Overview
> You can choose where generated files are saved.
>
> ### Configuration
> Set `outputDir` to the destination directory.
>
> ### Conclusion
> You now know how to choose where generated files are saved.

**✅ Good:**

> Set `outputDir` to choose where generated files are saved.

A short explanation needs no section template; a longer guide may need several
headings to make its tasks easy to find.

## Language

### Word choice

Use familiar words, concrete subjects, and direct verbs. Keep established
technical terms when they are precise. Prefer active voice when the actor
matters, but do not rewrite clear passive sentences mechanically.

**❌ Bad:**

> Automatic installation of the extension is performed by the fixture prior to
> the commencement of the test.

**✅ Good:**

> The fixture installs the extension before the test starts.

Keep “fixture”: it names the exact concept the reader uses.

### Conditions and behavior

Keep conditions close to the behavior they qualify. Split sentences when
several conditions or actions make them difficult to follow, while preserving
their relationship.

**❌ Bad:**

> The client retries the request, using the configured delay between attempts,
> if the server returns a temporary error, until the retry limit is reached.

**✅ Good:**

> If the server returns a temporary error, the client retries the request until
> it reaches the retry limit. It waits for the configured delay between attempts.

### Factual tone

Describe features without praise or unsupported claims. Replace promotional
wording with the feature's purpose, not an invented measurement.

**❌ Bad:**

> This powerful, seamless cache makes repeated downloads incredibly fast.

**✅ Good:**

> The cache reuses downloaded files for later requests.

## Information and examples

### Repeated information

Remove repeated facts and prose that merely narrates nearby code. Keep prose
that adds purpose, a prerequisite, timing, a consequence, or a limitation. Do
not explain obvious substitutions for sample values.

**❌ Bad:**

> Set `outputDir` to `./dist`, as shown below. Replace `./dist` with your own
> output directory. The path is relative to the configuration file.

```ts
export default { outputDir: './dist' };
```

**✅ Good:**

> The output path is relative to the configuration file.

```ts
export default { outputDir: './dist' };
```

The path's base directory is necessary information that the code cannot convey.

### Prerequisites and caveats

Keep prerequisites and caveats near the behavior they affect. Retain
explanations that change how the reader must use an example, even when a method
name appears self-explanatory.

**❌ Bad:**

> Call `start()` and wait for the `ready` event. See Limitations for event timing.

**✅ Good:**

> Subscribe to the `ready` event before calling `start()`: the event can fire
> before `start()` returns.

### Shared documentation

Link to authoritative documentation for background details and explain the
project's additions or differences locally. Keep enough context for the reader
to complete the task. Give shared setup or configuration a primary home and link
to it instead of repeating it across pages.

**❌ Bad:**

On an API page, when authentication already has a dedicated setup guide:

> Before calling `upload()`, create an account, generate a token, save it in
> `EXAMPLE_TOKEN`, and pass it to the client constructor.

**✅ Good:**

> `upload()` requires an authenticated client. Follow the
> [authentication setup](./authentication.md) before using this example.

### Example scope

Use the smallest example that demonstrates a useful reader task. Keep details
needed to understand the result; omit unrelated setup and checks. In testing
guides, demonstrate useful behavior rather than internal identities or counts,
unless those facts are the subject of the page.

**❌ Bad:**

In a guide to saving settings, with `settings` already introduced:

```ts
import { settings } from './settings';
import { initializeApp } from './app';
import { refreshTheme } from './theme';
import { showNotification } from './notifications';

async function updatePreferences() {
  await initializeApp();
  await settings.save({ theme: 'dark' });
  refreshTheme();
  showNotification('Settings saved');
}
```

**✅ Good:**

```ts
import { settings } from './settings';

await settings.save({ theme: 'dark' });
```

### Example setup

Make complete examples usable with the imports and setup they need. Mark
partial snippets clearly or rely on context already established on the page.
Do not repeat full setup around every snippet.

**❌ Bad:**

Presented as a complete example, with no earlier setup:

```ts
await client.upload('./report.csv');
```

**✅ Good:**

```ts
import { client } from './client';

await client.upload('./report.csv');
```

### Snippet location

Show the filename when the snippet's location matters.

**✅ Example:**

> Add the configuration to `example.config.ts` in the project root:

```ts
export default { outputDir: './dist' };
```
