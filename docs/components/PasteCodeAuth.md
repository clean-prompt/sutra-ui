# PasteCodeAuth

> Sign-in fallback: open the URL, paste the code back, submit.

- Import: `import { PasteCodeAuth } from "@sutra/ui"` (or from `@sutra/ui/agent`)
- Source: `packages/ui/src/kits/agent/agent-onboarding` (kit `agent`)
- `data-slot`: `paste-code-auth`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `url` (required) | `string` |  | Sign-in URL to open in a browser. |
| `error` | `string \| null` |  | Controlled error message. |
| `onOpenUrl` | `(url: string) => void` |  | Called instead of following the link. |
| `onSubmit` | `(code: string) => void \| Promise<void>` |  | Resolve to finish, reject (or throw) to show the error. |
| `status` | `PasteCodeAuthStatus` |  | Controlled status (otherwise tracked from `onSubmit`). |
| `submitLabel` | `string` | `"Sign in"` | Label of the submit button. Default "Sign in". |
| `successText` | `React.ReactNode` | `"Signed in. You can close the browser tab."` | Message shown once the code is accepted. Default "Signed in. You can close the browser tab.". |
| `title` | `React.ReactNode` | `"Sign in with a code"` | Heading of the card. Default "Sign in with a code". |
| `validate` | `(code: string) => string \| null` |  | Return an error message for invalid codes. |

## Example (live: `#/components/agent-sessions/paste-code-auth` in the playground)

```tsx
import { PasteCodeAuth } from "@sutra/ui/agent";

function PasteCodeAuthDemo() {
  return (
    <>
      <div className="max-w-md">
        <PasteCodeAuth
          url="https://auth.example.com/device?session=4F7K-92QD"
          onOpenUrl={() => {}}
          validate={(c) => (c.length < 8 ? "That code looks too short" : null)}
          onSubmit={(code) =>
            new Promise<void>((resolve, reject) =>
              setTimeout(() => (code === "bad-code" ? reject(new Error("That code has expired. Get a new one.")) : resolve()), 900)
            )
          }
        />
      </div>
    </>
  );
}
```
