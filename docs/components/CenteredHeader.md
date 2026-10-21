# CenteredHeader

> Logo in the center, navigation split into left and right groups.

- Import: `import { CenteredHeader } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/blocks`)
- Source: `packages/ui/src/blocks/header-navigation-blocks` (blocks)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `border` | `"scroll" \| "always" \| "never"` | `"always"` | When the bottom border shows: always, never, or only after the page scrolls. |
| `cta` | `React.ReactNode` |  | Call to action on the far right. Pass `null` to hide. |
| `homeHref` | `string` | `"/"` | Link target of the logo. |
| `leftLinks` | `HeaderLink[]` | `[ { label: "Product", href: "#product" }, { label: "Apps", href: "#apps" }, { label: "Pricing", href: "#pricing" }, ]` | Links on the left of the logo, in order. |
| `logo` | `React.ReactNode` |  | Brand mark in the centre; the default is the Sutra logo. |
| `renderLink` | `BlockLinkRenderer` |  | Renders every link in place of the default `<a>`, e.g. to use your router's Link. |
| `rightLinks` | `HeaderLink[]` | `[ { label: "Stories", href: "#stories" }, { label: "Blog", href: "#blog" }, ]` | Links on the right of the logo, in order. |
| `sticky` | `boolean` | `true` | Pins the header to the top of the page. |
