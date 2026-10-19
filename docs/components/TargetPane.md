# TargetPane

> Translation output: streaming caret, romanization, alternatives, senses, copy/share/speak and latency.

- Import: `import { TargetPane } from "@sutra/ui"` (or from `@sutra/ui/voice`)
- Source: `packages/ui/src/kits/voice/translate` (kit `voice`)
- `data-slot`: `translation`, `stream-caret`, `romanization`, `latency`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `text` (required) | `string` |  | The translated text. |
| `alternatives` | `string[]` | `[]` | Other phrasings of the translation, shown as chips. |
| `lang` | `string` |  | Language code of `text`; sets `lang` and the text direction. |
| `latencyMs` | `number` |  | Time to translate, in ms. |
| `onPickAlternative` | `(alt: string) => void` |  | Called with the alternative when the user picks one. |
| `onShare` | `(text: string) => void` |  | Called with the text when the user presses Share; the button is hidden when unset. |
| `placeholder` | `string` | `"Translation"` | Text shown while `text` is empty. Default "Translation". |
| `romanization` | `string` |  | Romanized reading of the output. |
| `senses` | `TranslationSense[]` | `[]` | Other meanings of a single-word translation. |
| `speak` | `React.ReactNode` |  | Override the speak button. |
| `streaming` | `boolean` | `false` | Output is still arriving: shows a blinking caret. |
