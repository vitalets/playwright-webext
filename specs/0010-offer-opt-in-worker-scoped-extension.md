# Offer opt-in worker-scoped extension reuse

Superseded by ADR-0011.

Introduce `extensionW` as an opt-in shared context to reduce repeated setup, with authors responsible
for shared-state cleanup. Read options from project settings to avoid changing existing fixture
scopes; this excludes resolved fixture dependencies and local overrides.

ADR 0011 replaces this separate configuration contract with author-defined fixtures.
