# Contributing to Sutra UI

Thanks for helping. This repository holds the `@sutra/ui` package (`packages/ui`) and its playground (`apps/playground`).

## Set up

```bash
pnpm install                # Node 22+, pnpm 9
pnpm playground             # the showcase at http://localhost:5173
pnpm --filter playground exec playwright install chromium   # once, for the layout audit
```

## Before you open a pull request

```bash
pnpm verify                 # typecheck, generated-file checks, all tests, the package build, export check, playground build
pnpm audit:all              # optional but welcome for UI changes: layout audit of every playground page (stock, paper, dark, RTL)
```

`pnpm verify` is the gate: CI runs it on every push and pull request.

## How components are written

Read [`packages/ui/CONVENTIONS.md`](packages/ui/CONVENTIONS.md) first. The short version:

- Tokens only (no raw colours, no `dark:` prefixes), logical utilities only (`ms-`, `pe-`, `start-`, `text-start`...), CSS-first motion that respects reduced motion, a hit area of at least 24 px.
- A new public component needs: a `forwardRef` + `displayName`, JSDoc on every public prop, tests (behaviour, axe, StrictMode, RTL where direction matters), a playground demo and nav entry, and a note in `docs/notes/<Name>.md` for primitives.
- Convention tests (`packages/ui/test/conventions.test.ts`, `rtl-conventions.test.ts`, `jsdoc-coverage.test.ts`) are ratchets: they fail when a count rises. Do not weaken a test to make a change pass.

## Generated files

Some files are generated and checked by `pnpm verify`; regenerate them instead of editing:

| Command | Writes |
| --- | --- |
| `node packages/ui/scripts/gen-index.mjs` (run in `packages/ui`: `pnpm gen:index`) | `src/index.ts`, `src/entries/core.ts` |
| `pnpm docs:gen` then `pnpm docs:llms` | `apps/playground/src/generated/*`, `docs/components`, `docs/hooks`, `llms.txt`, the skill references |
| `pnpm --filter @sutra/ui gen:springs` | the spring tokens in the stylesheets |
| `pnpm docs:baseline` | the JSDoc ratchet baseline (it may only go down) |

When public names are added, update the API snapshot with `npx vitest run test/api-surface.test.ts -u` (in `packages/ui`) and check that the diff only adds names.

## Commits and pull requests

- Small, focused commits with a message that says what changed and why.
- Add a line to the `Unreleased` section of [`CHANGELOG.md`](CHANGELOG.md) for anything a user of the package would notice, with a migration note for behaviour changes.
- Security problems: please report them privately (see [`SECURITY.md`](SECURITY.md)).
