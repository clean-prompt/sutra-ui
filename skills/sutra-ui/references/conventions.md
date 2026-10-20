<!-- conventions-hash: 25c77953d965 -->
# Sutra UI conventions digest

A short version of `packages/ui/CONVENTIONS.md` for people and agents who use or extend the library. When the two disagree, CONVENTIONS.md wins; re-read it when the hash above no longer matches (`node packages/ui/scripts/gen-llms.mjs --update-conventions-hash` records the new one after you update this file).

## Stack and layers
- React 19, TypeScript strict, Tailwind CSS v4, Radix UI (`radix-ui`), `class-variance-authority`, Remix icons (`@sutra/ui/icons`). Relative imports inside the package.
- Layers in `packages/ui/src`, each importing only downward: `lib` (pure functions) and `hooks`, `assets` (marks, logos, flags), `primitives` (basic controls), `patterns` (domain-neutral compositions), `kits/<domain>` (ai, agent, billing, ops, ...), `blocks` (sections and pages), `entries` (one barrel per public subpath).
- Named exports only; every export name is unique across the package (prefix sub-parts with the family: `TableRow`, `DialogContent`). `src/index.ts` and `src/entries/core.ts` are generated (`pnpm gen:index`).

## Tokens, never raw colours
- Surfaces `bg-background | card | popover | subtle | muted | accent | secondary`, `bg-inverse text-inverse-foreground`, overlay scrim `bg-overlay`, `glass`. Text `text-foreground | text-muted-foreground | text-primary`. Borders `border-border | border-border-strong | border-input`, focus `ring-ring`.
- Brand `bg-primary hover:bg-primary-hover text-primary-foreground`, `bg-primary-soft text-primary-soft-foreground`. Status `success | warning | destructive | info`, each with `-foreground`, `-soft`, `-soft-foreground`.
- Radius `rounded-control` (buttons, inputs, chips) and `rounded-box` (cards, panels, popovers); `rounded-full` only for things that are always round. Shadows `shadow-xs ... shadow-3xl`.
- Never write a palette class (`bg-zinc-500`), a hex colour or a `dark:` override: dark mode and the paper style (`data-style="paper"`) retune the tokens. Charts read `--chart-1` ... `--chart-8` (`chartColorVars`).
- Fixed on-media colours use the `white` / `black` keywords or `color-mix(white N%)`; a fixed dark surface takes the `dark` class; use `light-dark()` instead of `dark:` pairs; categorical chips use `accentClasses.chip`. Literal colours that stay (brand and store art, ANSI and syntax palettes, mask stops, Badge colour names) are listed with a reason in `test/conventions.test.ts`.
- Control heights: sm `h-8`, md `h-9`, lg `h-10` (Button also has `xs`, `xl` and `icon-*` sizes).

## Vocabulary (one spelling per concept)
- Semantic colour is `tone`: `neutral | primary | success | warning | destructive | info`. Old spellings (`brand`, `default`, `warn`, `danger`, `error`) still work but are deprecated aliases. `variant` is for structure (soft, outline, solid, ghost). Categorical colour with no meaning is `accent`.
- Lifecycle is `TaskStatus`: `pending | running | succeeded | failed | canceled` (US spelling).
- Booleans are bare adjectives: `loading`, `active`, `disabled`. Empty content is `emptyState`. Dismissal is `onDismiss`. Density is `compact | normal | relaxed`.
- Controlled state: `value` / `defaultValue` / `onValueChange(value, meta?)`; `open` / `defaultOpen` / `onOpenChange`; `checked` / `defaultChecked` / `onCheckedChange`. Every controlled prop has its `default*` partner.
- Words: "Sign in", "canceled", "..." as an ellipsis character.
- Data components take `loading` (skeletons in the real layout, `aria-busy`, no skeleton flash when data is already shown) and `emptyState`.

## Shape of a component
- `React.forwardRef` plus `displayName` for DOM components, `...props` spread on the root, `className` merged last with `cn()`. Props that can be overridden (`type`, `role`, `aria-*`, `id`, `data-*` including `data-slot`) are spread after the defaults; refs, merged class and composed handlers come last.
- `asChild` renders the child instead of the element (Radix `Slot`). Compound parts are preferred over giant prop objects; a data-driven wrapper (`items`, `options`) is welcome.
- Each exported component has a one-line JSDoc; props say what they do and when to set them. `@deprecated Use \`tone\`.` marks aliases.
- `data-slot="..."` names are the stable styling hooks (listed per component in the playground "Styling hooks" page); `*ClassName` props exist only where a part needs one.
- Floating content goes through a portal with `z-50`, `sideOffset` 6.
- Before writing a pill, list, banner, picker or formatter, check `lib/`, `hooks/` and the "Build on the existing base" table in CONVENTIONS: `StatusBadge`, `Badge`, `Spinner`, `InlineAlert`, `AlertBanner`, `EmptyState`, `Item`, `Frame`, `Card`, `Collapse`, `ToggleGroup`, `StatCard`, `Progress`, `Meter`, `CopyButton` ...

## Right to left
- Logical utilities only: `ms-/me-`, `ps-/pe-`, `start-/end-`, `text-start/end`, `border-s/e`, `rounded-s/e`. Never `ml/mr/pl/pr/left/right/text-left/text-right`.
- Anything that is direction itself gets an `rtl:` partner: `translate-x-N` with `rtl:-translate-x-N`, `origin-left` with `rtl:origin-right`, directional glyphs (chevrons, arrows) with `rtl:-scale-x-100`. Media transport, undo and enter-key glyphs are not mirrored.
- Read direction with `useDirection()` (hooks) or `directionOf(el)` / `logicalArrow(event)` (lib); never `document.dir` ad hoc. Horizontal arrow keys follow the reading order. `DirectionProvider` forces or follows the document direction (also for portalled layers).
- Charts, code viewers, maps, QR codes and the media seek bar are deliberate `dir="ltr"` islands.
- Numeric runs inside text ("0 / 500", "3 of 12", percentages, deltas) go in `<bdi dir="ltr">`. `Tooltip`, `Popover` and `HoverCard` take `side="start" | "end"`; `Sheet` takes `start` / `end` sides.

## Motion
- Motion is CSS first; there is no animation library. One ease and four speeds are tokens on `:root`: `--sutra-ease`, `--sutra-duration-fast` (150 ms), `--sutra-duration` (200), `--sutra-duration-slow` (300), `--sutra-duration-fill` (500); springs `--sutra-spring-gentle | snappy | bouncy` drive `transition-spring*` for transform properties.
- Utilities: `animate-fade-in | fade-up | pop-in`, `animate-pop`, `animate-tick`, `animate-flash`, `chevron-turn`, `animate-in/out` (tw-animate-css), `scroll-reveal`, `spotlight`, `tilt`, `magnetic`. Animate a value only when it changes (key the element on the changed value), never on first render; in lists only newly added items animate in (`AnimatedList` and `Presence` do this).
- Reduced motion has one net in `sutra.css`: decorative loops and entrances stop, transitions end in 1 ms, overlay movement is stripped, `animate-spin` stays. Do not animate dense tables, log or code viewers, live data fills or anything with its own engine. Presence (`usePresence`, `Presence`, `AnimatedList`), `useFlip`, `useDrag`, `useViewTransition` are the building blocks; gesture components always have a keyboard path.
- In-app motion switch: `<html data-motion="reduce" | "full">` (none follows the system); `prefersReducedMotion()` / `usePrefersReducedMotion()` read it, so JS and CSS agree.
- In Tailwind v4 `translate-*`, `scale-*`, `rotate-*` set individual properties: use bare `transition-transform` (or name all four in an arbitrary list).

## Accessibility
- Roles and aria attributes are part of each component; icon-only buttons need `aria-label`; controls keep at least a 24 x 24 px hit area (`hitArea` from `lib/cn`).
- Dialog, AlertDialog, Sheet and CommandDialog give focus back to the opener even when opened without a trigger.
- A visually hidden data table (`div.sr-only`) backs every chart; empty `role=listbox` is avoided (the empty state is announced in a polite live region instead).

## Layout rules
- A grid with only breakpoint columns needs a base column (`grid-cols-1 sm:grid-cols-2`). Size components by their container (`@container`, `@md:`), not the window. Flex or grid children with text need `min-w-0`; rows that cannot fit need `flex-wrap`; icons `shrink-0`; wide content scrolls in its own `overflow-x-auto` block.

## Effects and tests
- Effects survive StrictMode remounts: reset refs that cleanups flip inside the effect body, cancel async work in cleanup, share one promise for lazy imports.
- Tests live in `packages/ui/test/*.test.tsx` (Vitest, jsdom, `<StrictMode>`); `pnpm verify` runs typecheck, index check, docs checks, tests, build and the exports check.
