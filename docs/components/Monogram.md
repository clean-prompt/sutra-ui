# Monogram

> Square letter tile for things that are not people: apps, providers, tools, workspaces. Same initials and seed colour as `Avatar`; use `Avatar` for users.

- Import: `import { Monogram } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent-admin`)
- Source: `packages/ui/src/primitives/monogram` (primitives)
- `data-slot`: `monogram`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` (required) | `string` |  | Name the letters and the seed colour are derived from. |
| `color` | `string` |  | Tile colour (any CSS colour); defaults to `colorForSeed(name)`. Ignored by the `brand` variant. |
| `initialsOptions` | `InitialsOptions` |  | Options for the generated letters. |
| `label` | `string` |  | Accessible name. Without it the tile is decorative (`aria-hidden`), which suits a tile next to a visible name. |
| `letters` | `string` |  | Override the generated letters (1–2 characters). |
| `size` | `MonogramSize` | `"md"` | Tile size from `xs` to `xl`. |
| `variant` | `MonogramVariant` | `"solid"` | Look: `solid` (tinted tile, white letters), `soft` (light tile) or `brand` (brand-colour tile). |

## Variants

- `size`: `xs`, `sm`, `md`, `lg`, `xl` (default "md")
- `variant`: `solid`, `soft`, `brand` (default "solid")

## Notes

**When to use:** A square letter tile for things that are not people: apps, providers, tools and workspaces. The letters and the colour come from the name, so the same name always looks the same.

**Use instead when:**
- `Avatar`: a person, with image, status and verified badge
- `Favicon`: a site's real icon with a fallback
- `Badge`: a text label, not a tile

### Keyboard

Not focusable: no keyboard interaction.

### Screen readers

Decorative by default: with no `label` the tile is `aria-hidden`, which suits a tile that sits next to the name as visible text. Pass `label` ("Calendar") to make it a `role="img"` with that name, for example when the tile stands alone.

### Reduced motion

Static: no animation.

### Server rendering

Server render: same markup as the client. Plain markup computed from the props, with no browser API. The seed colour is a pure function of `name`, so server and client output match.

### Slots

- `monogram`: the tile

### Gotchas

- Letters come from `monogramInitials(name)`: words split on anything that is not a letter or digit, the first letter of the first two words ("Nimbus AI" gives NA, "github-mcp" gives GM), two letters from a single word ("corvid" gives CO), and "?" for an empty name. `letters` or `children` replace them; `initialsOptions` tunes them.
- `name` is required even with `letters`, because it seeds the colour. `color` overrides it, and the `brand` variant ignores both and uses the brand gradient.
- `variant` is `solid` (seed colour, white letters; the default), `soft` (a light tint with coloured letters) or `brand`. `size` runs `xs` to `xl` and defaults to `md`.
- `ProviderLogo` and `CapabilityMonogram` are presets built on it; use `Avatar` for a user.

## Example

```tsx
import { Monogram } from "@cleanprompt/sutra-ui";

const tools = ["Nimbus AI", "github-mcp", "Calendar"];

export function Example() {
  return (
    <div className="flex items-center gap-6">
      <ul className="flex flex-col gap-2 text-sm">
        {tools.map((name) => (
          <li key={name} className="flex items-center gap-2">
            <Monogram name={name} size="sm" />
            {name}
          </li>
        ))}
      </ul>
      <Monogram name="Calendar" variant="soft" size="lg" label="Calendar" />
    </div>
  );
}
```
