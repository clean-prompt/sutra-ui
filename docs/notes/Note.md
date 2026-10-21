---
component: Note
module: primitives/empty-state
use: The quiet line a screen says while working or when there is nothing here: small, grey, optionally with a spinner or an icon, or in the destructive tone for a failure.
instead: EmptyState = a full placeholder with title and actions; InlineAlert = a boxed notice with an action; Spinner = only a loading indicator; Toaster = a transient message
server: ssr-safe
---

## Keyboard
Not focusable: no keyboard interaction.

## Screen readers
- A neutral or loading `Note` is `role="status"` (a polite live region); the destructive tone is `role="alert"` (assertive), so use it only for a real failure the user needs to hear.
- `loading` adds `aria-busy="true"`. The spinner in it is hidden from assistive technology, so the text must say what is happening ("Loading results…").
- Changing the text of a mounted `Note` is what a live region announces. Icons you pass as `icon` are not hidden for you: pass `aria-hidden` icons.

## Reduced motion
While `loading`, the text breathes with a slow `animate-pulse` that has `motion-reduce:animate-none`, and the net in `sutra.css` stops it too. The ring spinner keeps spinning, as it carries meaning.

## Server rendering
Plain markup with no browser API, so server and client output match.

## Slots
- `note`: the root, with `data-tone` (`neutral` or `destructive`) and `data-loading`

## Gotchas
- `loading` wins over the tone: a loading `Note` is never `alert`, whatever `tone` says, and it replaces `icon` with the spinner.
- `tone` is `neutral` or `destructive`. The older `default`, `error` and `busy` still work (`busy` as a tone or a prop equals `loading`), but are deprecated.
- `align` is `center` by default; `start` left-aligns the icon and text (it follows the writing direction, so it flips in RTL).

## Example
```tsx
import { Note } from "@cleanprompt/sutra-ui";
import { RiInboxLine } from "@cleanprompt/sutra-ui/icons";

export function Example() {
  return (
    <div className="flex flex-col gap-1">
      <Note loading>Loading results…</Note>
      <Note icon={<RiInboxLine aria-hidden />}>No messages yet.</Note>
      <Note tone="destructive" align="start">
        Could not load results. Check your connection and try again.
      </Note>
    </div>
  );
}
```
