# AuthSplitPage

> Two-column auth page: form on one side, brand panel with mesh gradient, testimonial and logos on the other.

- Import: `import { AuthSplitPage } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/blocks`)
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
| `logos` | `PlaceholderLogoEntry[]` |  | Logos under the testimonial. Pass `[]` to hide. |
| `logosTitle` | `React.ReactNode` | `"Trusted by 40,000+ people at"` | Heading above the logo row. |
| `panel` | `React.ReactNode` |  | Fully replace the brand panel content. |
| `renderLink` | `BlockLinkRenderer` |  | Renders the logo and footer links in place of the default `<a>`, e.g. to use your router's Link. |
| `reverse` | `boolean` | `false` | Put the brand panel on the left. |
| `testimonial` | `AuthTestimonial` | `defaultTestimonial` | Quote shown on the side panel: `quote`, author name and role. |
