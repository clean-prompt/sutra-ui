# useKunjiSignIn

> State machine for kunji sign-in: idle → loading → ready → scanned → success | expired | denied | notLinked | error.

- Import: `import { useKunjiSignIn } from "@cleanprompt/sutra-ui/kunji"`
- Source: `packages/ui/src/kits/identity/kunji-sign-in-state`

## Signature

```ts
useKunjiSignIn({ client, onSuccess, onError, onStatusChange, autoStart, slowAfter, successDelay, pollInterval, }: UseKunjiSignInOptions): UseKunjiSignInReturn
```

## Options and result

| Prop | Type | Default | Description |
|---|---|---|---|
| `client` (required) | `KunjiClient` |  |  |
| `autoStart` | `boolean` | `true` | Start a session on mount. Default true. |
| `onError` | `(error: unknown) => void` |  | Called with the error when creating the session or polling fails. |
| `onStatusChange` | `(status: KunjiSignInStatus) => void` |  | Called with the new status each time the attempt moves to another state. |
| `onSuccess` | `(result: KunjiPollResult) => void` |  | Called after the success animation with the approved poll result. |
| `pollInterval` | `number` |  | Override the client's poll interval. |
| `slowAfter` | `number` | `15000` | Mark the attempt `slow` after this many ms of loading or awaiting approval. Default 15000. 0 disables. |
| `successDelay` | `number` | `900` | Delay between the success state and `onSuccess`, for the animation. Default 900ms. |
