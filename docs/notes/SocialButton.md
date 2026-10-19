---
component: SocialButton
module: primitives/social-button
use: A sign-in button with the logo of an identity provider. `provider` picks one of eleven (google, apple, github, microsoft, x, facebook, linkedin, discord, slack, figma, gitlab) and the label defaults to "Continue with <Provider>".
instead: Button = a normal action with your own label and icon; KunjiButton = sign in with kunji, which has its own brand rules; TextLink = the sign-in is a link in running text
server: ssr-safe
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves focus to and from the button. A `disabled` or `loading` button is not focusable |
| Enter, Space | Activates it (native `<button>` behaviour) |

With `asChild` the child keeps its own keyboard behaviour: a link activates on Enter only. No arrow keys are used, so nothing changes in RTL.

## Screen readers
- A native `<button>` with `type="button"` unless you pass `type`; the name is its text, "Continue with GitHub" by default, or your `children`.
- `variant="icon"` shows only the logo and ignores `children`: its `aria-label` defaults to "Continue with <Provider>" and you can pass your own.
- The provider logos are `aria-hidden`.
- `loading` sets `aria-busy="true"` and disables the button. The spinner keeps its own default "Loading" status label.

## Reduced motion
The press effect (`active:scale-[0.98]`) and the colour fades are transitions, which the reduced-motion net ends within 1 ms. The `loading` spinner keeps turning, as a progress indicator does.

## Server rendering
Plain markup with no browser API, so server and client output match. The logos are inline SVG or icon components.

## Gotchas
- With `asChild`, `disabled` and `loading` cannot set the native `disabled` on the child (often a link), so, like `Button asChild`, the child gets `aria-disabled="true"`, `data-disabled`, `tabindex="-1"` and its clicks are swallowed in the capture phase; `loading` also sets `aria-busy` and swaps the logo for a spinner.
- `variant="brand"` paints the provider's own colours as fixed values (white for Google, black for Apple, and so on), so it does not follow the theme or `data-style`; the `default` (outlined) and `icon` variants do. `fullWidth` is ignored for `variant="icon"`.
- `children` replaces the whole label, including the provider name: the default text is only used when there are no `children`. The label is English unless you pass `children`.
- The element carries `data-provider` with the provider key, which is handy for tests and analytics.

## Example
```tsx
import * as React from "react";
import { SocialButton } from "@sutra/ui";

export function Example({ signIn }: { signIn: (provider: "google" | "github") => Promise<void> }) {
  const [pending, setPending] = React.useState<"google" | "github" | null>(null);
  const start = async (provider: "google" | "github") => {
    setPending(provider);
    try {
      await signIn(provider);
    } finally {
      setPending(null);
    }
  };
  return (
    <div className="flex w-full max-w-xs flex-col gap-2">
      <SocialButton provider="google" fullWidth loading={pending === "google"} onClick={() => start("google")} />
      <SocialButton provider="github" fullWidth loading={pending === "github"} onClick={() => start("github")} />
    </div>
  );
}
```
