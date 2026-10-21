# useTheme

> Read and write Sutra theme attributes on <html>. `initial` seeds the theme on mount only (like `useState`); fields it leaves out are read from <html> (`.dark`, `data-brand`, `data-neutral`, `data-radius`, `data-style`), so a theme set before hydration is kept, then fall back to the defaults. The document is the source of truth: the value follows <html> live, so every `useTheme` caller (and a `ThemeToggle`) sees a change made by any other, and `setTheme` writes only the fields it is given. Only attributes that differ are written. They stay on <html> after unmount so the theme persists. The server and hydration render the defaults (plus `initial`); the document's own theme settles right after.

- Import: `import { useTheme } from "@sutra/ui/tokens"`
- Source: `packages/ui/src/hooks/use-theme`

## Signature

```ts
useTheme(initial?: Partial<SutraTheme>): { theme: SutraTheme; setTheme: (patch: Partial<SutraTheme>) => void; }
```

## Options and result

| Prop | Type | Default | Description |
|---|---|---|---|
| `brand` | `Brand` |  | Brand palette that drives the primary colour. |
| `mode` | `"light" \| "dark"` |  | Colour scheme: `light` or `dark`. |
| `neutral` | `Neutral` |  | Neutral palette used for backgrounds, borders and text. |
| `radius` | `RadiusMode` |  | Corner radius preset applied to controls and cards. |
| `style` | `ThemeStyle` |  | Visual style (`data-style`). Leave it out for the stock look; `"paper"` also needs `@sutra/ui/paper.css`. |
