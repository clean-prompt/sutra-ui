# RichEmbed

> Renders a URL as a provider embed (after consent) or a link card. The iframe src is only built into the DOM post-consent.

- Import: `import { RichEmbed } from "@sutra/ui"` (or from `@sutra/ui/ai`)
- Source: `packages/ui/src/kits/ai/embeds` (kit `ai`)
- `data-slot`: `rich-embed`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `url` (required) | `string` |  | Address to embed; matched against `providers`, and shown as a link card when no provider matches. |
| `consented` | `boolean` |  | Skip the consent gate (only when your app already obtained consent). |
| `description` | `React.ReactNode` |  | Excerpt shown on the link-card fallback. |
| `image` | `React.ReactNode` |  | Image slot for the link-card fallback (app-provided). |
| `onAllowAlways` | `(providerId: string) => void` |  | Fired with the consent key when the user picks "Always allow": the provider id (e.g. `"youtube"`), or `"<id>:<origin>"` for origin-scoped providers such as Mastodon (`"mastodon:<origin>"`). Store it as-is in `EmbedConsentProvider`'s `allowed` list. |
| `onConsent` | `(providerId: string, consentKey: string) => void` |  | Fired when the embed is loaded after consent, with the provider id and the consent key. |
| `providers` | `readonly EmbedProvider[]` | `embedProviders` | Embed providers to match `url` against, first match wins; defaults to the built-in list. |
| `title` | `string` |  | Title for the local preview, the iframe title and the link card. |
