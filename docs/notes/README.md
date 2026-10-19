# Component notes

One file per component family: `docs/notes/<Component>.md`, where `<Component>` is an exported name in `apps/playground/src/generated/api.json`.
The notes are the hand-written half of the docs: the props table is generated from the types, these say what the types cannot (when to use it,
keys, screen reader behaviour, reduced motion, server rendering, gotchas). Facts come from the component's source and tests, never from guesses.

`pnpm docs:gen` parses them into `apps/playground/src/generated/notes.json` (the "Notes" panel under every demo) and `pnpm docs:llms` folds them into
`llms-full.txt`, `docs/components/<Name>.md` and the Claude skill. `node packages/ui/scripts/gen-docs.mjs --notes-lint [Name ...]` checks notes
against the API index and the source. `test/docs-notes.test.ts` fails when a primitive module has no note.

## Template

```md
---
component: Select                     the exported component the note is about (a key of api.json)
module: primitives/select             must match api.json
covers: SimpleSelect, SelectTrigger   optional: other exports of the same module this note also explains
use: One or two sentences: what it is for (at least 20 characters).
instead: Combobox = the list is long; RadioGroup = options must stay visible     optional, `;` separated, `Name = reason`
server: mixed                         ssr-safe | mixed | client-only
---

## Keyboard
| Key | Action |
|---|---|
| Enter, Space | What it does |

A sentence after the table for what differs in RTL, or what has no keyboard path.

## Screen readers
Roles, names, states, live regions. Short paragraphs or `- ` bullets.

## Reduced motion
What moves, and what happens under `prefers-reduced-motion` (the net in `sutra.css`, or the component's own check).

## Server rendering
What the server HTML contains and what appears only after mount.

## Slots
- `data-slot-name`: what it is (optional; each name must appear as a `data-slot` literal in the module's source)

## Gotchas
- 2 to 4 bullets of things that surprise people, read from the source and the tests.

## Example
(optional) one tsx block, see below.
```

- A component with no keyboard interaction writes one sentence instead of the table ("Not focusable: no keyboard interaction.").
- Leave out `## Slots` when the module renders no `data-slot` (the generated reference lists slots anyway).
- `## Example` (optional) holds one ```tsx block: a small, self-contained module (its own `import` lines from `@sutra/ui` and an `export function Example()`), at most 30 lines,
  realistic and minimal (the props someone reaches for first, not every option). It is type-checked against the real source by
  `node packages/ui/scripts/gen-docs.mjs --notes-types [Name ...]` and `test/docs-note-examples.test.ts`, so a wrong prop name fails. It replaces the demo-derived
  example in `docs/components/<Name>.md` and shows under the notes in the playground.
- Inline code uses backticks only; no other markdown inside lines. No emojis. Under 5200 characters including the example.
- Several components in one module may each have a note (`Dialog.md` and `Sheet.md` both live in `primitives/dialog`); the note whose name
  is the longest prefix of a component name explains it, and `covers` adds explicit names.

## `server:` values

Every `.tsx` module carries `"use client"` in the build, so "server" here means what the first server render produces:

- `ssr-safe`: the same markup on the server and on the client; nothing waits for mount (closed overlays count: no content on either side).
- `mixed`: renders on the server, but part of it (a portalled layer that is open on first render, a measured size, a value label, a clock) only
  fills in after mount, or the server output differs until hydration.
- `client-only`: renders nothing or a placeholder on the server (canvas, camera, media queries needed for layout, browser-only APIs during render).
