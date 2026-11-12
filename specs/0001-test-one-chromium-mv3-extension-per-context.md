# Test one Chromium MV3 extension per isolated context

Support one unpacked Chromium Manifest V3 extension per persistent context. The built-in
`extension` fixture creates a fresh profile for each test to isolate state and own cleanup;
authors can explicitly share a context through custom fixtures (ADR 0011). Multiple-extension
orchestration and branded-browser support remain outside the package's scope.

Load unmodified builds from their original directory to preserve path-derived development IDs.
Localization and upgrades use private copies because they modify extension files.
