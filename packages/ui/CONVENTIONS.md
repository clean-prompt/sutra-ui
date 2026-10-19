# Sutra UI — component conventions

Stack: **React 19 + TypeScript (strict) + Tailwind CSS v4 + Radix UI** (`radix-ui` unified package), `class-variance-authority`, `@remixicon/react` icons. Built with tsup; there is no path alias at build time, so **use relative imports**.

## Layers and folders
Everything lives in `src/`, one component family per kebab-case file. Pick the lowest layer that fits:

| Folder | Put here | May import (enforced by `test/layering.test.ts`) |
|---|---|---|
| `lib/` | Pure, typed functions and constants. No React components (type-only React imports are fine) | `lib` |
| `hooks/` | Generic hooks, `use-<name>.ts` | `lib`, `hooks` |
| `assets/` | Brand marks, logos, flags, icon wrappers, illustrations | `lib`, `hooks`, `assets` |
| `primitives/` | Basic controls with no domain knowledge (Button, Input, Dialog, Badge, StatusBadge …) | `lib`, `hooks`, `assets`, `styles`, `primitives` |
| `patterns/` | Composed, domain-neutral views (Markdown, DiffViewer, TilingLayout, SchemaForm …) | the above + `patterns` |
| `kits/<domain>/` | Domain features: `ai`, `agent`, `agent-admin`, `identity`, `billing`, `workspace`, `ops`, `media`, `voice`, `social`, `editor`, `terminal`, `geo` | the above + `patterns`, the same kit, and the kits listed for it in `KIT_DEPS` |
| `blocks/` | Composed sections and pages; `registry.tsx` + `demo-data.ts` are the demo registry (`@sutra/ui/blocks/registry`) | anything |
| `entries/` | One barrel per public subpath (`@sutra/ui/<name>`) | anything |

- Kit-to-kit imports are allowed only along the edges in the `KIT_DEPS` table at the top of `test/layering.test.ts`. A new edge means adding it there (the test also fails on listed edges that are no longer used). If a kit needs something from a kit it may not import, move that piece down to `patterns/` instead.
- A new kit folder needs a `KIT_DEPS` entry; otherwise the layering test reports its files as strays.
- **`src/index.ts` and `src/entries/core.ts` are generated** by `scripts/gen-index.mjs` from the folders. Never edit them by hand: after adding, moving or removing a module run `pnpm gen:index` (`pnpm check:index` fails when they are stale). The root re-exports every asset, primitive, pattern, kit module and block, plus the lib/hooks modules listed in `entries/tokens.ts`. It leaves out modules that reach an optional peer (`@codemirror/*`, `@tiptap/*`, `@xterm/*`), back-compat barrels, and the modules in the script's `INTERNAL` table. Name collisions between `export *` lines are resolved in its `OVERRIDES` table.
- The other entries in `src/entries/` are hand-written. Add a new module to the domain entry it belongs to. Each entry needs a matching `package.json` `exports` key, and `test/api-surface.test.ts` checks that every module in primitives/patterns/kits is reachable from some public barrel (exceptions go in its `INTERNAL_MODULES` list). After an intended root API change, update its snapshot with `npx vitest run test/api-surface.test.ts -u`.
- Deep imports (`@sutra/ui/primitives/<file>`, `patterns/<file>`, `kits/<domain>/<file>`, `blocks/<file>`, `assets/<file>`) come from wildcard `exports`, so new files need no `package.json` change. The `@sutra/ui/components/<name>` aliases are frozen back-compat for the old flat folder. Don't add new ones.
- **Back-compat barrels:** `kits/ai/ai-extras`, `kits/ai/primitives-extra`, `kits/workspace/kanban`, `patterns/counters` and `assets/misc` only re-export modules that used to live in one file. Never import from them inside the package. Import the real module (e.g. `./status-strip`, `./kanban-board`, `./countdown`). Don't add code to them.
- Named exports only, no default exports. Export prop types (`export interface XProps`).
- Export names must be unique across the package, because the root barrel uses `export *` and silently drops a name exported twice. Prefix generic sub-parts with the family (`TableRow`, `ChatMessageAvatar`). A prefix is not a reason to copy, though: a new component that resembles an existing one builds on that base (see [Build on the existing base](#build-on-the-existing-base-dont-add-a-parallel-copy)) instead of becoming a prefixed duplicate.
- Tests live in `test/*.test.tsx` (Vitest, jsdom, `<StrictMode>`). Before committing run `pnpm verify` (typecheck, index check, tests, build, `check:exports`). There is no CI.

## Shared building blocks (import, do not re-implement)
Paths are relative to `src/`.
- `cn`, `focusRing`, `invalidRing`, `type Size` from `lib/cn`
- `Button`, `buttonVariants` from `primitives/button` (variants: primary, secondary, tertiary, soft, ghost, outline, destructive, destructive-soft, inverse, link; sizes: xs, sm, md, lg, xl, icon-xs, icon-sm, icon, icon-lg, icon-xl; props `loading`, `leadingIcon`, `trailingIcon`, `asChild`)
- `Spinner` from `primitives/spinner` (variants ring | dots | bars | pulse | glyph; sizes xs–xl; `label=""` makes it decorative)
- `Label` from `primitives/label` (`required`, `hint`)
- `Heading`, `Text`, `Eyebrow`, `Kbd`, `InlineCode` from `primitives/typography`
- `Container`, `Grid`, `GridItem`, `Stack`, `HStack`, `Card` from `primitives/layout`
- `CopyButton`, `CopyField` from `primitives/copy-button`
- `useControllableState` from `hooks/use-controllable-state`; `useCopy` from `hooks/use-copy`
- Radix: `import { Dialog as DialogPrimitive } from "radix-ui"` (the namespaces are Accordion, AlertDialog, AspectRatio, Avatar, Checkbox, Collapsible, ContextMenu, Dialog, DropdownMenu, HoverCard, Label, NavigationMenu, Popover, Progress, RadioGroup, ScrollArea, Select, Separator, Slider, Slot (`Slot.Root`), Switch, Tabs, Toast, Toggle, ToggleGroup, Tooltip, VisuallyHidden …)
- Icons: `import { RiCloseLine } from "@remixicon/react"`. Icons inherit `currentColor`; size them with `size-4` etc.

## Styling tokens (Tailwind utilities from `src/styles/sutra.css`)
- Surfaces: `bg-background`, `bg-card`, `bg-popover`, `bg-subtle`, `bg-muted`, `bg-accent` (hover rows), `bg-secondary`, `bg-inverse text-inverse-foreground`, `bg-overlay` (modal scrim), `glass`
- Text: `text-foreground`, `text-muted-foreground`, `text-primary`, `*-foreground` pairs
- Borders: `border-border`, `border-border-strong`, `border-input`, `ring-ring`
- Brand: `bg-primary`, `hover:bg-primary-hover`, `text-primary-foreground`, `bg-primary-soft text-primary-soft-foreground`, plus `brand-50…950` for gradients
- Status: `success | warning | destructive | info`, each with `-foreground`, `-soft`, `-soft-foreground`
- Radius: `rounded-control` for buttons, inputs, chips and toggles (follows the pill/square theme switch), `rounded-box` for cards, panels and popovers, plus `rounded-xs … rounded-2xl`. Use `rounded-full` only for things that are always circular (avatars, dots, switch thumbs).
- Shadows: `shadow-xs … shadow-3xl`, `shadow-inner-highlight`. Popovers/menus: `shadow-lg`, dialogs `shadow-2xl`.
- Type: `text-display-xs … text-display-2xl`, `text-2xs`, `font-mono`.
- Animations: `tw-animate-css` is loaded (`data-[state=open]:animate-in data-[state=closed]:animate-out fade-in-0 zoom-in-95 slide-in-from-top-2` …), plus `animate-accordion-down/up`, `animate-collapsible-down/up`, `animate-shimmer`, `animate-dot-bounce`, `animate-bar-scale`, `animate-indeterminate`, `animate-mesh`, `animate-caret-blink`, and the utilities `text-shimmer`, `scrollbar-thin`, `scrollbar-none`, `bg-dots`, `bg-grid`.
- Dark mode is handled by the tokens. Avoid `dark:` overrides unless necessary.

## API shape
- `React.forwardRef` + `displayName` for DOM-rendering components; spread `...props` onto the root; accept `className` and merge it last with `cn()`.
- Variants through `cva`; export the `xxxVariants` when they are useful elsewhere.
- Sizes are `"sm" | "md" | "lg"` (default `md`). Control heights: sm h-8, md h-9, lg h-10.
- Controlled + uncontrolled support (`value`/`defaultValue`/`onValueChange`), following Radix naming.
- Inputs: `border border-input bg-background shadow-xs rounded-control`, `focusRing`, `invalidRing`, `disabled:opacity-50 disabled:cursor-not-allowed`, placeholder `placeholder:text-muted-foreground`.
- Accessibility: correct roles and aria attributes, keyboard support, `aria-label` on icon-only buttons, and `sr-only` text where needed.
- Floating content goes through a Portal with `z-50`. Use `sideOffset={6}` by default.
- Compound components (`Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent`) are preferred over giant prop objects. A convenience "data-driven" wrapper is welcome when it helps (e.g. `items` prop).
- Comment density: a one-line JSDoc on each exported component; no noisy inline comments.

## Effects must survive remounts (StrictMode)
Tests render everything inside `<StrictMode>` (see `test/setup.ts`), which mounts → unmounts → remounts and re-runs effects, as React also does with `<Activity>` and Fast Refresh.
- A ref that a cleanup flips (`mounted.current = false`, a pending frame id, a "started" flag) must be **reset in the effect body**, not only initialised in `useRef(...)`. Otherwise it stays stale after the remount.
- "Skip the first run" refs break when the effect re-runs. Compare against the previous value instead (e.g. only focus when `step` actually changed).
- Async work started in an effect must be cancelled in its cleanup (`AbortController`, an `alive` flag set in the same effect). Results from a cancelled run must be dropped, and any resources it acquired (camera streams, sockets) released.
- Share one promise for lazy imports at module level instead of `import()`-ing on every mount.
- In tests, don't assert exact counts of mount-time effect calls; assert relative to the count after mount, and make mocks depend on state rather than call order (`mockReturnValueOnce`).

## Shared helpers
**Before writing a formatter, hook or copy button, use `lib/` or `hooks/`; extend them with options instead of copying.** All lib functions are pure, typed, never throw on bad input (they return an `invalid` placeholder such as `"—"` or `undefined`/`null`), and take an optional `locale` where they produce text.
- `lib/time`: `TimeInput`, `toMs`, `toDate`/`toValidDate`, `isValidDate`, `safeISO`, `formatRelative` (narrow/short/long, `justNowMs`, `justNow`, `unitLabels`, `suffix`, `yesterday`, `round` (per unit), `maxRelativeDays`, `dateYear`, `future`), `formatClockTime`, `formatShortDate`, `formatDateTime`, `formatDayLabel` (calendar days, DST-safe; `weekdayWithinWeek`), `dateKey`, `startOfDay`, `addDays`, `calendarDayDiff`, `pad2`. `lib/date` re-exports the old names. Component-level formatters (`formatAgentRelativeTime`, `formatChannelAgo`, …) are presets over these; new code calls lib directly.
- `lib/duration`: `splitDuration`, `formatClock` (from seconds: `"1:05"`), `formatCountdown` (from ms, rounds up), `formatDuration` (from ms: `"1h 5m"`, `"3m 05s"`, `"850ms"`, `"1.5s"`; `style: compact | long | decimal`, `negative`, `unitLabels` for custom units such as `"2 hr 5 min"`; rounds once, never `"1m 60s"`); `formatClock` takes `minus` for remaining time.
- `lib/format`: `formatBytes` (`trimZeros`, `units`, `negative`), `formatCompact`, `formatTokens`, `formatBadgeCount`, `formatCost`, `pluralize`, `formatList`.
- `lib/hash`: `hashString` (FNV-1a), `seededRandom`/`mulberry32`, `pickForSeed`, `colorForSeed` (use it for every "colour for a user/id", so the same person gets the same colour everywhere).
- `lib/text`: `escapeRegExp`, `matchRanges`, `slugify`, `initials`, `capitalize`, `truncateMiddle`, `graphemes`.
- `lib/validate`: `isEmail`, `isHttpUrl`, `hostnameOf`, `isSafeHref` (check user-supplied hrefs with it).
- `lib/math`: `clamp`, `toPercent`, `roundTo`. `lib/encoding`: `base64UrlEncode/Decode(Bytes)`, `base32Encode/Decode`.
- `lib/relative-time`: `formatRelativeTime` (short: "just now", "5 min ago", "yesterday"). `lib/token-count`: `formatTokenCount` ("1.2K"), `formatAgentTokens` ("12.4k").
- `lib/shortcuts`: parse, match and format key combos and sequences (`matchesShortcut`, `formatShortcut`, `formatShortcutSpoken`, `getShortcutKeyLabels`, `isEditableTarget`, `detectShortcutPlatform`, `ShortcutManager`).
- `lib/text-field`: `replaceTextRange` (sets a field's value so React's `onChange` fires), `getTextareaCaretRect`.
- `lib/reorder`: `reorderArray`, `reorderBy`. `lib/pagination`: `getPaginationRange` (`[1, "ellipsis-start", 4, 5, 6, "ellipsis-end", 10]`). `lib/refs`: `assignRef` (merge callback/object refs).
- `lib/cron`: `parseCron`, `describeCron`, `nextCronRuns`, intervals (`parseInterval`, `formatInterval`, `intervalToMs`) and builder schedules (`scheduleToCron`, `cronToSchedule`, `describeSchedule`, `nextScheduleRuns` …). `lib/rrule`: `RecurrenceRule`, `toRRule` (RFC 5545), `describeRecurrence`.
- `lib/tone` (`Tone`, `normalizeTone`, `toneClasses`, `toneClass`, and `resolveColorToken` / `COLOR_TOKENS` for colour props that take a token or any CSS colour, e.g. chart, sparkline and meter colours), `lib/status` (`TaskStatus`, `normalizeTaskStatus`), `lib/tokens` (design tokens as JS values). See Vocabulary below.
- `hooks/use-now`: `useNow`, `useCountdown` (wall-clock based). `hooks/use-media-query`: `useMediaQuery`, `usePrefersReducedMotion`, `prefersReducedMotion`, `useBreakpoint`. `hooks/use-resize-observer`: `useResizeObserver`, `useElementSize`, `useElementWidth`. `hooks/use-iso-layout-effect`: `useIsoLayoutEffect`, `useLatestRef`. `hooks/use-async-action`: `useAsyncAction` (busy/error, stale-run and unmount safe), `useMountedRef`, `errorMessage`. `hooks/use-safe-id`: `useSafeId` (ids safe for `url(#id)`).
- Scrolling and layout: `hooks/use-stick-to-bottom` (keep a scroller pinned to the bottom until the user scrolls up), `hooks/use-virtual-rows` (fixed-height windowing), `hooks/use-scroll-edges` (which edges still have overflow), `hooks/use-active-indicator` (measure the active tab for a sliding indicator), `hooks/use-zoom-pan` (wheel/pinch zoom, drag pan, keyboard).
- Input and gestures: `hooks/use-swipe` (flick detection that doesn't fight native scroll), `hooks/use-textarea-mirror` (an overlay laid out exactly like a textarea), `hooks/use-caret-anchor` (position a popup at a field's caret), `hooks/use-shortcut-manager` (`useShortcutManager`, `useShortcutPlatform`; the provider is in `patterns/shortcuts`).
- State: `hooks/use-reorder` (controlled/uncontrolled list with move helpers), `hooks/use-pagination`, `hooks/use-stopwatch` (laps), `hooks/use-online-status`, `hooks/use-theme`.
- `primitives/copy-button`: `CopyButton` (icon/button/ghost, announces "Copied to clipboard") and `CopyField` (value + copy button, optional `$` prefix).
- Only the lib/hooks modules in `entries/tokens.ts` are public (`@sutra/ui/tokens` and the root). The rest are internal helpers: import them inside the package, and add a module to `entries/tokens.ts` (then `pnpm gen:index`) only when it should become public API.
- Large files split into sibling modules that share the base name (`chart.tsx` → `chart-cartesian.tsx`, `chart-donut.tsx`…); the original path keeps re-exporting every public name, so deep imports stay valid. Inside the package, import the piece directly, not the original. Private helpers shared by sibling pieces go in a `<base>-internal` module: `scripts/gen-index.mjs` and the API-surface test treat any `*-internal` module as non-public.
- Root-barrel note: `formatBytes`, `splitDuration` and `base32Decode` from the root are still the older component versions (`patterns/file-upload`, `patterns/countdown`, `kits/identity/totp`; see `OVERRIDES` in `scripts/gen-index.mjs`). The lib versions are exported from `@sutra/ui/tokens`. Inside the package, import from `lib/*` directly.

## Vocabulary (props and values)
One spelling per concept. Old spellings stay accepted as **deprecated aliases** (typed via the `Legacy*` / `*Input` unions and mapped with the normalizers), so existing call sites keep compiling. Docs, defaults, examples and new code use the canonical form.

- **Semantic colour → `tone`.** Values: `neutral | primary | success | warning | destructive | info` (`Tone` in `lib/tone.ts`). Accept `ToneInput` and call `normalizeTone()`; legacy `brand`, `default`, `muted`, `warn`, `danger`, `error`, `critical`, `failure` map automatically. Use `toneClasses` / `toneClass()` for soft, solid, outline, dot, text and border styles instead of a local map. Where a component used `variant`, `color` or `severity` for semantic colour, add `tone` and keep the old prop as a deprecated alias (`tone ?? variant`). `variant` is reserved for structure (soft / outline / solid / ghost). Categorical palettes (e.g. Badge's gray/blue/purple) stay on `color`.
- **Lifecycle status → `TaskStatus`:** `pending | running | succeeded | failed | canceled` (`lib/status.ts`, US spelling). Accept `TaskStatusInput` and compare through `normalizeTaskStatus()`. Don't change what a component *emits* in callbacks (that would break consumers); widen what it *accepts*. Domain-specific states (e.g. a model's `sleeping`, a call's `ringing`) stay domain-specific.
- **Controlled state:** the primary value is always `value` / `defaultValue` / `onValueChange(value, meta?)`; open state is `open` / `defaultOpen` / `onOpenChange`; checked state is `checked` / `defaultChecked` / `onCheckedChange`. Every controlled prop ships with its `default*` partner. Components that used `onChange` (editors, forms) add `onValueChange` with the extra data as a second argument and keep `onChange` as a deprecated alias.
- **Booleans are bare adjectives:** `loading` (not `isLoading` / `busy` / `pending` for the same idea), `active` (not `isActive`), `disabled`. Keep old names as deprecated aliases.
- **Dismissal:** notification-like components use `onDismiss` (keep `onClose` as an alias where it existed).
- **Categorical colour → `accent`.** A section or metric colour with no meaning (CPU blue, Memory purple): `accent?: Accent` from `lib/accent.ts` (named palette, semantic token or any CSS colour). Put `accentStyle(accent, style)` on the root and use `accentClasses` inside, so children inherit `--sutra-accent`. Use `tone` when the colour means good or bad.
- **Density:** `density?: Density` (`compact | normal | relaxed`, in `lib/cn.ts`). A legacy `compact?: boolean` stays as an alias via `normalizeDensity()`.
- **Loading states:** data components take `loading?: boolean`. With no data yet they render `Skeleton`s in their real layout (no layout jump when data arrives); with data already present they keep showing it (a refresh), so there is no skeleton flash. The root gets `aria-busy` and one visually hidden "Loading …" text (not a live region); never show `emptyState` while loading; controls that need data are not rendered in the skeleton state. Lists may add `loadingRows`. Exception: single-value cards (`StatCard`, `TopItemCard`) always show the skeleton while `loading` is set, because they have no empty state; pass `loading` only until the first value arrives.
- **Empty states:** the prop is `emptyState?: React.ReactNode` (keep `empty` / `emptyText` / `emptyMessage` / `emptyLabel` as aliases). Short empty strings have no trailing period ("No results").
- **Words:** "Sign in" (not "Log in"), "canceled", "…" for ellipses.

Mark aliases with a JSDoc `@deprecated Use \`tone\`.` tag so editors show the strike-through.

## Build on the existing base (don't add a parallel copy)
Before writing a new pill, list, banner or picker, check this table. A domain component should be a small map from its own states to the base's props (see `ToolsetHealthPill`, `JobStatePill`), not new markup.

| Need | Base | Presets built on it |
|---|---|---|
| Status pill or dot | `StatusBadge`, `StatusDot` (`tone`, `icon: "dot" \| "spinner" \| node`, dot `variant: solid \| hollow \| dashed`, `pulse`) | JobStatePill, ChatToolStateBadge, BackendHealthPill, SubagentStatusGlyph, AgentStatusDot, ToolTimelineDot, ModelStatePill |
| Categorical label | `Badge` (`color`, or `tone` for semantics) | KanbanRunBadge, ToolsetHealthPill, DownloadBadge |
| Loading indicator | `Spinner` | ChatLoader, GlyphSpinner, TypingIndicator, MediaBufferingIndicator |
| Live "agent is working" line | `AgentStatusLine` (`state`, `verbs`, `tokens`, `startedAt`) | SpinnerVerbs. Infrastructure waits (cold start, retry, offline) use `StatusStrip` instead |
| Model lifecycle | `ModelState` / `ModelStateGlyph` (`kits/ai/model-state`) | — |
| Pick a model | `ModelSelect` (flat list), `ProviderModelPicker` (two columns), rows via `ModelSelectOption` | ModelPicker, PromptInputModelSelect |
| Conversation sidebar | `ConversationList` (`groupBy`, `searchable`, `rowActions`) | ChatListView, ConversationSidebarList; AgentSessionList reuses its row and header |
| Rename in place | `InlineEditText` | conversation and session rename |
| Page-level banner | `AlertBanner` (`appearance: solid \| soft`, `BannerAction`) | RotatingNoticeBar |
| In-content notice | `InlineAlert` (`action`, `layout: box \| strip`) | BillingBanner, OfflineBanner, ProfileScopeBanner, ContextBanner |
| Numbered steps or checklist | `Steps` (per-step `status`, `content`, `action`) | GuidedSetupSteps, OnboardingChecklist |
| QR with expiry | `QRCodeCard` | RotatingQRPairing. `QRCodePlaceholder` is a non-scannable mock |
| Person picture or initials | `Avatar` | ChatMessageAvatar, SidebarUserCard |
| App, provider or tool tile | `Monogram` | ProviderLogo, CapabilityMonogram |
| Empty view | `EmptyState` (`variant="welcome"` for chat) | ChatEmptyState |
| Text-styled action | `TextLink` (button mode with `onClick` and no `href`) | TextButton |
| Copy a value | `CopyButton`, `CopyField` | — |
| Task progress | `Progress` (bar, sizes down to `2xs`), `ProgressSegments` (`role="meter"` option), `ProgressCircle` | PasswordStrength and every upload, playback and step bar |
| Level against thresholds | `Meter`, `StackedMeter`, `RingMeter` (rings share `ProgressRingSvg`) | ContextMeter, ContextUsageBreakdown |
| Metric tile | `StatCard` (`accent`, `href`/`onClick` + chevron, `caption`, `status`, `stats`, `trendPlacement="footer"` with `trendMin`/`trendMax`, `progress`, `children` body, `valueFont`) | TopItemCard |
| Metric page header | `MetricHero` (big value, detail rows, live area chart) | — |
| Ranked list with bars | `BarList` (icon, name, description, value + proportional bar, `highlightFirst`, `limit`) | — |
| Breakdown legend | `BreakdownList` (dot, icon, label, value, percent; toggles series); `topWithOther` for an "Other" row | DonutChart `legendValues`/`iconFor`, StackedMeter `legend="list"` |
| Live series | `useRollingSeries`, `useSampler` (last N readings, optional interval sampling) | — |
| Volume control | `VolumeSlider` (mute toggle, slider, level; `Slider` `getValueText` for value text) | VolumeMixer |
| Battery reading | `BatteryLevel` (icon, bar or text; low and critical thresholds) | DeviceBatteryList |
| Port chips | `PortBadge`, `PortBadgeList` (overflow "+N") | DevServerList, ContainerList, ContainerSummary |
| Plan limits | `QuotaRing`, `QuotaStrip`, `QuotaBars` with `usagePace` / `describeUsagePace` (on pace, spare, runs out) | — |
| Compact reading with strain colour | `MetricReadout`, `MetricReadoutGroup` (thresholds in either direction) | — |
| Area by size | `Treemap` (drill-down, keyboard, screen-reader table) | StorageMap |
| File preview | `FileViewer` (`renderers` for pdf.js / office previews supplied by the app, `files` gallery, `actions`, `panel`, `blob`) | FilePreviewCard |
| PDF | `PdfViewer`, `PdfThumbnail`, `pdfRenderer()` from `@sutra/ui/pdf` (pass `workerSrc` from `pdfjs-dist/legacy/build/pdf.worker.min.mjs?url`; under a strict CSP serve the worker from your own origin) | — |
| Image edit and capture | `ImageCropper`, `CameraCapture` (on `useCamera`, shared with `QRScanner`) | — |
| Rubber-band selection | `SelectionArea` / `useMarqueeSelection` | — |
| Times and confirmations | `TimePicker`, `DateTimePicker`; `DialogProvider` + `useDialogs()` for `confirm`/`prompt`/`choose` | — |
| Time series | `AreaChart` / `LineChart` with `xAxis.type="time"`, `domain`, `maxGap`, `connectNulls` | — |
| Collaborative editing | `RichTextEditor` / `CodeEditor` with `history={false}` plus Yjs `extensions` | — |
| Folder upload | `Dropzone` / `FileUploadTrigger` `directory`; read paths with `getFileRelativePath` | — |
| Apps instead of processes | `ProcessTable` `groupBy` with `onQuitGroup`; `groupProcesses` / `buildProcessTree` in lib | — |
| Temperatures | `lib/temperature` (store °C, convert for display) | ThermalSensors, FanControl, alert rules |
| Attachment tile | `ChatAttachment` (`status`, `progress`, `onRetry`, `onPreview`) | AttachmentThumbnails |
| Bottom or side panel | `Dialog` (centred, sheet on mobile), `Sheet` (edge panel), `Drawer` (gesture bottom sheet; shares Sheet's parts) | — |
| Maps and locations | `WorldMap` (`@sutra/ui/geo`: choropleth, markers, arcs) and `Globe` (same data props via `GeoMapDataProps`, plus drag/momentum, zoom, `autoRotate`, `focus`/`apiRef` fly-to, `controls`; rotation and zoom are reported on settle, not per frame); `GeoMarkerLayer` for marker buttons over any projection (`compact` below 480 px, `markerOpacity`); pure helpers in `kits/geo/geo-model` (`createProjection` incl. `orthographic` (returns `null` from `project` for hidden points), `rotationToCenter`, `interpolateRotation`, `geoAngularDistance`, `clusterPoints`, `geoColorScale` (shades like `heatmapColor`), `greatCircleArc`, `normalizeCountryCode`, `countryName`). Outlines are bundled (`pnpm gen:world` regenerates `world-data.ts`); never fetch tiles. Ready-made: `LiveVisitorsMap` (geo), `SignInMap` + `detectImpossibleTravel` (identity), `RegionStatusMap` + `normalizeRegionStatus` (ops); they list their data beside the map, so they pass `dataTable={false}` to skip the map's hidden tables. Device icons for any device kind: `assets/device-icons` (`deviceIcon`, `deviceLabels`) | — |
