# Publish documentation from the docs branch

Public documentation lives in `website/`, while `docs/` remains internal documentation. Keep upcoming
package documentation on `main` and publish a single site from source on the `docs` branch, promoted
manually, so unreleased behavior does not automatically appear in the public reference. GitHub Pages
deploys on pushes to `docs` or manual workflow runs from that branch; npm releases and pushes to
`main` do not promote documentation.
