# KunjiSignInView

> Presentational kunji sign-in: QR with logo plate, countdown, steps, code fallback, deep link and per-state status.

- Import: `import { KunjiSignInView } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/kunji`)
- Source: `packages/ui/src/kits/identity/kunji-sign-in` (kit `identity`)
- `data-slot`: `kunji-deep-link`, `kunji-code`, `kunji-code-value`, `kunji-success`, `kunji-sign-in`, `kunji-identity`, `kunji-status`
- Part of [`KunjiSignIn`](KunjiSignIn.md)
- Also accepts the props of HTMLAttributes

## Props

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

## Example (live: `#/components/kunji/kunji-states` in the playground)

```tsx
import { KunjiSignInView } from "@cleanprompt/sutra-ui/kunji";

<div className="@container w-full">
  <div className="grid grid-cols-1 gap-6 @2xl:grid-cols-2 @6xl:grid-cols-3">
    {galleryStates.map((s) => (
      <div key={s} className="flex flex-col items-center gap-2">
        {/* {s} */}
        <KunjiSignInView state={stateFor(s)} variant="compact" onStart={() => {}} onRetry={() => {}} onRefresh={() => {}} onLink={() => {}} onRegister={() => {}} onRequestCode={() => {}} />
      </div>
    ))}
    <div className="flex flex-col items-center gap-2">
      {/* scanned + slow */}
      <KunjiSignInView state={stateFor("scanned", true)} variant="compact" onRetry={() => {}} />
    </div>
    <div className="flex flex-col items-center gap-2">
      {/* short code shown */}
      <KunjiSignInView state={{ ...stateFor("ready"), code: "482913", codeStatus: "ready" }} variant="compact" onRequestCode={() => {}} />
    </div>
  </div>
</div>
```

Playground helpers in this snippet (not part of the library): galleryStates, stateFor.
