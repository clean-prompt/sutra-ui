# AuthImagePage

> Form on the left; full-bleed image or illustration slot on the right.

- Import: `import { AuthImagePage } from "@sutra/ui"` (or from `@sutra/ui/blocks`)
- Source: `packages/ui/src/blocks/auth-pages` (blocks)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `caption` | `React.ReactNode` | `( <> <p className="text-lg font-semibold text-white">Everything in one calm place</p> <p className="mt-1 text-sm text-white/75">Notes, tasks, calendar, mail and more — connected by a single thread.</p> </> )` | Caption overlaid at the bottom of the media. |
| `children` | `React.ReactNode` |  | The form. Defaults to a `LoginCard`. |
| `copyright` | `React.ReactNode` | `"© 2026 Sutra Labs"` | Copyright line. |
| `footerLinks` | `AuthPageLink[]` | `defaultFooterLinks` | Links in the page footer (terms, privacy, help); each has a `label` and an `href`. |
| `homeHref` | `string` | `"/"` | Where the logo links to. |
| `imageAlt` | `string` | `""` | Alt text of the panel image; the default is empty (decorative). |
| `imageSrc` | `string` |  | Image URL for the right panel. |
| `logo` | `React.ReactNode` |  | Logo shown at the top. Defaults to the Sutra lockup. |
| `media` | `React.ReactNode` |  | Custom illustration/media for the right panel (overrides `imageSrc`). |
| `renderLink` | `BlockLinkRenderer` |  | Renders the logo and footer links in place of the default `<a>`, e.g. to use your router's Link. |
