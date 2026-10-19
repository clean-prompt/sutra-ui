# AuthCenteredPage

> Centered card on a dotted background, with the logo above and footer links below.

- Import: `import { AuthCenteredPage } from "@sutra/ui"` (or from `@sutra/ui/blocks`)
- Source: `packages/ui/src/blocks/auth-pages` (blocks)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `React.ReactNode` |  | The form. Defaults to a `LoginCard`. |
| `copyright` | `React.ReactNode` | `"© 2026 Sutra Labs"` | Copyright line. |
| `footerLinks` | `AuthPageLink[]` | `defaultFooterLinks` | Links in the page footer (terms, privacy, help); each has a `label` and an `href`. |
| `homeHref` | `string` | `"/"` | Where the logo links to. |
| `logo` | `React.ReactNode` |  | Logo shown at the top. Defaults to the Sutra lockup. |
| `pattern` | `"dots" \| "grid" \| "none"` | `"dots"` | Background pattern behind the card. |
| `renderLink` | `BlockLinkRenderer` |  | Renders the logo and footer links in place of the default `<a>`, e.g. to use your router's Link. |
