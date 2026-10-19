# KunjiSignIn

> "Sign in with kunji" widget: runs the protocol against the app's own endpoints and renders every state.

- Import: `import { KunjiSignIn } from "@sutra/ui"` (or from `@sutra/ui/kunji`)
- Source: `packages/ui/src/kits/identity/kunji-sign-in` (kit `identity`)
- Parts: [`KunjiSignInView`](KunjiSignInView.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `client` (required) | `KunjiClient` |  | Kunji client that creates the session and polls for approval (see `createKunjiClient`). |
| `appName` | `string` |  | App name shown in the identity line. Defaults to the session's. |
| `audience` | `string` |  | Domain shown in the identity line. Defaults to the session's audience. |
| `autoStart` | `boolean` |  | Start a session on mount. Default true. |
| `codeLength` | `number` |  | Digits for `enter` mode. Default 8. |
| `codeMode` | `"show" \| "enter" \| "none"` |  | `show`: the app shows a code to type in kunji (the protocol's fallback). `enter`: type a code kunji shows. |
| `deepLink` | `"auto" \| "always" \| "never"` |  | "Open kunji" same-device link: hero on small screens (`auto`), always, or never. |
| `description` | `React.ReactNode` |  | Replace the "You're signing in to … at …" line. |
| `footer` | `React.ReactNode` |  | Extra content under the widget (e.g. "Other ways to sign in"). |
| `notLinkedActions` | `React.ReactNode` |  | Shown in the not-linked state. Defaults to buttons for `onLink`/`onRegister`. |
| `onError` | `(error: unknown) => void` |  | Called with the error when creating the session or polling fails. |
| `onLink` | `() => void` |  | Called when the user presses the link button in the not-linked state; the button shows when set. |
| `onRegister` | `() => void` |  | Called when the user presses the register button in the not-linked state; the button shows when set. |
| `onStatusChange` | `(status: KunjiSignInStatus) => void` |  | Called with the new status each time the attempt moves to another state. |
| `onSuccess` | `(result: KunjiPollResult) => void` |  | Called after the success animation with the approved poll result. |
| `pollInterval` | `number` |  | Override the client's poll interval. |
| `qrLogo` | `React.ReactNode` |  | Logo on the QR plate. Defaults to the kunji mark. Pass `null` for none. |
| `qrSize` | `number` |  | QR code width and height in px. Default 196, or 148 for the compact variant. |
| `showSteps` | `boolean` |  | Show the 1-2-3 steps. Default true except for `compact`. |
| `slowAfter` | `number` |  | Mark the attempt `slow` after this many ms of loading or awaiting approval. Default 15000. 0 disables. |
| `statusText` | `Partial<Record<KunjiSignInStatus, string>>` |  | Override live-region messages. |
| `successDelay` | `number` |  | Delay between the success state and `onSuccess`, for the animation. Default 900ms. |
| `title` | `React.ReactNode` |  | Heading. Pass `null` to hide the header. |
| `variant` | `KunjiSignInVariant` |  | Layout: `card` (bordered, with heading), `inline` (no chrome) or `compact` (smaller QR, no steps). Default "card". |

## Part props

### KunjiSignInView

Presentational kunji sign-in: QR with logo plate, countdown, steps, code fallback, deep link and per-state status.

| Prop | Type | Default | Description |
|---|---|---|---|
| `state` (required) | `KunjiSignInState` |  | Current sign-in state: status, QR payload, code and error, as returned by `useKunjiSignIn`. |
| `appName` | `string` |  | App name shown in the identity line. Defaults to the session's. |
| `audience` | `string` |  | Domain shown in the identity line. Defaults to the session's audience. |
| `codeLength` | `number` | `8` | Digits for `enter` mode. Default 8. |
| `codeMode` | `"show" \| "enter" \| "none"` | `"show"` | `show`: the app shows a code to type in kunji (the protocol's fallback). `enter`: type a code kunji shows. |
| `deepLink` | `"auto" \| "always" \| "never"` | `"auto"` | "Open kunji" same-device link: hero on small screens (`auto`), always, or never. |
| `description` | `React.ReactNode` |  | Replace the "You're signing in to … at …" line. |
| `footer` | `React.ReactNode` |  | Extra content under the widget (e.g. "Other ways to sign in"). |
| `notLinkedActions` | `React.ReactNode` |  | Shown in the not-linked state. Defaults to buttons for `onLink`/`onRegister`. |
| `onLink` | `() => void` |  | Called when the user presses the link button in the not-linked state; the button shows when set. |
| `onRefresh` | `() => void` |  | Called when the user refreshes an expired QR code. |
| `onRegister` | `() => void` |  | Called when the user presses the register button in the not-linked state; the button shows when set. |
| `onRequestCode` | `() => void` |  | Called when the user asks for a code (`codeMode="show"`); the code option is available only when set or when the session carries a code. |
| `onRetry` | `() => void` |  | Called when the user retries after an error. |
| `onStart` | `() => void` |  | Called when the user starts sign-in (before a session exists). |
| `onSubmitCode` | `(code: string) => void` |  | Called with the typed code (`codeMode="enter"`). |
| `qrLogo` | `React.ReactNode` |  | Logo on the QR plate. Defaults to the kunji mark. Pass `null` for none. |
| `qrSize` | `number` |  | QR code width and height in px. Default 196, or 148 for the compact variant. |
| `showSteps` | `boolean` |  | Show the 1-2-3 steps. Default true except for `compact`. |
| `statusText` | `Partial<Record<KunjiSignInStatus, string>>` |  | Override live-region messages. |
| `title` | `React.ReactNode` | `"Sign in with kunji"` | Heading. Pass `null` to hide the header. |
| `variant` | `KunjiSignInVariant` | `"card"` | Layout: `card` (bordered, with heading), `inline` (no chrome) or `compact` (smaller QR, no steps). Default "card". |

## Example (live: `#/components/kunji/kunji-variants` in the playground)

```tsx
import { KunjiSignIn } from "@sutra/ui/kunji";

<div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
  <div className="flex flex-col items-center gap-2">
    {/* card */}
    <KunjiSignIn client={waitingClient} />
  </div>
  <div className="flex flex-col items-center gap-6">
    <div className="flex w-full max-w-sm flex-col items-center gap-2">
      {/* inline */}
      <KunjiSignIn client={waitingClient} variant="inline" showSteps={false} />
    </div>
    <div className="flex w-full flex-col items-center gap-2">
      {/* compact */}
      <KunjiSignIn client={waitingClient} variant="compact" />
    </div>
  </div>
</div>
```
