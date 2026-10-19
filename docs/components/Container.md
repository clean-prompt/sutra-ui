# Container

> Centres content and caps its width (`size`), with responsive horizontal padding. Extra props are spread to the root.

- Import: `import { Container } from "@sutra/ui"` (or from `@sutra/ui/core`)
- Source: `packages/ui/src/primitives/layout` (primitives)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `asChild` | `boolean` |  | Render as the child element (e.g. `<main>` or `<section>`) instead of a `<div>`, keeping the container styles. |
| `size` | `"sm" \| "md" \| "lg" \| "xl" \| "full"` | `"lg"` | Maximum content width: `sm` 48rem to `xl` 90rem, or `full` for no limit. |

## Variants

- `size`: `sm`, `md`, `lg`, `xl`, `full` (default "lg")

## Notes

**When to use:** Centres page content and caps its width, with responsive horizontal padding (16, 24 and 32 px). Sizes `sm` to `xl`, or `full` for no cap.

**Use instead when:**
- `Stack`: vertical or horizontal flow inside it
- `Grid`: a 12-column layout inside it
- `Card`: a bordered surface

### Keyboard

Not focusable: no keyboard interaction.

### Screen readers

A plain `div` with no role. For a landmark, pass `asChild` and a `main`, `section` or `nav` child (`<Container asChild><main>...</main></Container>`): the child keeps its own role and gets the container styles. A `section` is only a landmark when it has a name.

### Reduced motion

Static: no animation.

### Server rendering

Server render: same markup as the client. Plain markup with no browser API, so server and client output match.

### Gotchas

- `size` sets `max-width`: `sm` 48rem, `md` 64rem, `lg` (default) 80rem, `xl` 90rem, `full` none. The padding is always applied, including on `full`.
- It is `mx-auto w-full` with the padding built in, so nest it once per page region; a `Container` inside another one adds its padding twice.
- `className` is merged last: a `px-0` or a `max-w-*` of yours wins over the size.

## Example

```tsx
import { Container, Heading, Text } from "@sutra/ui";

export function Example() {
  return (
    <main>
      <Container size="md" className="py-10">
        <Heading as="h1" size="display-sm">
          Account settings
        </Heading>
        <Text tone="neutral" className="mt-2">
          Manage your profile, notifications and billing.
        </Text>
      </Container>
    </main>
  );
}
```
