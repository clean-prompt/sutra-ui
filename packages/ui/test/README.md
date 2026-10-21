# Tests of @sutra/ui

Vitest, jsdom. The folder is flat; `setup.ts` is the setup file and `helpers/` holds the shared test helpers (not tests).

## How tests are named

- A test that covers one component, hook, lib module or tight family is named after that subject, in kebab-case as used in `src`
  (`carousel-inert.test.tsx`, `command-menu-empty.test.tsx`, `hooks-debounce-previous-disclosure.test.tsx`). When the plain name
  is taken, an aspect suffix says what the file covers (`tiling-layout-rtl`, `data-table-a11y`). Never a wave, phase or review label,
  never a numeric suffix.
- A test that sweeps many components (a bug-fix pass, a vocabulary pass, a merge onto a shared base, a review wave, a public-surface
  check of split modules) keeps its name and is indexed below, with a one-line header comment in the file.
- Kit-level and layer-level files (`forms`, `overlays`, `ai`, ...) cover the components of one kit or layer and are indexed below too.
- To find the test of a component: `ls test | grep <subject>`, then search this index, then `grep -l "<Component>" test/*.test.*`.

## `helpers/`

Shared helpers, imported by tests as `./helpers/<name>`: `a11y` (axe runner), `blocks-helpers`, `contrast` (colour maths and token
evaluation), `conventions-scan` (source scanners for the convention tests), `css` (stylesheet readers), `gesture-pointer` (pointer
event simulation for drags), `media` (media element stand-ins).

## Index: primitives

| File | What it covers |
| --- | --- |
| `primitives.test.tsx` | Label, ScrollArea, AspectRatio, MeshGradient, SocialButton, AppStoreBadge and other small primitives |
| `actions.test.tsx` | Button, ButtonGroup, CloseButton, FAB, TextLink |
| `forms.test.tsx` | Checkbox, Combobox, DatePicker, Dropzone, Field, FileUpload, Input, InputOTP, NumberInput, PasswordStrength, Radio, Rating, SegmentedControl, Select and more |
| `feedback.test.tsx` | AlertBanner, InlineAlert, Toast |
| `navigation.test.tsx` | Breadcrumbs, header and sidebar navigation, Pagination, SectionHeader, tabs, TreeView |
| `overlays.test.tsx` | Dialog, Popover, Tooltip, DropdownMenu, ContextMenu, CommandMenu, InfoTooltip |
| `data-display.test.tsx` | Accordion, Avatar, AvatarGroup, FilterBar, Separator, Table |
| `indicators.test.tsx` | Badge, Chip, Progress, Spinner, StatusBadge, StepIndicator |
| `gaps-ga-primitives.test.tsx` | Gap-fill options: Card parts, Button spinnerProps, Collapse, Collapsible, ToggleGroup, Accordion, Sheet |
| `gaps-gb-options.test.tsx` | Filled inputs, getPageWindow, PaginationStatus, Rating allowClear, Countdown urgentBelow |
| `bugfix-primitives.test.tsx` | Bug-fix regressions: Dropzone, Button, TextLink, FAB, Field, NumberInput, TabDropdown |
| `sweeps-primitives.test.tsx` | useMergedRefs forwarding, SegmentedControl, ScrollArea, inputShellVariants, CloseButton, tone matrices |
| `vocab-b1.test.tsx` .. `vocab-b5.test.tsx` | Vocabulary aliases (tone, status, density, controlled triads, onValueChange) across primitives, patterns and kits |
| `review2-base.test.tsx` | Slider, useTheme and useOnlineStatus hydration, TallyCounter |
| `review2-dupes.test.tsx` | VolumeControl, KeyboardShortcutsDialog, SecretRow, McpServerForm presets over shared bases |
| `merge-status.test.tsx` | StatusDot, StatusBadge, Spinner, ChatLoader on shared bases |
| `merge-banners.test.tsx` | AlertBanner, InlineAlert, RotatingNoticeBar, domain banners, QRCodeCard, Steps |
| `merge-identity.test.tsx` | Avatar, Monogram, EmptyState, TextLink, Drawer on Sheet, deprecated aliases |
| `merge-meters.test.tsx` | Progress, ProgressSegments, progress rings, attachments, context meters |
| `refgaps-pickers.test.tsx` | TimePicker, DateTimePicker, DatePicker popovers, useDialogs |
| `contrast-leftovers.test.ts` | AA contrast pairs of tokens and components (destructive button, charts, avatar seeds, Dropzone) |
| `direction.test.tsx` | lib/direction, useDirection, DirectionProvider and the components that follow reading order |
| `w7-b-behaviour.test.tsx` | TextShimmer, GridItem, Progress formatValue, Item asChild, GlyphSpinner, date picker locale |
| `w7-b-hydration.test.tsx` | ThemeToggle, SplitPane and useShortcutPlatform: server-safe first render |
| `w7-b-rtl.test.tsx` | Logical indents and connectors, the Sparkline as a left-to-right island |
| `fixes-dates-input.test.tsx` | lib/date, Kanban due dates, IME Enter, AppLauncher, CoachmarkTour and SearchInput keys |

## Index: patterns

| File | What it covers |
| --- | --- |
| `patterns.test.tsx` | Sparkline, SparkBar, BlogContent, FanMenu, DecodeText, ZoomPan |
| `mobile.test.tsx` | BottomTabBar, Drawer, FileViewer, Lightbox, Presence, SplitPane |
| `loading-patterns.test.tsx` | Loading states of BarList, charts, Gauge, MetricHero, StatCard, Treemap |
| `dataviz.test.tsx` | Chart, Gauge, Meter, StatCard |
| `shortcuts.test.tsx` | CommandMenu, KeybindEditor, ShortcutKeys, shortcut dialogs, sidebar navigation, tooltips |
| `bugfix-patterns.test.tsx` | Bug-fix regressions: Markdown, JsonViewer, TreeView, LogViewer, KeybindEditor, DiffViewer, CalendarHeatmap |
| `sweeps-patterns.test.tsx` | lib/svg-path, chart colour tokens, ImageWithFallback, CoachmarkTour measuring, forwarded refs |
| `patterns-review-fixes.test.tsx` | RTL resize handle, selection keys, FadeText, Coachmark, RotatingNoticeBar, SchemaForm, ReorderableList, Presence |
| `split-patterns.test.ts` | Public exports of the split patterns modules (chart, tiling-layout) |
| `layout-F1.test.tsx`, `layout-F2.test.tsx`, `layout-F3.test.tsx` | Container-following layout classes: narrow containers, grids with a base column, wrapping rows, kit rows, blocks |
| `motion-patterns.test.tsx` | Hover nudges, chevrons, one scale and ease in patterns and assets, tick animations |
| `gg2-ssr.test.tsx` | Server rendering of WheelPicker, Carousel, StepWizard, MorphPill, FlipGroup |

## Index: kits

| File | What it covers |
| --- | --- |
| `ai.test.tsx` | ChatConversation, PromptInput, copy and feedback actions, ChatListView, ChainOfThought |
| `agent-composer.test.tsx`, `agent-sessions.test.tsx`, `agent-timeline.test.tsx`, `agent-permissions.test.tsx` | The agent composer, session list, timeline and permission components |
| `ai-chat.test.tsx`, `ai-voice.test.tsx` | Chat components and voice input components |
| `automation.test.tsx` | agent-jobs, cron, status stack, webhooks |
| `capabilities.test.tsx` | CapabilitiesShell, toolsets, MCP servers and forms |
| `channels.test.tsx` | Agent persona and room, channels, remote screen, subagents |
| `browser-artifacts.test.tsx` | Agent browser, artifacts, git review |
| `providers.test.tsx` | Backends, LLM providers, local models, model routing |
| `privacy.test.tsx` | Chain of thought, chat sources, favicons, registry |
| `identity.test.tsx` | QRCode, QRScanner, SettingsShell, KeyValue and the identity kit |
| `security.test.tsx` | API keys, connected apps, consent, credential and payment cards, recovery key, TOTP |
| `billing-marketing.test.tsx` | Billing kit, marketing blocks, registry |
| `social.test.tsx` | AppLauncher, call overlay, counters, install prompt, messenger, ReorderableList, status cycle |
| `workspace.test.tsx` | Coachmarks, KeybindEditor, notice bar, timeline rail, workspace switcher |
| `suite.test.tsx` | Workspace suite: mentions, backlinks, quick capture |
| `splits.test.tsx` | Public surface of the split primitives-extra, cron, kanban, counters, status-cycle and assets/misc modules |
| `editor.test.tsx` | Code and rich-text editor, comments, DiffViewer, outline, version history |
| `media.test.tsx` | AudioPlayer, CastPicker, media cards and controls, VideoPlayer |
| `monitoring.test.tsx` | Alert groups, heatmap, JsonViewer, node cards, process table, request inspector, terminal |
| `ops.test.tsx` | LogViewer, ProgressDialog, TransferList |
| `loading-misc.test.tsx`, `loading-system.test.tsx` | Loading states of system and agent-process components |
| `kanban-memory.test.tsx` | Kanban and MemoryMap |
| `bugfix-admin-ops.test.tsx` | Bug-fix regressions: agent-admin, capabilities, ops |
| `bugfix-ai-agent.test.tsx` | Bug-fix regressions: AI and agent components |
| `bugfix-domains.test.tsx` | Bug-fix regressions: identity, security and other domain kits |
| `fixes-logic.test.tsx` | useControllableState, cron, TagInput, quick capture |
| `fixes-runtime.test.tsx` | SlotFill, TilingLayout focus, CallScreen, ApiKeyCreateDialog |
| `fixes-security.test.tsx` | PermissionPrompt, RichEmbed, TwoFactorSetupCard, SecretText, VoiceInput |
| `kits-review-fixes.test.tsx`, `kits-domain-review-fixes.test.tsx` | Review fixes across the kits and the domain kits |
| `review2-kits-a.test.tsx`, `review2-kits-b.test.tsx` | Review 2 kit fixes: relative captions, MemoryMap, ArtifactViewer, TilingLayout, polling gates |
| `review2-format.test.tsx` | One implementation of time, duration and byte formats in lib; wrappers keep their output |
| `sweeps-kits-ai.test.tsx`, `sweeps-kits-other.test.tsx` | Formatter presets, index clamps and resize observation moved to lib and hooks |
| `merge-conversations.test.tsx` | InlineEditText, ConversationList and Row, AgentStatusDot, MentionInput |
| `merge-live.test.tsx` | AgentStatusLine, StatusStrip, ToolTimelineDot, ContextBanner, presence dots |
| `merge-models.test.tsx` | Model state vocabulary, ModelStatePill, ModelSelect, ProviderModelPicker |
| `split-ai-admin.test.ts`, `split-blocks-billing.test.ts`, `split-identity-workspace.test.ts` | Public exports of the split kit and block modules |
| `motion-g4.test.tsx`, `motion-kits-ai-agent.test.tsx` | Motion in the kits and blocks (chevrons, skeletons, bubbles, status glyphs) |
| `vitals-*.test.tsx`, `system-*.test.tsx` | Vitals and system-monitor kit components, one file per family |
| `assets-review-fixes.test.tsx` | Review fixes of the mascot, Sutradhar sting and brand marks |
| `assets.test.tsx` | Brand, country flags, emoji reactions, file format icons, placeholder logos |

## Index: blocks

| File | What it covers |
| --- | --- |
| `blocks.test.tsx` | blockRegistry, blocks render and pass axe, PageHeaderWithTabs, ShareDialog |
| `blocks-auth-pages.test.tsx` | Auth page blocks |
| `blocks-registry.test.tsx` | Block registry entries |
| `review-fixes-blocks-primitives.test.tsx` | Stale async results in blocks, ShareDialog defaults, auth cards, AwaitingApproval, DocsHeader search |

## Index: hooks and lib

| File | What it covers |
| --- | --- |
| `lib.test.tsx` | lib/time, lib/duration, lib/format, lib/hash and the other lib modules |
| `helper-options.test.tsx` | formatDuration unitLabels, resolveColorToken, rampColor, useActiveIndicator |
| `shared-hooks.test.tsx` | mergeRefs, useMergedRefs, useObjectUrl |
| `hooks-review-fixes.test.tsx` | Review fixes in hooks and lib (textarea mirror, marquee selection, typewriter, useScrollable, useReorder, useDrag) |
| `vocabulary.test.tsx` | normalizeTone, normalizeTaskStatus, normalizeDensity |
| `foundations.test.tsx` | Tokens, cn, useTheme, typography |
| `motion-foundation.test.tsx`, `motion-primitives.test.tsx` | Motion tokens, keyframes, reduced-motion net, useAddedKeys, primitive motion |

## Index: tooling and conventions

| File | What it covers |
| --- | --- |
| `conventions.test.ts`, `rtl-conventions.test.ts`, `prop-spread.test.tsx`, `layering.test.ts`, `motion-guard.test.ts` | Source scanners that keep CONVENTIONS.md honest |
| `api-surface.test.ts`, `contracts.test.tsx`, `jsdoc-coverage.test.ts` | Public API surface, the controlled/uncontrolled contract of value components, JSDoc coverage |
| `docs-*.test.ts`, `build-transforms.test.ts`, `motion-net-gen.test.ts` | Docs generators, the extract-api script, dist transforms, the reduced-motion twin generator |
| `smoke.test.tsx` | The one test that loads the root barrel |
