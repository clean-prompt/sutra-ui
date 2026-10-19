# TransliterationToggle

> IME on/off toggle for transliteration input.

- Import: `import { TransliterationToggle } from "@sutra/ui"` (or from `@sutra/ui/voice`)
- Source: `packages/ui/src/kits/voice/translate` (kit `voice`)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultPressed` | `boolean` | `false` | Initial state when uncontrolled. Default false. |
| `glyph` | `React.ReactNode` | `"अ"` | Script sample shown on the button. Default "अ". |
| `languageName` | `string` |  | Language name for the label, e.g. "Hindi". |
| `onPressedChange` | `(pressed: boolean) => void` |  | Called with the new state when the user presses the toggle. |
| `pressed` | `boolean` |  | Controlled on/off state of transliteration. |
