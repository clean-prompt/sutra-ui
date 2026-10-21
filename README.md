# Sutra UI

The Sutra design system: React 19 components, tokens, hooks, brand assets and page blocks on Tailwind CSS v4 and Radix. This repository holds the publishable package (`@cleanprompt/sutra-ui`) and its playground; the Sutra suite apps live in a separate repository and consume the package from npm.

[Contributing](CONTRIBUTING.md) · [Releasing](RELEASING.md) · [Security](SECURITY.md) · [Changelog](CHANGELOG.md) · MIT licence

| Path | What |
| --- | --- |
| `packages/ui` | **@cleanprompt/sutra-ui**: design tokens, components (primitives, patterns and domain kits), hooks, assets and blocks |
| `apps/playground` | Vite showcase for every component and block; also serves `llms.txt`, `llms-full.txt` and the per-component markdown at `/md/` |
| `docs/` | Written and generated docs: `notes/<Name>.md` (hand-written per-component notes), `components/` and `hooks/` (generated reference pages) |
| `design/` | Brand and design-review material (`brand/` holds the crescent mark sources, `brand-options/` the earlier logo options); not shipped |
| `skills/sutra-ui` | A Claude skill for building with Sutra: `SKILL.md` plus `references/` (`components.md`, `entries.md`, `sizing.md` are generated, `conventions.md` is a hand-written digest of CONVENTIONS.md) |

```bash
pnpm install
pnpm playground   # run the showcase (Vite, http://localhost:5173)
pnpm build        # build @cleanprompt/sutra-ui to packages/ui/dist
pnpm typecheck    # tsc in every workspace package
```

How components are written, where new files go and which base to build on: [`packages/ui/CONVENTIONS.md`](packages/ui/CONVENTIONS.md).

## Using @cleanprompt/sutra-ui in an app

The package needs **React 19** and **Tailwind CSS v4**.

```css
/* app/globals.css */
@import "tailwindcss";
@import "@cleanprompt/sutra-ui/styles.css";
```

Load the Geist and Geist Mono fonts (Google Fonts, or `next/font`/`geist` in Next.js). Without them the stack falls back to the system UI font.

```tsx
import { Button, Toaster, toast, SutraLogo } from "@cleanprompt/sutra-ui";

export function Example() {
  return (
    <>
      <SutraLogo />
      <Button onClick={() => toast.success("Saved")}>Save</Button>
      <Toaster />
    </>
  );
}
```

### Claude skill

`skills/sutra-ui` teaches a Claude agent how to find components, call them correctly and follow the conventions. To use it, copy or symlink the folder to `.claude/skills/sutra-ui` (one project) or `~/.claude/skills/sutra-ui` (all projects). It looks components up in `docs/components/<Name>.md` and `docs/hooks/<name>.md` of this repo; in an app outside the repo, point the agent at the `llms.txt` / `llms-full.txt` the playground serves. `pnpm docs:llms` refreshes the generated parts.

### Theming

Every color, radius and shadow is a CSS variable (`src/styles/sutra.css`). Set these on `<html>` or on any subtree:

| Attribute | Values |
| --- | --- |
| `class="dark"` or `data-theme="dark"` | Dark mode |
| `data-brand` | `indigo` (default), `blue`, `sky`, `cyan`, `violet`, `rose`, `lime`, `green`, `yellow`, `orange`, `red` |
| `data-neutral` | `zinc` (default), `slate`, `gray`, `stone` |
| `data-radius` | `rounded` (default), `pill`, `square` |
| `data-style` | `paper`: a calm, monochrome style (warm paper and ink, pure black in dark mode, hairline borders, flat, system font, tight headlines). Needs `@import "@cleanprompt/sutra-ui/paper.css";` after the base styles. The ink is the accent, so `data-brand` and `data-app` have no effect in it; status colors keep their hues. Set it on `<html>` to reach portaled layers (dialogs, popovers, menus) too |
| `data-app` | `notes`, `tasks`, `calendar`, `mail`, `files`, `journal`, `finance`, `habits`: retunes the brand scale to that app's accent (exposes `--app-from` / `--app-to`) |

`useTheme()` reads and sets mode, brand, neutral, radius and style on `<html>` (`style: "paper"` sets `data-style`). Tokens are Tailwind utilities (`bg-primary`, `text-muted-foreground`, `rounded-control`, `rounded-box`, `shadow-lg` …) and JS values (`colors`, `chartColors`, `typography`, `spacing`, `radii`, `shadows`, `breakpoints`, `grid`).

## Imports

The build emits one ES module per source file. `"use client"` is added only to modules that need it (components and hooks; not `lib/`, re-export barrels or plain `.ts` files without React runtime imports), and `forwardRef` components are emitted as pure expressions, so bundlers tree-shake per export: `import { Button } from "@cleanprompt/sutra-ui"` stays small. Subpaths give narrower imports and faster type-checking.

| Import | Holds |
| --- | --- |
| `@cleanprompt/sutra-ui` | Every asset, primitive, pattern, kit module and block, plus the `/tokens` foundations. **Not** the Remix icon set (`/icons`), the formatting and date helpers (`/format`, subpath only) or the optional-peer modules (`CodeEditor` → `/code-editor`; `RichTextEditor` → `/rich-text-editor`; `Terminal` → `/terminal`; the PDF viewer → `/pdf`) |
| `@cleanprompt/sutra-ui/styles.css` | Tokens, Tailwind theme and the component CSS (`src/styles/sutra.css`, which `@import`s the component files next to it; Tailwind inlines them, so one import delivers every rule) |
| `@cleanprompt/sutra-ui/paper.css` | The optional paper style (`src/styles/paper.css`); import it after `styles.css` and set `data-style="paper"` |
| `@cleanprompt/sutra-ui/blocks/registry` | `blockRegistry`, `blockCategoryLabels`, demo fixtures and mocks (demo-only; the same names on `@cleanprompt/sutra-ui` and `/blocks` are deprecated) |

Subpath entries, generated from `src/entries/*.ts` (one barrel per subpath; modules are listed by file name):

| Import | Holds | Modules |
| --- | --- | --- |
| `@cleanprompt/sutra-ui/core` | Every primitive (src/primitives), the basic controls everything else builds on | every module in `src/primitives` (the list is generated: `src/entries/core.ts`) |
| `@cleanprompt/sutra-ui/tokens` | Design tokens, `cn` and the focus ring and hit-area classes, the tone / status / accent / direction vocabulary (`directionOf`, `logicalArrow`, `inlineSign` …), the spring maths, a few small helpers (`isEmail`, `isHttpUrl`, `isSafeHref`, `colorForSeed`, `initials`), the types that public props name, and the generic hooks. An explicit list: the other `lib/` and `hooks/` modules (`clamp`, `pad2`, `useLatestRef`, `useIsoLayoutEffect` …; the formatters are in `/format`) are internal | `tokens`, `cn`, `accent`, `tone`, `status`, `direction` (all the direction helpers), `validate` (`isEmail`, `isHttpUrl`, `isSafeHref`), `hash` (`colorForSeed`), `text` (`initials`), `spring`, `gesture` (the option defaults), `use-controllable-state`, `use-copy`, `use-theme`, `use-now`, `use-media-query`, `use-resize-observer`, `use-async-action`, `use-safe-id`, `use-active-indicator`, `use-scroll-edges`, `use-scrollable`, `use-rolling-series`, `use-marquee-selection`, `use-camera`, `use-merged-refs`, `use-object-url`, `use-debounced-value`, `use-previous`, `use-disclosure`, `use-scroll-sections`, `use-presence`, `use-added-keys`, `use-change-key`, `use-return-focus`, `use-spring-value`, `use-stagger`, `use-typewriter`, `use-drag`, `use-swipe-dismiss`, `use-pan`, `use-flip`, `use-view-transition`, `use-scroll-progress`, `use-pointer-vars`, `use-direction`, `use-rect-morph` |
| `@cleanprompt/sutra-ui/format` | Number, duration, date and relative-time formatters and the date helpers behind them. **Subpath only**: not exported from the root, so the generic names (`toMs`, `formatCompact`, `formatDuration` …) cannot collide with yours. `formatBytes` is on the root | `format`, `duration`, `time` (`pad2` stays internal), `relative-time`, `token-count` |
| `@cleanprompt/sutra-ui/forms` | Form controls, the filter bar and the drag-selection area | `label`, `field`, `input`, `input-group`, `input-otp`, `textarea`, `number-input`, `tag-input`, `checkbox`, `radio`, `switch`, `select`, `calendar`, `date-picker`, `segmented-control`, `slider`, `rating`, `file-upload`, `dropzone`, `combobox`, `password-strength`, `wheel-picker`, `filter-bar`, `selection-area` |
| `@cleanprompt/sutra-ui/overlays` | Tooltips, popovers, dialogs, menus, the command palette and the fan menu | `tooltip`, `info-tooltip`, `popover`, `dialog`, `confirm`, `dropdown-menu`, `context-menu`, `command-menu`, `fan-menu` |
| `@cleanprompt/sutra-ui/navigation` | Breadcrumbs, pagination, tabs, headers, sidebars, trees, `SearchTrigger`, `DividedGrid` and blog content (`BlogContent`, `BlogPostHeader`, `BlogTableOfContents`) | `breadcrumbs`, `pagination`, `tab-menu`, `tabs`, `header-navigation`, `sidebar-navigation`, `section-header`, `tree-view`, `section-rail`, `carousel`, `step-wizard`, `blog-content` |
| `@cleanprompt/sutra-ui/dataviz` | Charts, stat cards, ranked bar lists, metric heroes, treemaps, meters and gauges | `chart` (bar, line, area, donut, funnel, waterfall, scatter, radar), `stat-card`, `bar-list`, `metric-hero`, `treemap`, `meter`, `gauge`, `sparkline`, `animated-number` |
| `@cleanprompt/sutra-ui/motion` | Enter and exit presence, animated lists, split, typed, decoded and fading text (hooks `usePresence`, `useSpringValue`, `stagger` and the spring maths are in `@cleanprompt/sutra-ui/tokens`) | `presence`, `animated-list`, `split-text`, `typewriter`, `morph-pill`, `shared-element`, `scroll-reveal`, `scroll-stage`, `pointer-fx`, `check-burst`, `morph-dialog`, `decode-text`, `fade-text` |
| `@cleanprompt/sutra-ui/mobile` | Bottom tab bar, drawer, lightbox, file viewer, split pane, presence, swipe, pan and zoom surfaces | `bottom-tab-bar`, `drawer`, `lightbox`, `file-viewer`, `split-pane`, `presence`, `swipe-row`, `swipe-deck`, `pan-surface`, `zoom-pan` |
| `@cleanprompt/sutra-ui/assets` | Brand marks (the crescent mark, a crescent bead on an upright thread: mono `glyph`, `tile`, `reversed`, theme-following `solid`, `outline`, `badge`), the drawn wordmark, logos, mono / reversed / dyed app icons, `SutraMascot` (eight characters, from the Bead buddy to the full-body Sutradhar, each with eight states), `SutradharSting` (the brand animations: the Sutradhar with the mark, the astra or the endless astra), `Marquee`, flags, file formats (ink on paper in the paper style), emoji reactions with an ink-on-paper set (`InkEmoji`: solid by default, tint or outline, with motion on hover and when someone reacts) and icon wrappers (Remix icons live in @cleanprompt/sutra-ui/icons) | `brand`, `mascot`, `sutradhar-sting`, `placeholder-logos`, `icons`, `country-flags`, `emoji-reactions`, `emoji-ink`, `file-format`, `empty-state-illustration`, `backgrounds`, `qr-placeholder`, `device-frame`, `device-icons` |
| `@cleanprompt/sutra-ui/icons` | Icon, FeaturedIcon and the full Remix Icon set | `icons`, `@remixicon/react` |
| `@cleanprompt/sutra-ui/blocks` | Composed sections and pages | `auth-blocks`, `auth-pages`, `dropdown-menu-blocks`, `header-navigation-blocks`, `sidebar-navigation-blocks`, `section-header-blocks`, `modal-dialog-blocks`, `kunji-blocks`, `marketing-blocks`, `statement-hero` |
| `@cleanprompt/sutra-ui/ai` | Chat, prompt and streaming-text components, plus the code block | `text-shimmer`, `markdown`, `chain-of-thought`, `chat-attachment`, `chat-conversation`, `chat-list-view`, `conversation-list`, `inline-edit-text`, `chat-loader`, `chat-message`, `chat-message-actions`, `favicon`, `chat-source`, `chat-tool`, `prompt-input`, `prompt-suggestion`, `text-caret`, `context-meter`, `status-strip`, `job-banner`, `question-card`, `slash-menu`, `model-picker`, `usage-summary`, `conversation-sidebar`, `clarify-settled`, `undelivered-notice`, `code-block`, `usage-quota`, `model-state`, `model-select`, `embeds` |
| `@cleanprompt/sutra-ui/agent` | UI for agentic coding assistants (tool timeline, permissions, plans, rewind, composer, tasks, sessions, usage) | `tool-timeline`, `diff-viewer`, `chain-of-thought`, `permission-prompt`, `agent-mode`, `plan-review`, `rewind`, `agent-composer`, `prompt-input`, `model-select`, `model-state`, `chat-tool`, `agent-tasks`, `agent-sessions`, `agent-processes`, `inline-edit-text`, `agent-transcript`, `agent-usage`, `agent-onboarding`, `agent-browser`, `artifacts`, `git-review`, `approval-stack` |
| `@cleanprompt/sutra-ui/agent-admin` | Managing an AI agent (capabilities, automation, providers & models, channels & multi-agent) | `llm-providers`, `model-routing`, `backends`, `local-models`, `channels`, `agent-room`, `subagents`, `agent-persona`, `remote-screen`, `cron`, `agent-jobs`, `status-stack`, `webhooks`, `capabilities`, `monogram`, `tool-toggles`, `mcp`, `extensions-catalog`, `schema-form`, `slot-outlet` |
| `@cleanprompt/sutra-ui/workspace` | Workspace/profile switcher, connections, notices, tours, keybinds, timeline rail, tiling layout, kanban, memory map | `workspace-switcher`, `notice-bar`, `coachmarks`, `keybind-editor`, `timeline-rail`, `tiling-layout`, `kanban-model`, `kanban-card`, `kanban-board`, `kanban-toolbar`, `kanban-task-dialog`, `orchestration-panel`, `memory-map` |
| `@cleanprompt/sutra-ui/system` | System-monitor screens: volume mixer, device batteries, dev servers, containers, thermals and fans, alert rules | `volume-mixer`, `device-battery`, `dev-servers`, `containers`, `thermals`, `alert-rules`, `volume-slider`, `battery-level`, `port-badge`, `metric-readout` |
| `@cleanprompt/sutra-ui/suite` | Keyboard shortcuts and suite-native components (mentions, backlinks, quick capture, timeline, sync) | `shortcuts`, `entity-mention`, `backlinks`, `quick-capture`, `today-timeline`, `sync-status` |
| `@cleanprompt/sutra-ui/ops` | Log viewer, transfer queues and streaming progress | `log-viewer`, `transfer-list`, `progress-dialog`, `heatmap`, `timeline-bar`, `node-card`, `process-table`, `alert-group`, `json-viewer`, `request-inspector`, `model-row`, `model-state` |
| `@cleanprompt/sutra-ui/identity` | QR codes, settings, sessions, lock and boot screens | `qr-code`, `qr-scanner`, `settings`, `key-value`, `empty-state`, `loading-screen`, `device-sessions`, `theme-toggle` |
| `@cleanprompt/sutra-ui/kunji` | kunji sign-in widget, client, linking, access gate, auth problems and sign-in blocks | `kunji-client`, `kunji`, `kunji-blocks` |
| `@cleanprompt/sutra-ui/security` | Authenticator codes, secrets, recovery keys, consent, API keys, credentials, payment cards, connected apps | `totp`, `secret`, `recovery-key`, `consent`, `api-keys`, `credential-card`, `payment-card`, `connected-apps` |
| `@cleanprompt/sutra-ui/billing` | Plans, comparison, current plan, credits and auto-reload, invoices, banners, checkout | `billing` |
| `@cleanprompt/sutra-ui/media` | Video and audio players, media controls, queue, poster/album cards, shelves, cast picker | `media-controls`, `video-player`, `audio-player`, `media-cards`, `cast-picker` |
| `@cleanprompt/sutra-ui/voice` | Speech input, read-aloud, language picker, translation panes, transliteration, dictionary, the assistant orb (Idle / Listening / Thinking / Speaking, in eight looks: glass orb, waveform, mala ring, Sutra string, ink drop, thread rings, dot graph, halftone) | `voice`, `translate`, `assistant-orb` |
| `@cleanprompt/sutra-ui/social` | App launcher, identity avatars (people, agents, machines and apps, presence as a mark or a bead), PWA install, calls, messenger, lists, counters, recurrence | `app-launcher`, `identity-avatar`, `text-button`, `install-prompt`, `call-overlay`, `messenger`, `reorderable-list`, `countdown`, `stopwatch`, `tally-counter`, `status-cycle` |
| `@cleanprompt/sutra-ui/editor` | The editor chrome, no engine and no optional peer: toolbar, outline, status bar, diff, version history and comments | `editor-toolbar`, `document-outline`, `editor-status`, `diff-viewer`, `version-history`, `comments` |
| `@cleanprompt/sutra-ui/code-editor` | CodeMirror 6 `CodeEditor` (needs the optional `@codemirror/*` peers; not on the root) | `code-editor` |
| `@cleanprompt/sutra-ui/rich-text-editor` | TipTap 3 `RichTextEditor` and `RichTextToolbar` (needs the optional `@tiptap/*` peers; not on the root) | `rich-text-editor` |
| `@cleanprompt/sutra-ui/terminal` | xterm.js terminal (needs the optional @xterm/xterm and @xterm/addon-fit peers) | `terminal` |
| `@cleanprompt/sutra-ui/pdf` | PDF viewer, thumbnail and a `FileViewer` renderer (optional peer: `pdfjs-dist`) | `pdf-viewer` |
| `@cleanprompt/sutra-ui/geo` | World maps and an interactive globe from bundled Natural Earth outlines (no tiles, no network): choropleth with a stepped legend, marker buttons with clustering, great-circle arcs; the globe adds drag with momentum, wheel/pinch/keyboard zoom, auto-rotation, fly-to and a control bar. Plus the projection, rotation, clustering, colour-scale and country-code helpers, and `LiveVisitorsMap` (live analytics screen). `SignInMap` (with impossible-travel detection) lives in `@cleanprompt/sutra-ui/identity` and `/security`; `RegionStatusMap` in `@cleanprompt/sutra-ui/ops` | `world-map`, `globe`, `geo-marker-layer`, `geo-model`, `world-data`, `live-visitors-map` |

Markdown math (`<Markdown math>`) needs the KaTeX stylesheet: `import "katex/dist/katex.min.css"`.

kunji sign-in makes no third-party requests: `createKunjiClient` draws the QR itself and only talks to your app's own endpoints. The hosted `rp.js` widget is opt-in through `createRpScriptAdapter()`.

### Deep imports

A single module is importable by its source path:

| Path | Example |
| --- | --- |
| `@cleanprompt/sutra-ui/primitives/<file>` | `@cleanprompt/sutra-ui/primitives/date-picker` |
| `@cleanprompt/sutra-ui/patterns/<file>` | `@cleanprompt/sutra-ui/patterns/markdown` |
| `@cleanprompt/sutra-ui/kits/<domain>/<file>` | `@cleanprompt/sutra-ui/kits/ai/chat-message` |
| `@cleanprompt/sutra-ui/blocks/<file>` | `@cleanprompt/sutra-ui/blocks/auth-blocks` |
| `@cleanprompt/sutra-ui/assets/<file>` | `@cleanprompt/sutra-ui/assets/country-flags` |
| `@cleanprompt/sutra-ui/components/<name>` | **Deprecated.** The pre-split paths; 233 explicit aliases in `package.json` `exports` point each old name at its new module (`components/accordion` → `primitives/accordion`) |

The keys are explicit (`pnpm gen:index` writes them; there are no wildcards). Modules named `*-internal` have no path, and `lib/` and `hooks/` have none either: their public part is `@cleanprompt/sutra-ui/tokens`.

### Optional peers

`@cleanprompt/sutra-ui/code-editor` needs `@codemirror/*` (`state`, `view`, `commands`, `language`, `search`, `lang-markdown`) and `@cleanprompt/sutra-ui/rich-text-editor` needs `@tiptap/*` (`react`, `starter-kit`, `extension-link`, `extension-placeholder`, `pm`); each imports its engine statically, so install the peers before you import the entry, and an app with only one of the two engines installed imports only that entry (`@cleanprompt/sutra-ui/editor` itself needs neither). `@cleanprompt/sutra-ui/terminal` needs `@xterm/xterm` and `@xterm/addon-fit` (plus `import "@xterm/xterm/css/xterm.css"`); `@cleanprompt/sutra-ui/pdf` needs `pdfjs-dist` (pass its legacy worker URL as `workerSrc`). They are optional peer dependencies and nothing reachable from the root imports them, so apps that don't use those entries don't install them. `scripts/check-exports.mjs` imports every subpath of the built package with all optional peers hidden and fails if one other than the two engine entries needs a peer at import time (`terminal` and `pdf` load theirs lazily).

### Hard dependencies

Some dependencies serve a single domain. They are intentional hard dependencies (small, or loaded lazily), not optional peers:

| Dependency | Used by |
| --- | --- |
| `d3-force` | `kits/workspace/memory-map` |
| `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` | `kits/workspace/kanban-board` |
| `diff` | `patterns/diff-viewer` |
| `jsqr` | `kits/identity/qr-scanner` (dynamic `import()`, loaded when scanning starts) |
| `uqr` | `kits/identity/qr-code` |
| `react-markdown`, `remark-gfm`, `remark-math`, `rehype-katex`, `katex` | `patterns/markdown` |

Shared across the package: `radix-ui`, `@remixicon/react`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`, `cmdk`, `input-otp`, `react-day-picker`, `sonner`.

## Package layout (`packages/ui/src`)

| Folder | Holds | May import |
| --- | --- | --- |
| `lib/` | Pure, typed helpers (formatters, tokens, tone, status, cron, rrule …). No React components | `lib` |
| `hooks/` | Generic React hooks | `lib`, `hooks` |
| `assets/` | Brand marks, logos, flags, icon wrappers, illustrations | `lib`, `hooks`, `assets` |
| `styles/` | `sutra.css` (tokens, themes, base, utilities; it ends with `@import`s of the component CSS: `mark-intro`, `orb`, `identity-avatar`, `motion-effects`, `mascot`, `ink`), `paper.css`; `@source "../"` scans the shipped `src`, so `files` must keep `src` | — |
| `primitives/` | Basic controls (Button, Input, Dialog, Badge …) | the four above + `primitives` |
| `patterns/` | Composed, domain-neutral views (Markdown, DiffViewer, TilingLayout …) | + `patterns` |
| `kits/<domain>/` | Domain features: `ai`, `agent`, `agent-admin`, `identity`, `billing`, `workspace`, `ops`, `media`, `voice`, `social`, `editor`, `terminal`, `system`, `geo` | + `patterns`, its own kit, and the kits listed for it in `KIT_DEPS` |
| `blocks/` | Composed sections and pages; `registry.tsx` + `demo-data.ts` are the demo registry | anything |
| `entries/` | One barrel per public subpath | anything |
| `index.ts` | Root barrel, **generated** by `scripts/gen-index.mjs` (as is `entries/core.ts`) | anything |

`test/layering.test.ts` enforces the import rules and holds the `KIT_DEPS` table.

## Scripts

Run in `packages/ui` (or from the root with `pnpm --filter @cleanprompt/sutra-ui <script>`):

| Script | Does |
| --- | --- |
| `pnpm dev` | `tsup --watch` |
| `pnpm build` | Build to `dist/` (per-module ESM, `"use client"` where needed, pure annotations, `.d.ts` via `tsc`) |
| `pnpm test` / `pnpm test:watch` | Vitest (jsdom, every test under `<StrictMode>`) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm gen:index` | Regenerate `src/index.ts` and `src/entries/core.ts` from the folders |
| `pnpm check:index` | Fail if those generated files are stale |
| `pnpm check:exports` | After a build: every `exports` subpath resolves, ships its types, and imports under plain Node ESM from `dist` |
| `pnpm gen:springs` | Regenerate the spring tokens in `styles/sutra.css` and `paper.css` (`--check` runs in `verify`) |
| `pnpm gen:motion-net` | Regenerate the `data-motion="reduce"` twin of every reduced-motion `@media` block in `styles/*.css` (the marked generated regions; `--check` runs in `verify` and in `test/motion-net-gen.test.ts`) |
| `pnpm gen:docs` / `pnpm check:docs` | Regenerate / check (`check:docs` runs both the props check and the llms check; `check:docs:api` only the first; `baseline:docs` rewrites the ratchet baseline) the props reference `apps/playground/src/generated/api.json` and the notes `notes.json` (TypeScript compiler API + JSDoc + `docs/notes/*.md`); `test/jsdoc-coverage.test.ts` is the ratchet for missing prop descriptions |
| `pnpm gen:llms` | Regenerate `llms.txt`, `llms-full.txt`, `docs/components`, `docs/hooks` and `skills/sutra-ui/references` (`--check` runs in `verify`) |
| `pnpm check:llms` | Check the llms outputs and that the conventions digest records the current `CONVENTIONS.md` hash. `pnpm update:conventions-hash` records the hash after you update `skills/sutra-ui/references/conventions.md` |
| `pnpm rtl:codemod` | Dry-run the physical-to-logical (RTL) codemod; `--write` rewrites, `--scan` lists what remains |
| `pnpm verify` | `tsc --noEmit && node scripts/gen-index.mjs --check && node scripts/gen-springs.mjs --check && node scripts/gen-docs.mjs --check && node scripts/gen-llms.mjs --check && vitest run && pnpm build && node scripts/check-exports.mjs` |

There is no CI config in the repo. **`pnpm verify` is the pre-commit check.** Run from the repo root, it also typechecks and builds the playground.

At the root: `pnpm playground`, `pnpm build`, `pnpm dev` and `pnpm typecheck` (all workspaces), `pnpm docs:gen` / `docs:check` / `docs:baseline` (props reference and the JSDoc ratchet baseline) `pnpm docs:llms` (generated agent docs: `llms.txt`, per-component markdown, the Claude skill in `skills/sutra-ui`), `pnpm docs:conventions-hash` (record the CONVENTIONS.md hash in the skill's digest), `pnpm rtl:codemod` (the RTL codemod; pass `-- --write`), `pnpm audit:canvas-snap` (pixel-diff safety net for sweeping style changes: `snap <outDir>` takes one screenshot per demo canvas, `diff <A> <B>` compares two runs; needs a running playground via `AUDIT_BASE`) and `pnpm audit:all` (build, serve and audit every playground page for layout problems in the stock, paper, dark and RTL passes; `--baseline <tag>` fails on new findings; Playwright is a dev dependency, install the browser once with `pnpm --filter playground exec playwright install chromium`).

## Right-to-left

The library is RTL-ready: utilities are logical (`ms-`/`me-`, `ps-`/`pe-`, `start-`/`end-`, `text-start`, `border-s`, `rounded-s`...), `DirectionProvider` and `useDirection` carry the direction (and feed Radix), gestures, scrolling and arrow keys follow the reading order, and charts, code, maps and media timelines stay left-to-right on purpose. The playground has a Direction toggle in the top bar. Rules and the list of what stays physical are in `packages/ui/CONVENTIONS.md`; `test/rtl-conventions.test.ts` stops new physical utilities and `scripts/rtl-codemod.mjs` converts them.
