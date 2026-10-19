# ContentDivider

> Alias of `Separator`.

**Deprecated:** Use `Separator` (it takes a `label`).

- Import: `import { ContentDivider } from "@sutra/ui"` (or from `@sutra/ui/core`)
- Source: `packages/ui/src/primitives/separator` (primitives)
- Also accepts the props of HTMLAttributes, SeparatorProps, PrimitivePropsWithRef

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `React.ReactNode` |  | Text or content shown inside the line. `children` works too. |
| `labelPosition` | `"start" \| "center" \| "end"` | `"center"` | Where the label sits along the line. |
| `variant` | `"solid" \| "dashed"` | `"solid"` | Line style. |

## Notes

**When to use:** A horizontal or vertical rule, solid or dashed, optionally with a label in the line ("OR", "Section"). `ContentDivider` is the deprecated alias of the same component.

**Use instead when:**
- `ItemSeparator`: the hairline inside an `ItemGroup`
- `Frame`: grouped rows with a tray
- `Stack`: spacing without a line

### Keyboard

Not focusable: no keyboard interaction.

### Screen readers

- Decorative by default: `decorative` is `true`, so the element is `role="none"` and assistive technology skips it. This is the opposite of the Radix default. Pass `decorative={false}` for a real `role="separator"` between regions of content; a vertical one then also gets `aria-orientation="vertical"` (horizontal is the implicit default and is not written).
- A `label` (or `children`) is ordinary text and is read by screen readers whether or not the line is decorative.

### Reduced motion

Static: no animation.

### Server rendering

Server render: same markup as the client. Plain markup with no browser API, so server and client output match.

### Gotchas

- A vertical separator has no height of its own: it stretches to the row it sits in (`self-stretch`), so put it in a flex row. A `className` with an `h-` or `size-` class switches it to a fixed height centred in the row instead.
- With a label, `labelPosition` is `center` (default), `start` or `end`; the short side of the line is a stub (1rem, or 0.5rem when vertical). A vertical labelled separator is at least 4rem tall.
- `variant="dashed"` only changes the line style. The line colour is the `border` token; override with a `border-*` class.
- `ContentDivider` is the same object as `Separator`; use `Separator` in new code.

## Example

```tsx
import { Separator } from "@sutra/ui";

export function Example() {
  return (
    <div className="flex max-w-sm flex-col gap-4 text-sm">
      <p>Sign in with your work email.</p>
      <Separator label="or" />
      <div className="flex h-5 items-center gap-3">
        <span>Docs</span>
        <Separator orientation="vertical" />
        <span>Pricing</span>
        <Separator orientation="vertical" />
        <span>Blog</span>
      </div>
    </div>
  );
}
```
