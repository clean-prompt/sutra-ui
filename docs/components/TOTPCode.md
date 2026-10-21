# TOTPCode

> Live one-time code with grouped digits, a countdown, copy and a next-code preview.

- Import: `import { TOTPCode } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/security`)
- Source: `packages/ui/src/kits/identity/totp` (kit `identity`)
- `data-slot`: `totp-countdown`, `totp-code`, `totp-value`, `totp-next`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `algorithm` | `TOTPAlgorithm` | `"SHA1"` | HMAC algorithm (`SHA1`, `SHA256` or `SHA512`). Default "SHA1". |
| `code` | `string` |  | Server-provided current code (overrides `secret`). |
| `copyable` | `boolean` | `true` | Show the copy button. Default true. |
| `countdown` | `"circular" \| "linear" \| "none"` | `"circular"` | Style of the time-left indicator: `circular`, `linear` or `none`. Default "circular". |
| `digits` | `number` | `6` | Number of digits in a code. Default 6. |
| `getCode` | `(timestamp: number) => string \| Promise<string>` |  | Resolve a code for a timestamp (ms), e.g. from a server. |
| `label` | `string` |  | Accessible name prefix, e.g. "GitHub". |
| `nextCode` | `string` |  | Server-provided next code, shown near the end of the period. |
| `nextThreshold` | `number` | `5` | Seconds left at which the countdown turns red and the next code appears. Default 5. |
| `onCopy` | `(code: string) => void` |  | Called with the code after it has been copied. |
| `onRollover` | `(counter: number) => void` |  | Called when the period rolls over. |
| `period` | `number` | `30` | Seconds each code is valid. Default 30. |
| `secret` | `string` |  | Base32 secret; codes are generated in the browser. |
| `showNext` | `boolean` | `true` | Preview the next code when fewer than `nextThreshold` seconds remain. Default true. |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Size of the code and countdown. Default "md". |

## Example (live: `#/components/security/totp-code` in the playground)

```tsx
import { TOTPCode } from "@cleanprompt/sutra-ui/security";

<div className="flex flex-col gap-2">
  <TOTPCode secret={DEMO_SECRET} size="lg" label="Demo" />
  {/* Large · circular */}
</div>
<div className="flex w-56 flex-col gap-2">
  <TOTPCode secret={DEMO_SECRET} digits={8} countdown="linear" label="Demo" />
  {/* 8 digits · linear */}
</div>
<div className="flex flex-col gap-2">
  <TOTPCode code="482913" size="sm" countdown="none" />
  {/* Server code · small */}
</div>
```

Playground helpers in this snippet (not part of the library): DEMO_SECRET.
