# Sutra

Monorepo for the Sutra personal suite.

| Path | What |
| --- | --- |
| `packages/ui` | **@sutra/ui**: design system with tokens, 100+ React components, AI chat kit, assets and blocks |
| `apps/playground` | Docs and showcase site for every component and block |

```bash
pnpm install
pnpm playground   # run the showcase at http://localhost:5173
pnpm build        # build @sutra/ui to packages/ui/dist
pnpm typecheck
```

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

### Imports

The build ships one ES module per source file and every file is marked `"use client"`. Bundlers only include what you import, so `import { Button } from "@sutra/ui"` stays small. Use a subpath when you want a narrower import or faster type-checking:

| Import | Contents |
| --- | --- |
| `@sutra/ui` | Everything except the Remix icon set |
| `@sutra/ui/icons` | `Icon`, `FeaturedIcon` and every Remix icon (`RiHomeLine` …) |
| `@sutra/ui/ai` | Chat, prompt, markdown, text shimmer, chain of thought, favicon |
| `@sutra/ui/suite` | Shortcut system, entity mentions, backlinks, quick capture, Today timeline, sync status |
| `@sutra/ui/dataviz` | Area, line, bar and donut charts, stat cards, meters, gauges, sparklines |
| `@sutra/ui/identity` | QR code and scanner, settings shell, key-value list, empty state, boot and lock screens, sessions, theme toggle |
| `@sutra/ui/ops` | Log viewer, transfer list and tray, streaming progress dialog |
| `@sutra/ui/mobile` | Bottom tab bar, swipe drawer, lightbox, file viewer, split pane, presence |
| `@sutra/ui/kunji` | kunji sign-in widget and client, link kunji, access gate, auth problems, sign-in blocks |
| `@sutra/ui/security` | Authenticator codes (TOTP), secrets, recovery keys, consent and scopes, API keys, credentials, payment cards, connected apps |
| `@sutra/ui/media` | Video and audio players, seek and volume controls, queue, poster/album cards, shelves, cast picker |
| `@sutra/ui/voice` | Voice input, read-aloud, language picker, translation panes, transliteration, dictionary |
| `@sutra/ui/social` | App launcher, identity marks, PWA install, calls, messenger, reorderable lists, counters, recurrence |
| `@sutra/ui/editor` | CodeMirror and TipTap editors, plus toolbar, outline, save status, diff, version history, comments |
| `@sutra/ui/terminal` | xterm.js terminal and session picker |

**Optional peers.** `@sutra/ui/editor` needs `@codemirror/*` and/or `@tiptap/*`, and `@sutra/ui/terminal` needs `@xterm/xterm` and `@xterm/addon-fit` (plus `import "@xterm/xterm/css/xterm.css"`). Nothing else in the package imports them, so apps that don't use those entries don't need to install them.

**kunji sign-in makes no third-party requests.** `createKunjiClient` draws the QR itself and only talks to your app's own endpoints. The hosted `rp.js` widget is available as an opt-in through `createRpScriptAdapter()`.

Markdown math (`<Markdown math>`) needs the KaTeX stylesheet: `import "katex/dist/katex.min.css"`.
| `@sutra/ui/forms` | Label, Field, inputs, select, checkbox, radio, switch, calendar, date picker, slider, combobox … |
| `@sutra/ui/overlays` | Tooltip, Popover, Dialog, DropdownMenu, ContextMenu, CommandMenu |
| `@sutra/ui/navigation` | Breadcrumbs, Pagination, tabs, header and sidebar navigation, TreeView |
| `@sutra/ui/assets` | Brand marks, placeholder logos, flags, emoji reactions, file formats |
| `@sutra/ui/blocks` | Composed blocks and `blockRegistry` |
| `@sutra/ui/tokens` | Design tokens, `cn`, and the hooks (`useTheme`, `useCopy`, `useControllableState`) |
| `@sutra/ui/components/<file>` | A single component file, e.g. `@sutra/ui/components/date-picker` |
| `@sutra/ui/blocks/<file>`, `@sutra/ui/assets/<file>` | A single block or asset file |
| `@sutra/ui/styles.css` | Tokens and Tailwind theme |

Remix icons are no longer exported from the root. Import them from `@sutra/ui/icons`, or directly from `@remixicon/react`.

### Theming

Every color, radius and shadow is a CSS variable. Set these attributes on `<html>` (or on any subtree):

| Attribute | Values |
| --- | --- |
| `class="dark"` / `data-theme="dark"` | dark mode |
| `data-brand` | `indigo` (default), `blue`, `sky`, `cyan`, `violet`, `rose`, `lime`, `green`, `yellow`, `orange`, `red` |
| `data-neutral` | `zinc` (default), `slate`, `gray`, `stone` |
| `data-radius` | `rounded` (default), `pill`, `square` |

You can also use the `useTheme()` hook to read and set them. Tokens are available as Tailwind utilities (`bg-primary`, `text-muted-foreground`, `rounded-control`, `rounded-box`, `shadow-lg` …) and as JS values (`colors`, `radii`, `shadows`, `typography`, `spacing`, `grid`).

## What's inside

- **Foundations:** color system, typography (`Heading`, `Text`, `Eyebrow`, `Kbd`), grid & responsive layout (`Container`, `Grid`, `GridItem`, `Stack`), shadows, corner radius, 4px spacing grid
- **Buttons & actions:** Button, ButtonGroup, AppStoreBadge, CloseButton, TextLink, SocialButton, FloatingActionButton
- **Feedback:** InlineAlert, Toaster/toast/Snackbar, AlertBanner
- **Utility:** AspectRatio, ScrollArea
- **Media:** Accordion/FAQ, BlogContent/Prose, CodeBlock
- **Data display:** Avatar, AvatarGroup, Separator/ContentDivider, FilterBar, Table/DataTable
- **Form controls:** Input, PasswordInput, SearchInput, InputOTP, Textarea, NumberInput, TagInput, Checkbox(+Group/Card), Radio(+Group/Card), Switch(+Group), Select, DatePicker/DateRangePicker, SegmentedControl, Slider, Rating, FileUpload, Dropzone
- **Indicators:** Chip, Badge, StatusBadge, Spinner, Progress/ProgressCircle/Skeleton, Steps
- **Navigation:** Breadcrumbs, Pagination, TabMenu, HeaderNav, Sidebar, SectionHeader/PageHeader, TreeView
- **Overlays:** Tooltip, InfoTooltip, Popover/HoverCard, Dialog/AlertDialog/ConfirmDialog/Sheet, DropdownMenu, ContextMenu, CommandDialog
- **AI:** ChainOfThought, ChatAttachment, ChatConversation, ChatListView, ChatLoader, ChatMessage, ChatMessageActions, ChatSource, ChatTool, Markdown, PromptInput, PromptSuggestion, TextShimmer
- **More:** Calendar, Combobox, ContextMenu, Field, InputGroup, Label, MeshGradient, PasswordStrength, Sparkline, Tabs
- **Assets:** Sutra brand (logo, mark, app icons), placeholder logos, icons (all of Remix Icon plus `Icon` and `FeaturedIcon`), country flags, emoji reactions and picker, file-format icons, illustrations and patterns
- **Blocks:** login and sign-up cards, full-page auth, dropdown menus, header navigation, sidebar navigation and app shell, section headers, modals and dialogs. `blockRegistry` lists all of them.

See `packages/ui/CONVENTIONS.md` for how components are written.
