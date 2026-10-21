# LanguageBar

> Source/target language row: recent chips, full picker and a swap button.

- Import: `import { LanguageBar } from "@sutra/ui"` (or from `@sutra/ui/voice`)
- Source: `packages/ui/src/kits/voice/translate-picker` (kit `voice`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultSource` | `string` | `DETECT_LANGUAGE` | Initial source code when uncontrolled. Default "auto" (detect). |
| `defaultTarget` | `string` | `"en"` | Initial target code when uncontrolled. Default "en". |
| `detected` | `string` |  | Language detected while source is "auto". |
| `languages` | `Language[]` | `languages` | Languages to offer in both pickers; defaults to the built-in list. |
| `onSourceChange` | `(code: string) => void` |  | Called with the language code when the user picks a source language. |
| `onSwap` | `() => void` |  | Custom swap; default swaps (using the detected language when source is "auto"). |
| `onTargetChange` | `(code: string) => void` |  | Called with the language code when the user picks a target language. |
| `recentSources` | `string[]` | `[]` | Recently used source codes, most recent first, listed at the top of the source picker. |
| `recentTargets` | `string[]` | `[]` | Recently used target codes, most recent first, listed at the top of the target picker. |
| `source` | `string` |  | Controlled source language code, or `"auto"` to detect. |
| `target` | `string` |  | Controlled target language code. |
