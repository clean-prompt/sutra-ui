# Skeleton

> Loading placeholder with a shimmer.

- Import: `import { Skeleton } from "@sutra/ui"` (or from `@sutra/ui/core`)
- Source: `packages/ui/src/primitives/progress` (primitives)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `height` | `number \| string` |  | Height of the placeholder (px number or CSS length); a circle without a height is as tall as it is wide. |
| `lines` | `number` | `1` | Number of text lines (shape "text" only). The last line is shorter. |
| `shape` | `"text" \| "circle" \| "rect"` | `"rect"` | What the placeholder looks like: text lines, a circle (avatar) or a rectangle. |
| `shimmer` | `boolean` | `true` | Shimmer sweep instead of a pulse. Default true. |
| `width` | `number \| string` |  | Width of the placeholder (px number or CSS length); defaults to the full width. |

## Notes

**When to use:** A loading placeholder shaped like the content to come: text lines, a circle or a rectangle, with a shimmer sweep or a pulse.

**Use instead when:**
- `Spinner`: a short wait with no content shape
- `Progress`: a known amount of work
- `Meter`: a level that is not loading

### Keyboard

Not focusable: no keyboard interaction.

### Screen readers

Every skeleton is `aria-hidden`, so it is invisible to assistive technology. Announce the wait yourself: set `aria-busy="true"` on the region being loaded, and add visually hidden text ("Loading profile…") or a status message, as the loading states of `Meter` and `BatteryLevel` do.

### Reduced motion

The shimmer (`animate-shimmer`) and the pulse both carry `motion-reduce:animate-none`, so a skeleton is a still muted block.

### Server rendering

Server render: same markup as the client. Plain `div` markup with no browser API, so server and client output match, which makes skeletons the right fallback for streamed content.

### Gotchas

- `shape` defaults to `"rect"` (96 px tall, full width). `"circle"` is 40 px unless you pass `width` (the height follows the width); `"text"` is one line high.
- `lines` only applies to `shape="text"` and makes a stack with a shorter last line (60 percent wide); the wrapper takes `width`, the lines take `height`.
- `shimmer={false}` swaps the sweep for `animate-pulse`.
- `width` and `height` accept a number (px) or any CSS length, and they win over `className` sizes because they are inline styles.

## Example

```tsx
import { Skeleton } from "@sutra/ui";

export function Example() {
  return (
    <div aria-busy="true" className="flex max-w-sm items-center gap-3">
      <span className="sr-only">Loading profile…</span>
      <Skeleton shape="circle" width={48} />
      <div className="flex-1">
        <Skeleton shape="text" width="40%" />
        <Skeleton shape="text" lines={2} className="mt-2" />
      </div>
    </div>
  );
}
```
