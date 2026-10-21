# SecretRevealOnce

> Show-once secret: copy or download it now, acknowledge, then Done.

- Import: `import { SecretRevealOnce } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/security`)
- Source: `packages/ui/src/kits/identity/secret` (kit `identity`)
- `data-slot`: `secret-reveal-once`, `secret-reveal-value`, `secret-canvas`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `secret` (required) | `string` |  | The secret to show once; it is not stored by the component. |
| `acknowledgeLabel` | `React.ReactNode` | `"I've stored this key somewhere safe"` | Label of the confirmation checkbox that unlocks Done. Default "I've stored this key somewhere safe". |
| `children` | `React.ReactNode` |  | Extra content between the secret and the acknowledgement (e.g. usage snippet). |
| `description` | `React.ReactNode` | `"Only a hash is stored. You won't be able to see this key again."` | Helper text under the heading. Default says only a hash is stored. |
| `doneLabel` | `React.ReactNode` | `"Done"` | Label of the Done button. Default "Done". |
| `fileContent` | `string` |  | Content written to the downloaded file. Defaults to the secret plus a newline. |
| `fileName` | `string \| false` | `"secret.txt"` | File name for the download button; `false` hides it. Default "secret.txt". |
| `onCopy` | `() => void` |  | Called after the secret has been copied. |
| `onDone` | `() => void` |  | Called when the user presses Done after confirming. |
| `renderAs` | `"text" \| "canvas"` | `"text"` | `canvas` draws the secret into a canvas so it never lands in the DOM as text. Default "text". |
| `title` | `React.ReactNode` | `"Copy this key now"` | Heading of the card. Default "Copy this key now". |

## Example (live: `#/components/security/secret-reveal-once` in the playground)

```tsx
import * as React from "react";
import { Button } from "@cleanprompt/sutra-ui/core";
import { RiAddLine } from "@cleanprompt/sutra-ui/icons";
import { SecretRevealOnce } from "@cleanprompt/sutra-ui/security";

function SecretRevealOnceDemo() {
  const [secret, setSecret] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(0);
  const generate = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(18));
    setSecret(`sk-live-${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`);
  };
  return secret ? (
    <SecretRevealOnce
      className="w-full max-w-lg"
      secret={secret}
      fileName="sutra-api-key.txt"
      onDone={() => {
        setSecret(null);
        setDone((n) => n + 1);
      }}
    />
  ) : (
    <div className="flex flex-col items-center gap-2">
      <Button leadingIcon={<RiAddLine />} onClick={generate}>
        Generate a key
      </Button>
      {done > 0 && {/* Acknowledged {done}×. The secret is gone from the UI. */}}
    </div>
  );
}
```
