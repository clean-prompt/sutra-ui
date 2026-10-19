---
component: CopyButton
module: primitives/copy-button
covers: CopyField
use: Copies a value to the clipboard, swaps its icon to a check mark and announces "Copied to clipboard". `CopyField` wraps it in a read-only row for commands, ids, keys and URLs.
instead: Input = the user types or edits the value (CopyField is read-only); Button = the action is not copying
server: ssr-safe
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves focus to and from the copy button. A `disabled` one is skipped |
| Enter, Space | Copies (native `<button>` behaviour) |

`CopyField` itself is a `role="group"` that is not focusable: only its copy button is. No arrow keys are used, so nothing changes in RTL.

## Screen readers
- The `icon` variant has no visible text, so `label` is its `aria-label` and `title`; after a copy both become `copiedLabel` for `timeout` ms (default 1600).
- The `button` and `ghost` variants show `label` or `copiedLabel` as text and set no `aria-label`.
- A visually hidden polite live region next to the button says "Copied to clipboard" after a successful copy. The text is fixed English and does not follow `copiedLabel`.
- `CopyField` is a `group` named by `label`, and its button is named "Copy <label>" ("Copy" without a label). The `prefix` is `aria-hidden` and is not copied.
- An `aria-label` you pass lands after the built-in one and wins, so the name stops changing to "Copied" (the live region still announces).

## Reduced motion
The icon swap (the copy glyph shrinks away, the check grows in) is an opacity and scale transition, which the reduced-motion net ends in 1 ms, so the swap is instant. The timer for the copied state is unaffected.

## Server rendering
Plain markup with no browser API at render (`navigator.clipboard` is read in the click handler), so server and client output match.

## Gotchas
- A failed write (permission denied, an insecure context, no `navigator.clipboard`) shows nothing: no copied state, no `onCopied`, no error. Handle the fallback yourself if the page may not be served over HTTPS.
- `value` may be a function, read at click time, so it can copy what is current. One that throws is swallowed and nothing is copied. An `onClick` that calls `preventDefault` cancels the copy.
- It renders two siblings, the button and the live-region span, so a parent with `gap` or `:last-child` rules sees both. `ref` is the button.
- `CopyField` truncates the value and puts the full text in `title` (`truncate={false}` wraps it instead), shows it in `<code>` unless `mono={false}`, and `copyButtonProps` passes props, such as `variant`, to the inner button.

## Example
```tsx
import { CopyButton, CopyField } from "@sutra/ui";

export function Example({ inviteUrl }: { inviteUrl: string }) {
  return (
    <div className="flex max-w-md flex-col gap-3">
      <CopyField label="API key" value="sk_live_51Hq7x2eZvKYlo2C" />
      <CopyField label="Install command" prefix="$" value="pnpm add @sutra/ui" />
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Invite link</span>
        <CopyButton
          variant="button"
          label="Copy link"
          copiedLabel="Link copied"
          value={() => inviteUrl}
        />
      </div>
    </div>
  );
}
```
