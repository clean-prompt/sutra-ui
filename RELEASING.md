# Releasing @cleanprompt/sutra-ui

Releases are tag-driven: pushing a tag `vX.Y.Z` runs `.github/workflows/release.yml`, which verifies the repository and publishes `packages/ui` to npm with provenance.

## One-time setup

1. An npm account that owns the `@cleanprompt` scope (the npm organisation `cleanprompt`; the `NPM_TOKEN` must be allowed to publish to it).
2. In the GitHub repository: Settings > Secrets and variables > Actions > add `NPM_TOKEN` (an npm automation token with publish rights to `@cleanprompt/sutra-ui`).
3. Optional: Settings > Pages > Source: "GitHub Actions" to publish the playground (`.github/workflows/pages.yml`).

## Cut a release

1. `git switch main && git pull`, and make sure the working tree is clean.
2. Choose the version (0.x: breaking changes bump the minor, fixes and additions the patch). Edit `packages/ui/package.json` `"version"`.
3. In `CHANGELOG.md` rename `## [Unreleased]` to `## [X.Y.Z] - YYYY-MM-DD` and add a fresh empty `## [Unreleased]` above it. Migration notes for behaviour changes belong in the release section.
4. `pnpm verify` (it must be green) and `pnpm audit:all` (look at new findings).
5. Commit (`Release X.Y.Z`), tag and push:
   ```bash
   git commit -am "Release X.Y.Z"
   git tag vX.Y.Z
   git push origin main --tags
   ```
6. Watch the "Release" workflow. It refuses to publish when the tag does not match `packages/ui/package.json`.

Pre-releases: use a version such as `0.2.0-next.1` and the tag `v0.2.0-next.1`; the workflow publishes them under the `next` dist-tag, so `pnpm add @cleanprompt/sutra-ui@next` gets them and `latest` stays put.

## Checking a build locally

```bash
pnpm --filter @cleanprompt/sutra-ui build
cd packages/ui && npm pack --dry-run      # lists exactly what would be published
```

To try the package in another checkout (an app) without publishing, run `pnpm dev` in this repository and add `"@cleanprompt/sutra-ui": "link:../sutra-ui/packages/ui"` to the app's `package.json`. The package's stylesheet (`@cleanprompt/sutra-ui/styles.css`) already tells Tailwind v4 to scan the package's shipped `src`, so no extra `@source` rule is needed in the app; if components look unstyled, check that the app imports `@cleanprompt/sutra-ui/styles.css` after `tailwindcss`.
