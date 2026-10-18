# Sutra UI — component conventions

Stack: **React 19 + TypeScript (strict) + Tailwind CSS v4 + Radix UI** (`radix-ui` unified package), `class-variance-authority`, `@remixicon/react` icons. Built with tsup; there is no path alias at build time, so **use relative imports**.

## Files
- One component family per file in `src/components/<kebab-name>.tsx` (blocks in `src/blocks/`, assets in `src/assets/`).
- Named exports only, no default exports. Export prop types (`export interface XProps`).
- Never create or edit `src/index.ts`. It is assembled from the files.
- Export names must be globally unique across the package. Prefix generic sub-parts with the family (`TableRow`, `ChatMessageAvatar`).

## Shared building blocks (import, do not re-implement)
- `cn`, `focusRing`, `invalidRing`, `type Size` from `../lib/cn`
- `Button`, `buttonVariants` from `./button` (variants: primary, secondary, tertiary, soft, ghost, outline, destructive, destructive-soft, inverse, link; sizes: xs, sm, md, lg, xl, icon-xs, icon-sm, icon, icon-lg, icon-xl; props `loading`, `leadingIcon`, `trailingIcon`, `asChild`)
- `Spinner` from `./spinner` (variants ring | dots | bars | pulse | glyph; sizes xs–xl; `label=""` makes it decorative)
- `Label` from `./label` (`required`, `hint`)
- `Heading`, `Text`, `Eyebrow`, `Kbd`, `InlineCode` from `./typography`
- `Container`, `Grid`, `GridItem`, `Stack`, `HStack`, `Card` from `./layout`
- `useControllableState` from `../hooks/use-controllable-state`; `useCopy` from `../hooks/use-copy`
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
- `lib/time`: `TimeInput`, `toMs`, `toDate`/`toValidDate`, `isValidDate`, `safeISO`, `formatRelative` (narrow/short/long, `justNowMs`, `maxRelativeDays`, `future`), `formatClockTime`, `formatShortDate`, `formatDateTime`, `formatDayLabel` (calendar days, DST-safe), `dateKey`, `startOfDay`, `addDays`, `calendarDayDiff`, `pad2`. `lib/date` re-exports the old names.
- `lib/duration`: `splitDuration`, `formatClock` (from seconds: `"1:05"`), `formatCountdown` (from ms, rounds up), `formatDuration` (from ms: `"1h 5m"`, `"3m 05s"`, `"850ms"`, `"1.5s"`; rounds once, never `"1m 60s"`).
- `lib/format`: `formatBytes`, `formatCompact`, `formatTokens`, `formatBadgeCount`, `formatCost`, `pluralize`, `formatList`.
- `lib/hash`: `hashString` (FNV-1a), `seededRandom`/`mulberry32`, `pickForSeed`, `colorForSeed` (use it for every "colour for a user/id", so the same person gets the same colour everywhere).
- `lib/text`: `escapeRegExp`, `matchRanges`, `slugify`, `initials`, `capitalize`, `truncateMiddle`, `graphemes`.
- `lib/validate`: `isEmail`, `isHttpUrl`, `hostnameOf`, `isSafeHref` (check user-supplied hrefs with it).
- `lib/math`: `clamp`, `toPercent`, `roundTo`. `lib/encoding`: `base64UrlEncode/Decode(Bytes)`, `base32Encode/Decode`.
- `hooks/use-now`: `useNow`, `useCountdown` (wall-clock based). `hooks/use-media-query`: `useMediaQuery`, `usePrefersReducedMotion`, `prefersReducedMotion`, `useBreakpoint`. `hooks/use-resize-observer`: `useResizeObserver`, `useElementSize`, `useElementWidth`. `hooks/use-iso-layout-effect`: `useIsoLayoutEffect`, `useLatestRef`. `hooks/use-async-action`: `useAsyncAction` (busy/error, stale-run and unmount safe), `useMountedRef`, `errorMessage`. `hooks/use-safe-id`: `useSafeId` (ids safe for `url(#id)`).
- `components/copy-button`: `CopyButton` (icon/button/ghost, announces "Copied to clipboard") and `CopyField` (value + copy button, optional `$` prefix).
- Root-barrel note: `formatBytes`, `splitDuration` and `base32Decode` from the root are still the older component versions (file-upload, counters, totp); the lib versions are exported from `@sutra/ui/tokens`. Inside the package, import from `../lib/*` directly.

## Vocabulary (props and values)
One spelling per concept. Old spellings stay accepted as **deprecated aliases** (typed via the `Legacy*` / `*Input` unions and mapped with the normalizers), so existing call sites keep compiling. Docs, defaults, examples and new code use the canonical form.

- **Semantic colour → `tone`.** Values: `neutral | primary | success | warning | destructive | info` (`Tone` in `lib/tone.ts`). Accept `ToneInput` and call `normalizeTone()`; legacy `brand`, `default`, `muted`, `warn`, `danger`, `error`, `critical`, `failure` map automatically. Use `toneClasses` / `toneClass()` for soft, solid, outline, dot, text and border styles instead of a local map. Where a component used `variant`, `color` or `severity` for semantic colour, add `tone` and keep the old prop as a deprecated alias (`tone ?? variant`). `variant` is reserved for structure (soft / outline / solid / ghost). Categorical palettes (e.g. Badge's gray/blue/purple) stay on `color`.
- **Lifecycle status → `TaskStatus`:** `pending | running | succeeded | failed | canceled` (`lib/status.ts`, US spelling). Accept `TaskStatusInput` and compare through `normalizeTaskStatus()`. Don't change what a component *emits* in callbacks (that would break consumers); widen what it *accepts*. Domain-specific states (e.g. a model's `sleeping`, a call's `ringing`) stay domain-specific.
- **Controlled state:** the primary value is always `value` / `defaultValue` / `onValueChange(value, meta?)`; open state is `open` / `defaultOpen` / `onOpenChange`; checked state is `checked` / `defaultChecked` / `onCheckedChange`. Every controlled prop ships with its `default*` partner. Components that used `onChange` (editors, forms) add `onValueChange` with the extra data as a second argument and keep `onChange` as a deprecated alias.
- **Booleans are bare adjectives:** `loading` (not `isLoading` / `busy` / `pending` for the same idea), `active` (not `isActive`), `disabled`. Keep old names as deprecated aliases.
- **Dismissal:** notification-like components use `onDismiss` (keep `onClose` as an alias where it existed).
- **Density:** `density?: Density` (`compact | normal | relaxed`, in `lib/cn.ts`). A legacy `compact?: boolean` stays as an alias via `normalizeDensity()`.
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
| Model lifecycle | `ModelState` / `ModelStateGlyph` (`model-state.tsx`) | — |
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
| Attachment tile | `ChatAttachment` (`status`, `progress`, `onRetry`, `onPreview`) | AttachmentThumbnails |
| Bottom or side panel | `Dialog` (centred, sheet on mobile), `Sheet` (edge panel), `Drawer` (gesture bottom sheet; shares Sheet's parts) | — |
