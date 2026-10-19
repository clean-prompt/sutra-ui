# TOTPCard

> Authenticator entry: issuer icon, account label, live code and a menu slot.

- Import: `import { TOTPCard } from "@sutra/ui"` (or from `@sutra/ui/security`)
- Source: `packages/ui/src/kits/identity/totp` (kit `identity`)
- `data-slot`: `totp-card`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `issuer` (required) | `string` |  | Service the code belongs to (for example "GitHub"), shown as the card title. |
| `account` | `string` |  | Account name or email, shown under the issuer. |
| `algorithm` | `TOTPAlgorithm` |  | HMAC algorithm (`SHA1`, `SHA256` or `SHA512`). Default "SHA1". |
| `code` | `string` |  | Server-provided current code (overrides `secret`). |
| `copyable` | `boolean` |  | Show the copy button. Default true. |
| `countdown` | `"circular" \| "linear" \| "none"` |  | Style of the time-left indicator: `circular`, `linear` or `none`. Default "circular". |
| `digits` | `number` |  | Number of digits in a code. Default 6. |
| `domain` | `string` |  | Domain for the favicon (defaults to the issuer name, which renders a monogram). |
| `getCode` | `(timestamp: number) => string \| Promise<string>` |  | Resolve a code for a timestamp (ms), e.g. from a server. |
| `icon` | `React.ReactNode` |  | Custom icon node; replaces the favicon. |
| `iconSrc` | `string` |  | Explicit icon URL for the issuer. |
| `menu` | `React.ReactNode` |  | Slot for an overflow menu (e.g. a DropdownMenu trigger). |
| `nextCode` | `string` |  | Server-provided next code, shown near the end of the period. |
| `nextThreshold` | `number` |  | Seconds left at which the countdown turns red and the next code appears. Default 5. |
| `onCopy` | `(code: string) => void` |  | Called with the code after it has been copied. |
| `onRollover` | `(counter: number) => void` |  | Called when the period rolls over. |
| `period` | `number` |  | Seconds each code is valid. Default 30. |
| `secret` | `string` |  | Base32 secret; codes are generated in the browser. |
| `showNext` | `boolean` |  | Preview the next code when fewer than `nextThreshold` seconds remain. Default true. |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Size of the card. Default "md". |

## Example (live: `#/components/security/authenticator` in the playground)

```tsx
import * as React from "react";
import { Button } from "@sutra/ui/core";
import {
  RiDeleteBinLine,
  RiEditLine,
  RiMore2Line,
  RiPushpinLine,
  RiQrCodeLine,
} from "@sutra/ui/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@sutra/ui/overlays";
import { TOTPCard } from "@sutra/ui/security";

function AuthenticatorDemo() {
  const [pinned, setPinned] = React.useState<string[]>(["gh"]);
  return (
    <div className="grid grid-cols-1 w-full gap-3 sm:grid-cols-2">
      {authenticatorAccounts.map((a) => (
        <TOTPCard
          key={a.id}
          issuer={a.issuer ?? a.account}
          account={a.account}
          secret={a.secret}
          digits={a.digits}
          period={a.period}
          algorithm={a.algorithm}
          countdown={a.digits === 8 ? "linear" : "circular"}
          className={pinned.includes(a.id) ? "ring-1 ring-primary/40" : undefined}
          menu={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-xs" aria-label={`${a.issuer} options`}>
                  <RiMore2Line />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  icon={<RiPushpinLine />}
                  onSelect={() => setPinned((p) => (p.includes(a.id) ? p.filter((x) => x !== a.id) : [...p, a.id]))}
                >
                  {pinned.includes(a.id) ? "Unpin" : "Pin to top"}
                </DropdownMenuItem>
                <DropdownMenuItem icon={<RiEditLine />}>Rename</DropdownMenuItem>
                <DropdownMenuItem icon={<RiQrCodeLine />}>Export QR</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem tone="destructive" icon={<RiDeleteBinLine />}>
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />
      ))}
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): authenticatorAccounts.
