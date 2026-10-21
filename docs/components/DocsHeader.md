# DocsHeader

> Documentation header: logo, version switcher, links, ⌘K search, GitHub and theme toggle.

- Import: `import { DocsHeader } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/blocks`)
- Source: `packages/ui/src/blocks/header-navigation-blocks` (blocks)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultVersion` | `string` |  | Initially selected version when uncontrolled. |
| `githubHref` | `string` | `"https://github.com"` | Link target of the GitHub button. |
| `homeHref` | `string` | `"/"` | Link target of the logo. |
| `links` | `HeaderLink[]` | `[ { label: "Guides", href: "#guides" }, { label: "Components", href: "#components" }, { label: "Blocks", href: "#blocks" }, { label: "API", href: "#api" }, ]` | Links in the header, after the logo. |
| `logo` | `React.ReactNode` |  | Brand mark in the top-left; the default is the Sutra logo. |
| `onSearchSelect` | `(item: DocsSearchItem) => void` |  | Called with the item the user picked in the search palette. |
| `onThemeChange` | `(theme: "light" \| "dark") => void` |  | Called with the new mode when the theme button is clicked. |
| `onVersionChange` | `(version: string) => void` |  | Called with the version the user picked. |
| `renderLink` | `BlockLinkRenderer` |  | Renders every link in place of the default `<a>`, e.g. to use your router's Link. |
| `searchItems` | `DocsSearchItem[]` | `defaultDocsSearch` | Items listed in the search palette; each has a `value`, a `label` and an optional section and href. |
| `sticky` | `boolean` | `true` | Pins the header to the top of the page. |
| `theme` | `"light" \| "dark"` |  | Current color mode. When uncontrolled the header toggles the `dark` class on <html>. |
| `version` | `string` |  | Controlled selected version. Use with `onVersionChange`. |
| `versions` | `string[]` | `["v2.4.0", "v2.3.1", "v1.9.0"]` | Documentation versions offered in the version select; omit to hide it. |
