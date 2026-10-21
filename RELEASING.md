# Releasing @cleanprompt/sutra-ui

Releases are tag-driven: pushing a tag `vX.Y.Z` runs `.github/workflows/release.yml`, which verifies the repository and publishes `packages/ui` to npm with provenance.

## One-time setup

1. An npm account that owns the `@cleanprompt` scope (the npm organisation `cleanprompt`; the `NPM_TOKEN` must be allowed to publish to it).
2. In the GitHub repository: Settings > Secrets and variables > Actions > add `NPM_TOKEN` (an npm automation token with publish rights to `@cleanprompt/sutra-ui`).
3. Optional: Settings > Pages > Source: "GitHub Actions" to publish the playground (`.github/workflows/pages.yml`).
4. Recommended, once the first release is out: **npm trusted publishing**, so no long-lived token is needed (see below).
5. Recommended: Settings > Rules > Rulesets: protect `main` and require the status check **Verify (typecheck, tests, build)**.

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
6. Watch the "Release" workflow. It refuses to publish when the tag does not match `packages/ui/package.json`. After it publishes to npm it also creates the GitHub Release for the tag, with the matching `CHANGELOG.md` section as the notes (a pre-release version gets the pre-release flag; a Release you already made by hand is left alone).

Pre-releases: use a version such as `0.2.0-next.1` and the tag `v0.2.0-next.1`; the workflow publishes them under the `next` dist-tag, so `pnpm add @cleanprompt/sutra-ui@next` gets them and `latest` stays put.

## npm trusted publishing (no token)

The workflow already asks npm for an OIDC login (`id-token: write`, npm 11.5.1 or newer) and falls back to the `NPM_TOKEN` secret. To drop the token:

1. On npmjs.com open the package > Settings > Trusted Publisher > GitHub Actions, and enter owner `clean-prompt`, repository `sutra-ui`, workflow filename `release.yml` (leave the environment empty). Under "Allowed actions" tick **Allow `npm publish`**: without it a trusted publisher may only run `npm stage publish`, which stages a version for manual approval. "Allow `npm dist-tag`" is not needed (the workflow sets the tag with `npm publish --tag`).
2. Cut a release (a `-next.N` pre-release is a safe first try). Check that the Release run publishes and the version page shows the provenance badge.
3. Only then delete the `NPM_TOKEN` repository secret and revoke the token on npmjs.com. Optionally set the package's publishing access to "Require two-factor authentication and disallow tokens".

## Checking a build locally

```bash
pnpm --filter @cleanprompt/sutra-ui build
cd packages/ui && npm pack --dry-run      # lists exactly what would be published
```

To try the package in another checkout (an app) without publishing, run `pnpm dev` in this repository and add `"@cleanprompt/sutra-ui": "link:../sutra-ui/packages/ui"` to the app's `package.json`. The package's stylesheet (`@cleanprompt/sutra-ui/styles.css`) already tells Tailwind v4 to scan the package's shipped `src`, so no extra `@source` rule is needed in the app; if components look unstyled, check that the app imports `@cleanprompt/sutra-ui/styles.css` after `tailwindcss`.
