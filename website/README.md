# Documentation website

The public documentation lives in `website/content/`. Internal architecture decisions and plans
remain in the repository's `docs/` directory. The site uses Docusaurus with separate guide and API
sidebars and hand-written reference pages.

## Local development

From the repository root, using Node.js 24:

```bash
npm ci
npm ci --prefix website
npm run docs:start
```

Open `http://localhost:3000/playwright-webext/`. The website has an independent package and lockfile;
root `npm ci` does not install its dependencies.

Before submitting changes:

```bash
npm run prettier
npm run tsc
npm run docs:typecheck
npm run docs:build
```

The production build fails on broken internal links. To preview that build, run `npm run docs:serve`.
Keep examples aligned with the source and focused package tests. Include behavioral caveats next to
the relevant example rather than on a separate limitations page.

## Publishing

Public URL: <https://vitalets.github.io/playwright-webext/>.

- `main` contains documentation for the upcoming package version.
- `docs` contains the source of the currently published documentation, not generated HTML.
- The `deploy-website` workflow checks pushes and pull requests targeting either branch. Pushes to
  `docs` deploy automatically. Manual workflow runs also deploy when run from `docs`; runs from other
  branches only validate the build.
- There is one published version. Promoting documentation is manual and independent of npm releases.

For the initial deployment, enable **Settings → Pages → Build and deployment → Source → GitHub
Actions** in the repository. Ensure the `github-pages` environment allows deployments from `docs`.
Then create `docs` from the commit whose package behavior should be documented and push it.

For subsequent releases, open a pull request from `main` to `docs` when its documentation is ready
for publication. Review it against the released package, then merge. If `main` contains changes
that should remain unpublished, promote selected commits through a branch based on `docs` instead.
Keep the website configuration, content, lockfile, root docs scripts, and workflow consistent.

Do not force-push for routine promotion. A docs-only correction can start from `docs`; carry it back
to `main` as well. Edit links on the deployed site target `docs`; local and `main` builds target `main`.
Changes to `main` alone never replace the published site.

## Manual deployment

After the workflow is present on the default branch, open **Actions → deploy-website → Run workflow**,
select the **docs** branch, and run it. This rebuilds and publishes the current `docs` source without
requiring another commit. It does not promote changes from `main`.

You can also use the GitHub CLI:

```bash
gh workflow run deploy-website.yaml --ref docs
```
