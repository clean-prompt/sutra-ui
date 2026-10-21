# EmbedConsent

> Privacy gate shown in place of a third-party embed until the user agrees to load it.

- Import: `import { EmbedConsent } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/ai`)
- Source: `packages/ui/src/kits/ai/embeds` (kit `ai`)
- `data-slot`: `embed-consent`
- Parts: [`EmbedConsentProvider`](EmbedConsentProvider.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `domain` (required) | `string` |  | Domain the embed loads from, shown in the notice (e.g. "youtube.com"). |
| `provider` (required) | `string` |  | Provider display name, e.g. "YouTube". |
| `allowAlwaysLabel` | `string` |  | Label of the "Always allow" menu action. Defaults to "Always allow {provider}". |
| `children` | `React.ReactNode \| (() => React.ReactNode)` |  | The embed, rendered only after consent. |
| `consented` | `boolean` |  | Controlled consent for this embed. |
| `defaultConsented` | `boolean` | `false` | Initial consent when `consented` is not controlled. |
| `description` | `React.ReactNode` |  | Overrides the default "This will load content from … and may set cookies." |
| `icon` | `React.ReactNode` |  | Provider icon shown in the notice. |
| `loadLabel` | `string` | `"Load"` | Label of the button that loads the embed. Default "Load". |
| `onAllowAlways` | `(providerId: string) => void` |  | Fired with the consent key (`providerId`) when the user picks "Always allow". For providers whose server is user-controlled (e.g. Mastodon) RichEmbed passes an origin-scoped key, `"<id>:<origin>"`. |
| `onConsent` | `() => void` |  | Fired when the user clicks Load (or Always allow). |
| `preview` | `React.ReactNode` |  | Local preview shown inside the gate (no network). |
| `providerId` | `string` |  | Stable id used for remembered consent. Defaults to the lower-cased provider name. |

## Part props

### EmbedConsentProvider

Remembers which embed providers the user has "always allowed". Persistence is left to the app.

| Prop | Type | Default | Description |
|---|---|---|---|
| `allowed` | `readonly string[]` |  | Allowed provider ids (controlled). Persist them in your app (e.g. settings). |
| `children` | `React.ReactNode` |  | App subtree whose `EmbedConsent` and `RichEmbed` gates read the shared list. |
| `defaultAllowed` | `readonly string[]` | `[]` | Initially allowed provider ids when `allowed` is not controlled. |
| `onAllowedChange` | `(allowed: string[]) => void` |  | Called with the full allowed list when the user picks "Always allow" on an embed. |
