# EmptyState

> Placeholder for an empty list, search or first-run screen. `variant="welcome"` is the large greeting at the start of a conversation or workspace (see `ChatEmptyState`).

- Import: `import { EmptyState } from "@sutra/ui"` (or from `@sutra/ui/identity`)
- Source: `packages/ui/src/primitives/empty-state` (primitives)
- `data-slot`: `empty-state`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `actions` | `React.ReactNode` |  | Buttons or links under the text. |
| `description` | `React.ReactNode` |  | Supporting text under the title. |
| `icon` | `React.ReactNode` |  | Icon shown in a ringed featured circle (default: inbox). Ignored when `illustration` is set. In the `welcome` variant it sits in a card tile and has no default. |
| `illustration` | `EmptyStateIllustrationVariant \| React.ReactNode` |  | An `EmptyStateIllustration` variant name, or any custom node. |
| `size` | `Size` | `"md"` | Spacing and type scale of the empty state. |
| `title` | `React.ReactNode` |  | Heading. Optional only for the `welcome` variant. |
| `variant` | `EmptyStateVariant` | `"default"` | `dashed` draws a dashed bordered drop-area style box; `welcome` is the large first-run greeting (`ChatEmptyState`). |

## Notes

**When to use:** The placeholder for an empty list, search result or first-run screen: an icon or illustration, a title, a description and actions. `variant="welcome"` is the large greeting at the start of a chat or workspace.

**Use instead when:**
- `Note`: a quiet one-line message inside a screen that is working or empty
- `InlineAlert`: a notice about something that needs attention
- `Skeleton`: content that is still loading
- `ChatEmptyState`: the welcome variant preconfigured for chat

### Keyboard

Not focusable itself: no keyboard interaction. The `actions` you pass (buttons, links) are ordinary tab stops.

### Screen readers

- The root is a `<section>` labelled by the title (`aria-labelledby`), so with a title it is a named `region` landmark. Without a title (only possible in practice for `welcome`) it has no name and is not a landmark.
- The title is a real heading: `h3` by default and `h2` for `variant="welcome"`. The level is not configurable, so check it fits your outline.
- Built-in illustrations (`search`, `inbox`, `files`, `error`, `success`, `cloud`) are `aria-hidden`, and so is the default inbox icon. A custom `illustration` node or `icon` is used as you pass it: hide decoration with `aria-hidden`.

### Reduced motion

The block rises in with `animate-fade-up`, which the reduced-motion net in `sutra.css` removes.

### Server rendering

Server render: same markup as the client. Plain markup with a `useId` for the heading, so server and client output match. The entrance animation starts when the page paints.

### Slots

- `empty-state`: the root `section`, with `data-variant` set to `default`, `dashed` or `welcome`

### Gotchas

- `icon` is ignored when `illustration` is set. In the `default` and `dashed` variants an empty `icon` falls back to an inbox glyph; in `welcome` there is no default icon and a given one sits in a small card tile.
- `illustration` takes one of the six variant names or any node: an unknown string is rendered as text, not looked up.
- `actions` sit in a wrapping row under the text; `children` follow them (inside a full-width box in `welcome`).
- `size` (`sm`, `md`, `lg`) sets spacing and type scale for the non-welcome variants only; `welcome` has its own fixed layout.

## Example

```tsx
import { Button, EmptyState } from "@sutra/ui";
import { RiAddLine } from "@sutra/ui/icons";

export function Example() {
  return (
    <EmptyState
      illustration="files"
      title="No documents yet"
      description="Upload a file or create a document to get started."
      actions={<Button leadingIcon={<RiAddLine aria-hidden />}>New document</Button>}
    />
  );
}
```
