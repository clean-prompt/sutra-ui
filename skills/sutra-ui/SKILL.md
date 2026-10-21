---
name: sutra-ui
description: Build interfaces with Sutra UI (@cleanprompt/sutra-ui), a React 19 + Tailwind v4 + Radix component library with tokens, tone and status vocabulary, RTL and CSS-first motion. Use when writing or reviewing React UI in a project that depends on @cleanprompt/sutra-ui or lives in the Sutra repo: finding the right component, its props and import path, styling with tokens, forms, overlays, charts, accessibility, right-to-left and reduced motion.
---

# Sutra UI

Sutra UI is `@cleanprompt/sutra-ui`: roughly a thousand exported components in four layers (primitives, patterns, kits, blocks), 90+ hooks, design tokens in three looks (light, dark, paper). This skill tells you how to find the right piece, how to call it correctly the first time, and which rules the library enforces. Do not guess prop names: look them up.

## 1. Look it up, do not guess

Fastest path first:

1. Know the name? Open its page: `docs/components/<Name>.md` (hooks: `docs/hooks/<name>.md`) in the Sutra repo, or `md/<Name>.md` on the docs site. A page has the import line, every prop with type, default and description, variants (`cva`), `data-slot` names, the notes (keyboard, screen readers, reduced motion, server rendering, gotchas) and, when a demo exists, a working example.
2. Do not know the name? Read `references/components.md` (one line per component family, grouped by layer) or search it for the job ("date", "upload", "tree", "chart"). `references/entries.md` lists what each import path contains and `references/sizing.md` what every size step sets (heights, padding, text, icon, targets under 24px).
3. Parts of a family (`DialogContent`, `TabsTrigger`) live on the family page (`Dialog`, `Tabs`) under "Part props".
4. Outside the repo, read `llms.txt` (index with links) or `llms-full.txt` (conventions plus every primitive) from the docs site.
5. Live demos: the playground, `#/components/<page>/<id>` (every demo has Code, Props and Notes panels). The "Styling hooks" page lists every `data-slot`, "Sizing" the size table of each control, "Form recipes" the form patterns.

Read the component page before using a component you have not used in this session. A wrong prop costs a round trip; reading costs seconds.

## 2. Install and import

```
pnpm add @cleanprompt/sutra-ui
```
```css
@import "tailwindcss";            /* Tailwind v4 */
@import "@cleanprompt/sutra-ui/styles.css";   /* tokens, animations, the reduced-motion net */
```
```tsx
import { Button, Dialog, DialogContent, Field, Input } from "@cleanprompt/sutra-ui"; // flat named exports, never default
import { RiAddLine } from "@cleanprompt/sutra-ui/icons";                            // the full Remix icon set
```
The same names come from subpaths by domain (`@cleanprompt/sutra-ui/overlays`, `forms`, `dataviz`, `motion`, `navigation`, ...; see `references/entries.md`). The editor, terminal and pdf entries need optional peers and are never in the root. Components are client components (`"use client"` in the build); import them from server components freely, they render to HTML on the server unless their note says otherwise.

## 3. Styling rules (the ones that get violated)

- Tokens only: `bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-destructive`... Never palette classes (`bg-zinc-500`), hex colours or `dark:` overrides; dark mode and the paper style retune the tokens.
- Radius `rounded-control` (buttons, inputs) and `rounded-box` (cards, panels, popovers). Control heights sm 32, md 36, lg 40 px.
- Merge your classes with `cn()` from `@cleanprompt/sutra-ui`; every component takes `className` and merges it last. Style parts through their `data-slot` or a `*ClassName` prop where one exists.
- Logical utilities only (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`, `border-s`); never `ml/mr/pl/pr/left/right/text-left`. A directional glyph needs `rtl:-scale-x-100`.
- Size by the container (`@container`, `@md:`), give flex or grid children with text `min-w-0`, and make wide content scroll inside its own `overflow-x-auto`.

## 4. Vocabulary (one spelling per concept)

| Concept | Prop | Values |
|---|---|---|
| Semantic colour | `tone` | `neutral`, `primary`, `success`, `warning`, `destructive`, `info` |
| Categorical colour (no meaning) | `accent` | named palette, token or any CSS colour |
| Structure | `variant` | soft, outline, solid, ghost, ... (not colour) |
| Job lifecycle | `status` | `pending`, `running`, `succeeded`, `failed`, `canceled` |
| Loading / empty | `loading`, `emptyState` | boolean, node; data components show skeletons in the real layout |
| Density | `density` | `compact`, `normal`, `relaxed` |
| Open state | `open`, `defaultOpen`, `onOpenChange` | |
| Value | `value`, `defaultValue`, `onValueChange(value, meta?)` | |
| Checked | `checked`, `defaultChecked`, `onCheckedChange` | |
| Dismiss | `onDismiss` | |
| Render as child | `asChild` | Radix Slot, for links as buttons |

Old spellings (`brand`, `warn`, `danger`, `onClose`, `emptyText`, `isLoading`) still compile but are deprecated aliases: write the canonical form. Words: "Sign in", "canceled".

## 5. Picking a component (common confusions)

- Action: `Button` (loading built in), `TextLink` for inline, `SplitButton` for a menu, `ToggleGroup` for loose toggles, `SegmentedControl` to switch a view.
- Choice: `Select` (short list), `Combobox` (long or searchable), `RadioGroup` (all visible), `WheelPicker` (touch), `DatePicker` / `DateRangePicker` / `DateTimePicker`, `TagInput`.
- Overlay: `Dialog` (modal), `AlertDialog` / `ConfirmDialog` (must answer), `Sheet` (edge panel), `Drawer` (touch bottom sheet), `Popover`, `Tooltip`, `DropdownMenu`, `CommandDialog` (palette). `DialogProvider` + `useDialogs()` for confirm and prompt from code.
- Feedback: `Toaster` (toasts), `InlineAlert` (in content), `AlertBanner` (page level), `Spinner`, `Skeleton`, `Progress`, `Meter`, `StatusBadge`, `EmptyState`.
- Data: `Table` and `DataTable`, `StatCard`, `LineChart` / `BarChart` / `AreaChart` / `DonutChart` / `Sparkline`, `TreeView`, `Markdown`, `CodeBlock`.
- Layout: `Card`, `Stack`, `HStack`, `Grid`, `Container`, `Frame`, `Item` (media + text + actions row), `SplitPane`.

Check `CONVENTIONS.md` "Build on the existing base" before building a new pill, list, banner or picker: a domain component is a small map onto an existing base.

## 6. Forms

`Field` wraps a control with label, hint and error and passes `id`, `invalid`, `required`, `disabled` and `aria-describedby` to it (`Input`, `Textarea`, `SimpleSelect`, `Combobox`, ... read them through the field context). Validate with `lib/validate` (`isEmail`, `isHttpUrl`) or your schema library, and wire submit state with `useAsyncAction` (busy, error, stale-run and unmount safe). There is no form-state library in Sutra: use react-hook-form or plain state; the playground "Form recipes" page shows both.

## 7. Right to left

Everything is logical, so setting `dir="rtl"` on `<html>` (or a `DirectionProvider`) flips layout, arrow keys, scroll offsets and gestures. In your own code read the direction with `useDirection()` and keys with `logicalArrow(event)`; do not read `document.dir`. Charts, code viewers, maps and QR codes stay left to right on purpose.

## 8. Motion and reduced motion

CSS first, on the tokens `--sutra-ease`, `--sutra-duration-fast | duration | duration-slow | duration-fill` and the spring tokens (`transition-spring`). Under `prefers-reduced-motion` a global net stops entrances and decorative loops and ends transitions in 1 ms; keep your own motion in CSS transitions or Tailwind `animate-*` classes so the net covers it, and gate script-driven motion with `usePrefersReducedMotion()`. Animate a value only when it changes, never on first render. Do not animate dense tables, logs or live data. Gesture components (`SwipeRow`, `SlideToConfirm`, `Drawer`, `Carousel`) always keep a keyboard path.

## 9. Accessibility checklist

Icon-only buttons take `aria-label`; every dialog needs a `DialogTitle`; give unlabeled inputs an `aria-label`; do not hide focus rings; keep hit areas at least 24 px; do not put information only in colour (use `StatusBadge` icons or text); charts ship a hidden data table, keep it. Each component's notes name what it announces and what you must pass.

## 10. Working in the Sutra repo

`packages/ui` (the package, `CONVENTIONS.md` has the rules), `apps/playground` (docs and demos), `docs/notes/<Name>.md` (hand-written notes), `docs/components` (generated pages, do not edit). After changing props or JSDoc run `pnpm docs:gen` then `pnpm docs:llms`; `pnpm verify` runs the checks. Read `references/conventions.md` before adding or changing a component.
