# KunjiRpSignIn

> Renders the official hosted rp.js button. Opt-in: Sutra's own `KunjiSignIn` makes no third-party requests.

- Import: `import { KunjiRpSignIn } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/kunji`)
- Source: `packages/ui/src/kits/identity/kunji-buttons` (kit `identity`)
- `data-slot`: `kunji-rp-sign-in`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `options` (required) | `KunjiRpOptions` |  | Options for the hosted relying-party script (client id, callback and so on). |
| `adapter` | `KunjiRpScriptAdapter` |  | Adapter from `createRpScriptAdapter()`. Loading the hosted script is a third-party request. |
| `onError` | `(error: unknown) => void` |  | Called with the error when the hosted script fails to load or sign-in fails. |
| `onSuccess` | `(detail: KunjiRpSuccessDetail) => void` |  | Called with the success detail from the hosted script. |
