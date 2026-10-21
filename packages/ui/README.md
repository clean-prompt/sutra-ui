# @sutra/ui

The Sutra design system: React 19 components, design tokens, hooks, brand assets and page blocks, built on Tailwind CSS v4 and Radix. Flat, token-driven and accessible, with a light and dark theme, a monochrome "paper" style, and right-to-left support.

- **Primitives** (buttons, inputs, dialogs...), **patterns** (tables, charts, pickers, gestures, motion) and **domain kits** (agent, identity, billing, workspace, ops, media, voice, geo, editor...), plus ready-made **blocks**.
- **Tree-shakeable**: every module is its own file; import from the root or from a category entry (`@sutra/ui/forms`, `@sutra/ui/dataviz`, ...).
- **Accessible by default**: keyboard paths, ARIA, reduced motion (also an in-app `data-motion` switch), 24 px hit areas, tested with axe.
- **Themes**: brand colour, neutral palette, corner radius and the `data-style="paper"` ink-on-paper style are tokens, not component code.

## Install

```bash
pnpm add @sutra/ui
```

Peer dependencies: React 19 and Tailwind CSS v4 (the editor, terminal and PDF kits use optional peers that you install only if you use them).

```css
/* app/globals.css */
@import "tailwindcss";
@import "@sutra/ui/styles.css";
/* optional: @import "@sutra/ui/paper.css"; then <html data-style="paper"> */
```

```tsx
import { Button, Input, Field, FieldLabel } from "@sutra/ui";

export function Example() {
  return (
    <Field>
      <FieldLabel>Name</FieldLabel>
      <Input placeholder="Ada Lovelace" />
      <Button>Save</Button>
    </Field>
  );
}
```

Set the theme on `<html>` (`class="dark"`, `data-brand`, `data-neutral`, `data-radius`, `data-style`) or with the `useTheme` hook. For right-to-left, set `dir="rtl"` or wrap a subtree in `DirectionProvider`.

## Documentation

- Source, a component playground with props, code and notes for every component, the changelog and the conventions: <https://github.com/clean-prompt/sutra-ui>.
- `llms.txt`, `llms-full.txt` and one markdown page per component are generated for AI assistants (see the repository's `skills/sutra-ui` for a Claude skill).

## License

MIT
