# MarketingHeader

> Marketing site header: logo, Products mega-menu of the 8 Sutra apps, links, auth actions and a mobile sheet.

- Import: `import { MarketingHeader } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/blocks`)
- Source: `packages/ui/src/blocks/header-navigation-blocks` (blocks)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `apps` | `SutraApp[]` | `[...sutraApps]` | Apps listed in the Products mega-menu. |
| `border` | `"scroll" \| "always" \| "never"` | `"scroll"` | When the bottom border shows: always, never, or only after the page scrolls. |
| `getAppHref` | `(app: SutraApp) => string` | `(app) => `#${app}`` | href for each app in the mega-menu. |
| `homeHref` | `string` | `"/"` | Link target of the logo. |
| `links` | `HeaderLink[]` | `defaultMarketingLinks` | Plain links after "Products". |
| `loginHref` | `string` | `"#login"` | Link target of the sign-in button. |
| `loginLabel` | `React.ReactNode` | `"Sign in"` | Text of the sign-in button. |
| `logo` | `React.ReactNode` |  | Brand mark in the top-left; the default is the Sutra logo. |
| `renderLink` | `BlockLinkRenderer` |  | Renders every link in place of the default `<a>`, e.g. to use your router's Link. Spread the given props onto it. |
| `signupHref` | `string` | `"#signup"` | Link target of the sign-up button. |
| `signupLabel` | `React.ReactNode` | `"Get started"` | Text of the sign-up button. |
| `sticky` | `boolean` | `true` | Pins the header to the top of the page. |
