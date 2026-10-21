# LockScreen

> Full-screen vault unlock: PIN boxes, password or passkey, with attempts, lockout and recovery-key mode.

- Import: `import { LockScreen } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/identity`)
- Source: `packages/ui/src/patterns/loading-screen` (patterns)
- `data-slot`: `lock-screen`, `lock-screen-pin-slot`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `appName` | `React.ReactNode` | `"Sutra"` | App identity shown above the form. |
| `description` | `React.ReactNode` |  | Text under the heading. |
| `footer` | `React.ReactNode` |  | Extra content at the bottom (e.g. "Sign out"). |
| `fullscreen` | `boolean` | `true` | Cover the window (`fixed`). Set false to fill the parent box. |
| `icon` | `React.ReactNode` |  | App icon; defaults to the Sutra mark. |
| `lockedUntil` | `number` |  | Externally imposed lockout end (epoch ms). |
| `lockoutSeconds` | `number \| ((lockouts: number) => number)` | `defaultLockout` | Lockout length in seconds, or a function of how many lockouts happened (1, 2, …). |
| `maxAttempts` | `number` | `5` | Wrong attempts allowed before a lockout. UI-only: the counter lives in this component's state and resets on reload, so enforce real limits on the server. |
| `mode` | `LockScreenMode` | `"pin"` | Primary unlock method. `passkey` shows only the passkey button. |
| `onPasskey` | `() => Promise<boolean \| void> \| boolean \| void` |  | Shows "Unlock with passkey". Resolve `false` to report a failure. |
| `onRecover` | `(recoveryKey: string) => Promise<boolean> \| boolean` |  | Enables the "Use recovery key" secondary mode. |
| `onUnlock` | `(secret: string) => Promise<boolean> \| boolean` |  | Resolve `true` to unlock, `false` for a wrong secret. Throwing counts as wrong. |
| `passkeyLabel` | `React.ReactNode` | `"Unlock with passkey"` | Text of the passkey button. |
| `pinLength` | `number` | `6` | Number of digits of the PIN. |
| `title` | `React.ReactNode` | `"Vault locked"` | Heading of the lock screen. |

## Example (live: `#/components/identity/lock-screen` in the playground)

```tsx
import { Button } from "@cleanprompt/sutra-ui/core";
import { SegmentedControl } from "@cleanprompt/sutra-ui/forms";
import { EmptyState, LockScreen } from "@cleanprompt/sutra-ui/identity";

<SegmentedControl
  aria-label="Unlock method"
  className="max-w-full self-start overflow-x-auto"
  value={lockMode}
  onValueChange={(v) => {
    setLockMode(v as LockScreenMode);
    setLockKey((k) => k + 1);
    setUnlocked(false);
  }}
  options={[
    { value: "pin", label: "PIN" },
    { value: "password", label: "Password" },
    { value: "passkey", label: "Passkey" },
  ]}
/>
<div className="relative h-[600px] overflow-hidden rounded-box border border-border">
  {unlocked ? (
    <EmptyState
      illustration="success"
      title="Unlocked"
      className="h-full justify-center"
      actions={
        <Button size="sm" variant="secondary" onClick={() => { setUnlocked(false); setLockKey((k) => k + 1); }}>
          Lock again
        </Button>
      }
    />
  ) : (
    <LockScreen
      key={lockKey}
      fullscreen={false}
      mode={lockMode}
      appName="Sutra Vault"
      maxAttempts={3}
      lockoutSeconds={15}
      onUnlock={async (secret) => {
        await new Promise((r) => setTimeout(r, 400));
        const ok = secret === (lockMode === "pin" ? "246810" : "sutra");
        if (ok) setUnlocked(true);
        return ok;
      }}
      onPasskey={async () => {
        await new Promise((r) => setTimeout(r, 600));
        setUnlocked(true);
      }}
      onRecover={async (key) => {
        await new Promise((r) => setTimeout(r, 400));
        const ok = key.trim().length >= 16;
        if (ok) setUnlocked(true);
        return ok;
      }}
      footer={
        <Button variant="link" size="sm" className="text-muted-foreground">
          Sign out
        </Button>
      }
    />
  )}
</div>
```
