# Initialize extension documents and workers from a prepared build

Provide `extensionInitScript` as a path to a JavaScript file. Run the same script before application
code in extension documents and on every background-worker start. Authors choose their own API
adjustments and can distinguish contexts using location or the presence of `document`. Initialization
is synchronous; asynchronous work may continue after application code starts.

Register document initialization before installation through Playwright. `BrowserContext.addInitScript()`
does not run in service workers, so point the prepared manifest at a generated sibling entry that imports initialization before the original
worker. Use ordered static imports for module workers and `importScripts()` for classic workers.
Putting initialization statements before a static import would not provide the required order.
This changes the loaded manifest and worker URL but leaves original worker files untouched.

Combine initialization and localization in one private temporary directory per extension instance.
Write the adjusted manifest and generated files, create real directories where overrides are needed,
and link unchanged files and whole subdirectories. Fall back to copying when links are unavailable.
For localization, expose only the selected catalog under a physical `_locales` directory. Never run
in-place localization mutations through links into the source build.

Do not cache prepared directories initially. Recreating shallow links keeps cleanup and parallel
configuration ownership simple. Keep the same private root during upgrades, replace its contents
with links to the new build, and reapply initialization and localization. Links reference a live build,
not a snapshot; rebuilds during running tests are unsupported. Moving the root can change a
path-derived extension ID.

Local experiments confirmed classic and module initialization before dependencies and installation
listeners, linked extension resources, and combined localization and upgrades preserving identity
and storage. A 1,000-file nested asset directory took about 2 ms to prepare; 1,000 loose root files took
about 120 ms on the same Mac. Cross-platform timings vary. These measurements favor recreating links
over introducing cache invalidation and shared lifetimes now.

CDP pause/inject/resume was considered but would require coordination with Playwright worker startup.
Evaluating after its `serviceworker` event is too late to guarantee initialization ordering.
