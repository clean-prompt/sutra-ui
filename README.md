# Sutra

Monorepo for the Sutra personal suite.

| Path | What |
| --- | --- |
| `packages/ui` | **@sutra/ui**: design tokens, 289 component modules (primitives, patterns and domain kits), assets and blocks |
| `apps/playground` | Vite showcase for every component and block |

```bash
pnpm install
pnpm playground   # run the showcase (Vite, http://localhost:5173)
pnpm build        # build @sutra/ui to packages/ui/dist
pnpm typecheck    # tsc in every workspace package
```

How components are written, where new files go and which base to build on: [`packages/ui/CONVENTIONS.md`](packages/ui/CONVENTIONS.md).

## Using @sutra/ui in an app

The package needs **React 19** and **Tailwind CSS v4**.

```css
/* app/globals.css */
@import "tailwindcss";
@import "@sutra/ui/styles.css";
```

Load the Geist and Geist Mono fonts (Google Fonts, or `next/font`/`geist` in Next.js). Without them the stack falls back to the system UI font.

```tsx
import { Button, Toaster, toast, SutraLogo } from "@sutra/ui";

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

### Theming

Every color, radius and shadow is a CSS variable (`src/styles/sutra.css`). Set these on `<html>` or on any subtree:

| Attribute | Values |
| --- | --- |
| `class="dark"` or `data-theme="dark"` | Dark mode |
| `data-brand` | `indigo` (default), `blue`, `sky`, `cyan`, `violet`, `rose`, `lime`, `green`, `yellow`, `orange`, `red` |
| `data-neutral` | `zinc` (default), `slate`, `gray`, `stone` |
| `data-radius` | `rounded` (default), `pill`, `square` |
| `data-style` | `paper`: a calm, monochrome style (warm paper and ink, pure black in dark mode, hairline borders, flat, system font, tight headlines). Needs `@import "@sutra/ui/paper.css";` after the base styles. The ink is the accent, so `data-brand` and `data-app` have no effect in it; status colors keep their hues. Set it on `<html>` to reach portaled layers (dialogs, popovers, menus) too |
| `data-app` | `notes`, `tasks`, `calendar`, `mail`, `files`, `journal`, `finance`, `habits`: retunes the brand scale to that app's accent (exposes `--app-from` / `--app-to`) |

`useTheme()` reads and sets mode, brand, neutral, radius and style on `<html>` (`style: "paper"` sets `data-style`). Tokens are Tailwind utilities (`bg-primary`, `text-muted-foreground`, `rounded-control`, `rounded-box`, `shadow-lg` …) and JS values (`colors`, `chartColors`, `typography`, `spacing`, `radii`, `shadows`, `breakpoints`, `grid`).

## Imports

The build emits one ES module per source file. `"use client"` is added only to modules that need it (components and hooks; not `lib/`, re-export barrels or plain `.ts` files without React runtime imports), and `forwardRef` components are emitted as pure expressions, so bundlers tree-shake per export: `import { Button } from "@sutra/ui"` stays small. Subpaths give narrower imports and faster type-checking.

| Import | Holds |
| --- | --- |
| `@sutra/ui` | Every asset, primitive, pattern, kit module and block, plus the `/tokens` foundations. **Not** the Remix icon set (`/icons`) or the optional-peer modules (`CodeEditor`, `RichTextEditor` → `/editor`; `Terminal` → `/terminal`) |
| `@sutra/ui/styles.css` | Tokens and Tailwind theme (`src/styles/sutra.css`) |
| `@sutra/ui/paper.css` | The optional paper style (`src/styles/paper.css`); import it after `styles.css` and set `data-style="paper"` |
| `@sutra/ui/blocks/registry` | `blockRegistry`, `blockCategoryLabels`, demo fixtures and mocks (demo-only; the same names on `@sutra/ui` and `/blocks` are deprecated) |

Subpath entries, generated from `src/entries/*.ts` (one barrel per subpath; modules are listed by file name):

| Import | Holds | Modules |
| --- | --- | --- |
| `@sutra/ui/core` | Every primitive (src/primitives), the basic controls everything else builds on | every module in `src/primitives` (85) |
| `@sutra/ui/tokens` | Design tokens, class helpers, shared formatters/validators and hooks | `tokens`, `cn`, `time`, `duration`, `format`, `hash`, `text`, `validate`, `math`, `encoding`, `tone`, `status`, `use-controllable-state`, `use-copy`, `use-theme`, `use-now`, `use-media-query`, `use-resize-observer`, `use-iso-layout-effect`, `use-async-action`, `use-safe-id`, `use-active-indicator`, `use-scroll-edges`, `use-debounced-value`, `use-previous`, `use-disclosure`, `use-scroll-sections`, `use-presence`, `use-spring-value`, `use-stagger`, `use-typewriter`, `spring`, `use-drag`, `use-swipe-dismiss`, `use-pan`, `gesture`, `use-flip`, `flip`, `use-view-transition`, `use-scroll-progress`, `use-pointer-vars`, `wheel`, `carousel`, `use-direction`, `direction`, `use-rect-morph`, `burst`, `deck`, `pan-surface`, `morph` |
| `@sutra/ui/forms` | Form controls | `label`, `field`, `input`, `input-group`, `input-otp`, `textarea`, `number-input`, `tag-input`, `checkbox`, `radio`, `switch`, `select`, `calendar`, `date-picker`, `segmented-control`, `slider`, `rating`, `file-upload`, `dropzone`, `combobox`, `password-strength`, `wheel-picker` |
| `@sutra/ui/overlays` | Tooltips, popovers, dialogs, menus and the command palette | `tooltip`, `info-tooltip`, `popover`, `dialog`, `dropdown-menu`, `context-menu`, `command-menu` |
| `@sutra/ui/navigation` | Breadcrumbs, pagination, tabs, headers, sidebars, trees, `SearchTrigger` and `DividedGrid` | `breadcrumbs`, `pagination`, `tab-menu`, `tabs`, `header-navigation`, `sidebar-navigation`, `section-header`, `tree-view`, `section-rail`, `carousel`, `step-wizard` |
| `@sutra/ui/dataviz` | Charts, stat cards, ranked bar lists, metric heroes, treemaps, meters and gauges | `chart` (bar, line, area, donut, funnel, waterfall, scatter, radar), `stat-card`, `bar-list`, `metric-hero`, `treemap`, `meter`, `gauge`, `sparkline`, `animated-number` |
| `@sutra/ui/motion` | Enter and exit presence, animated lists, split and typed text (hooks `usePresence`, `useSpringValue`, `stagger` and the spring maths are in `@sutra/ui/tokens`) | `presence`, `animated-list`, `split-text`, `typewriter`, `morph-pill`, `shared-element`, `scroll-reveal`, `scroll-stage`, `pointer-fx`, `check-burst`, `morph-dialog` |
| `@sutra/ui/mobile` | Bottom tab bar, drawer, lightbox, file viewer, split pane, presence | `bottom-tab-bar`, `drawer`, `lightbox`, `file-viewer`, `split-pane`, `presence`, `swipe-row`, `swipe-deck`, `pan-surface` |
| `@sutra/ui/assets` | Brand marks (the Bead mark: mono `glyph`, `tile`, `reversed`, theme-following `solid`, `outline`, `badge`), the drawn wordmark, logos, mono / reversed / dyed app icons, `Marquee`, flags, file formats and icon wrappers (Remix icons live in @sutra/ui/icons) | `brand`, `placeholder-logos`, `icons`, `country-flags`, `emoji-reactions`, `file-format`, `misc` |
| `@sutra/ui/icons` | Icon, FeaturedIcon and the full Remix Icon set | `icons`, `@remixicon/react` |
| `@sutra/ui/blocks` | Composed sections and pages | `auth-blocks`, `auth-pages`, `dropdown-menu-blocks`, `header-navigation-blocks`, `sidebar-navigation-blocks`, `section-header-blocks`, `modal-dialog-blocks`, `kunji-blocks`, `marketing-blocks` |
| `@sutra/ui/ai` | Chat, prompt and streaming-text components | `text-shimmer`, `markdown`, `chain-of-thought`, `chat-attachment`, `chat-conversation`, `chat-list-view`, `conversation-list`, `inline-edit-text`, `chat-loader`, `chat-message`, `chat-message-actions`, `favicon`, `chat-source`, `chat-tool`, `prompt-input`, `prompt-suggestion`, `ai-extras`, `usage-quota`, `model-state`, `model-select`, `embeds` |
| `@sutra/ui/agent` | UI for agentic coding assistants (tool timeline, permissions, plans, rewind, composer, tasks, sessions, usage) | `tool-timeline`, `diff-viewer`, `chain-of-thought`, `permission-prompt`, `agent-mode`, `plan-review`, `rewind`, `agent-composer`, `prompt-input`, `model-select`, `model-state`, `chat-tool`, `agent-tasks`, `agent-sessions`, `agent-processes`, `inline-edit-text`, `agent-transcript`, `agent-usage`, `agent-onboarding`, `agent-browser`, `artifacts`, `git-review`, `approval-stack` |
| `@sutra/ui/agent-admin` | Managing an AI agent (capabilities, automation, providers & models, channels & multi-agent) | `llm-providers`, `model-routing`, `backends`, `local-models`, `channels`, `agent-room`, `subagents`, `agent-persona`, `remote-screen`, `cron`, `agent-jobs`, `status-stack`, `webhooks`, `capabilities`, `monogram`, `tool-toggles`, `mcp`, `extensions-catalog`, `schema-form`, `slot-outlet` |
| `@sutra/ui/workspace` | Workspace/profile switcher, connections, notices, tours, keybinds, timeline rail, tiling layout, kanban, memory map | `workspace-switcher`, `notice-bar`, `coachmarks`, `keybind-editor`, `timeline-rail`, `tiling-layout`, `kanban`, `memory-map` |
| `@sutra/ui/system` | System-monitor screens: volume mixer, device batteries, dev servers, containers, thermals and fans, alert rules | `volume-mixer`, `device-battery`, `dev-servers`, `containers`, `thermals`, `alert-rules`, `volume-slider`, `battery-level`, `port-badge`, `metric-readout` |
| `@sutra/ui/suite` | Keyboard shortcuts and suite-native components (mentions, backlinks, quick capture, timeline, sync) | `shortcuts`, `entity-mention`, `backlinks`, `quick-capture`, `today-timeline`, `sync-status` |
| `@sutra/ui/ops` | Log viewer, transfer queues and streaming progress | `log-viewer`, `transfer-list`, `progress-dialog`, `heatmap`, `timeline-bar`, `node-card`, `process-table`, `alert-group`, `json-viewer`, `request-inspector`, `model-row`, `model-state` |
| `@sutra/ui/identity` | QR codes, settings, sessions, lock and boot screens | `qr-code`, `qr-scanner`, `settings`, `key-value`, `empty-state`, `loading-screen`, `device-sessions`, `theme-toggle` |
| `@sutra/ui/kunji` | kunji sign-in widget, client, linking, access gate, auth problems and sign-in blocks | `kunji-client`, `kunji`, `kunji-blocks` |
| `@sutra/ui/security` | Authenticator codes, secrets, recovery keys, consent, API keys, credentials, payment cards, connected apps | `totp`, `secret`, `recovery-key`, `consent`, `api-keys`, `credential-card`, `payment-card`, `connected-apps` |
| `@sutra/ui/billing` | Plans, comparison, current plan, credits and auto-reload, invoices, banners, checkout | `billing` |
| `@sutra/ui/media` | Video and audio players, media controls, queue, poster/album cards, shelves, cast picker | `media-controls`, `video-player`, `audio-player`, `media-cards`, `cast-picker` |
| `@sutra/ui/voice` | Speech input, read-aloud, language picker, translation panes, transliteration, dictionary | `voice`, `translate` |
| `@sutra/ui/social` | App launcher, identity marks, PWA install, calls, messenger, lists, counters, recurrence | `app-launcher`, `identity-mark`, `install-prompt`, `call-overlay`, `messenger`, `reorderable-list`, `counters`, `status-cycle` |
| `@sutra/ui/editor` | Code and rich-text editors (need the optional @codemirror/* and @tiptap/* peers), plus toolbar, outline, status, diff, history and comments | `code-editor`, `rich-text-editor`, `editor-toolbar`, `document-outline`, `editor-status`, `diff-viewer`, `version-history`, `comments` |
| `@sutra/ui/terminal` | xterm.js terminal (needs the optional @xterm/xterm and @xterm/addon-fit peers) | `terminal` |
| `@sutra/ui/pdf` | PDF viewer, thumbnail and a `FileViewer` renderer (optional peer: `pdfjs-dist`) | `pdf-viewer` |
| `@sutra/ui/geo` | World maps and an interactive globe from bundled Natural Earth outlines (no tiles, no network): choropleth with a stepped legend, marker buttons with clustering, great-circle arcs; the globe adds drag with momentum, wheel/pinch/keyboard zoom, auto-rotation, fly-to and a control bar. Plus the projection, rotation, clustering, colour-scale and country-code helpers, and `LiveVisitorsMap` (live analytics screen). `SignInMap` (with impossible-travel detection) lives in `@sutra/ui/identity` and `/security`; `RegionStatusMap` in `@sutra/ui/ops` | `world-map`, `globe`, `geo-marker-layer`, `geo-model`, `world-data`, `live-visitors-map` |

Markdown math (`<Markdown math>`) needs the KaTeX stylesheet: `import "katex/dist/katex.min.css"`.

kunji sign-in makes no third-party requests: `createKunjiClient` draws the QR itself and only talks to your app's own endpoints. The hosted `rp.js` widget is opt-in through `createRpScriptAdapter()`.

### Deep imports

A single module is importable by its source path:

| Path | Example |
| --- | --- |
| `@sutra/ui/primitives/<file>` | `@sutra/ui/primitives/date-picker` |
| `@sutra/ui/patterns/<file>` | `@sutra/ui/patterns/markdown` |
| `@sutra/ui/kits/<domain>/<file>` | `@sutra/ui/kits/ai/chat-message` |
| `@sutra/ui/blocks/<file>` | `@sutra/ui/blocks/auth-blocks` |
| `@sutra/ui/assets/<file>` | `@sutra/ui/assets/country-flags` |
| `@sutra/ui/components/<name>` | **Deprecated.** The pre-split paths; 234 explicit aliases in `package.json` `exports` point each old name at its new module (`components/accordion` → `primitives/accordion`) |

### Optional peers

`@sutra/ui/editor` needs `@codemirror/*` (CodeEditor) and/or `@tiptap/*` (RichTextEditor); `@sutra/ui/terminal` needs `@xterm/xterm` and `@xterm/addon-fit` (plus `import "@xterm/xterm/css/xterm.css"`); `@sutra/ui/pdf` needs `pdfjs-dist` (pass its legacy worker URL as `workerSrc`). They are optional peer dependencies and nothing reachable from the root imports them, so apps that don't use those entries don't install them.

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
| `styles/` | `sutra.css` (tokens, Tailwind theme); `@source "../"` scans the shipped `src`, so `files` must keep `src` | — |
| `primitives/` | Basic controls (Button, Input, Dialog, Badge …) | the four above + `primitives` |
| `patterns/` | Composed, domain-neutral views (Markdown, DiffViewer, TilingLayout …) | + `patterns` |
| `kits/<domain>/` | Domain features: `ai`, `agent`, `agent-admin`, `identity`, `billing`, `workspace`, `ops`, `media`, `voice`, `social`, `editor`, `terminal` | + `patterns`, its own kit, and the kits listed for it in `KIT_DEPS` |
| `blocks/` | Composed sections and pages; `registry.tsx` + `demo-data.ts` are the demo registry | anything |
| `entries/` | One barrel per public subpath | anything |
| `index.ts` | Root barrel, **generated** by `scripts/gen-index.mjs` (as is `entries/core.ts`) | anything |

`test/layering.test.ts` enforces the import rules and holds the `KIT_DEPS` table.

## Scripts

Run in `packages/ui` (or from the root with `pnpm --filter @sutra/ui <script>`):

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
| `pnpm gen:docs` / `pnpm check:docs` | Regenerate / check the props reference `apps/playground/src/generated/api.json` (TypeScript compiler API + JSDoc); `test/jsdoc-coverage.test.ts` is the ratchet for missing prop descriptions |
| `pnpm verify` | `tsc --noEmit && node scripts/gen-index.mjs --check && node scripts/gen-springs.mjs --check && node scripts/gen-docs.mjs --check && vitest run && pnpm build && node scripts/check-exports.mjs` |

There is no CI config in the repo. **`pnpm verify` is the pre-commit check.** Run from the repo root, it also typechecks and builds the playground.

At the root: `pnpm playground`, `pnpm build`, `pnpm dev` and `pnpm typecheck` (all workspaces), `pnpm docs:gen` / `docs:check` / `docs:baseline` (props reference and the JSDoc ratchet baseline) and `pnpm audit:all` (build, serve and audit every playground page for layout problems in the stock, paper, dark and RTL passes; `--baseline <tag>` fails on new findings; Playwright is a dev dependency, install the browser once with `pnpm --filter playground exec playwright install chromium`).

## Right-to-left

The library is RTL-ready: utilities are logical (`ms-`/`me-`, `ps-`/`pe-`, `start-`/`end-`, `text-start`, `border-s`, `rounded-s`...), `DirectionProvider` and `useDirection` carry the direction (and feed Radix), gestures, scrolling and arrow keys follow the reading order, and charts, code, maps and media timelines stay left-to-right on purpose. The playground has a Direction toggle in the top bar. Rules and the list of what stays physical are in `packages/ui/CONVENTIONS.md`; `test/rtl-conventions.test.ts` stops new physical utilities and `scripts/rtl-codemod.mjs` converts them.
