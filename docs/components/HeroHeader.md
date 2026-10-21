# HeroHeader

> Marketing hero: eyebrow pill, display heading, subtext, CTAs on a mesh gradient.

- Import: `import { HeroHeader } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/blocks`)
- Source: `packages/ui/src/blocks/section-header-blocks` (blocks)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `align` | `"center" \| "start"` | `"center"` | Alignment of the copy and actions. |
| `description` | `React.ReactNode` | `"Notes, tasks, calendar, mail, files, journal, finance and habits in one beautifully connected suite. Less switching, more doing."` | Supporting text under the headline. |
| `eyebrow` | `React.ReactNode` | `"Sutra Journal is here"` | Small label above the title. |
| `eyebrowHref` | `string` | `"#journal"` | Makes the eyebrow a link to this URL. |
| `media` | `React.ReactNode` |  | Media below the copy (screenshot, DeviceFrame…). |
| `primaryAction` | `HeaderAction \| null` | `{ label: "Get started free", href: "#signup" }` | Main call-to-action (`label`, optional `icon`, and `onClick` or `href`); `null` hides it. |
| `secondaryAction` | `HeaderAction \| null` | `{ label: "Watch the demo", icon: <RiPlayCircleLine aria-hidden /> }` | Secondary call-to-action; `null` hides it. |
| `showLogos` | `boolean` | `true` | Show a logo cloud under the actions. |
| `title` | `React.ReactNode` | `( <> Your whole life, <span className="bg-gradient-to-br from-brand-400 to-brand-700 bg-clip-text text-transparent">one calm thread</span> </> )` | Headline; the default is sample text, so always set it. |
