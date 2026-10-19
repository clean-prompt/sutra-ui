# TransliterationCandidates

> IME-style candidate popup under the caret: pick by number, click, or arrows + Enter/Space; Esc keeps the raw text.

- Import: `import { TransliterationCandidates } from "@sutra/ui"` (or from `@sutra/ui/voice`)
- Source: `packages/ui/src/kits/voice/translate` (kit `voice`)
- `data-slot`: `transliteration-candidates`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `anchorRef` (required) | `React.RefObject<HTMLTextAreaElement \| HTMLInputElement \| null>` |  | The textarea / input being typed in. |
| `getCandidates` (required) | `(word: string, lang: string) => string[] \| Promise<string[]>` |  | Return candidates for a romanized word. May be async. |
| `lang` (required) | `string` |  | Language code passed to `getCandidates`. |
| `enabled` | `boolean` | `true` | IME on/off. Default true. |
| `max` | `number` | `5` | Max candidates shown (and number keys honored). Default 5. |
| `onSelect` | `(candidate: string, word: string) => void` |  | Called with the chosen candidate and the romanized word it replaces. |

## Example (live: `#/components/voice/transliteration` in the playground)

```tsx
import * as React from "react";
import { SourcePane, TransliterationCandidates, TransliterationToggle } from "@sutra/ui/voice";

function TransliterationDemo() {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = React.useState("");
  const [ime, setIme] = React.useState(true);
  return (
    <>
      <SourcePane
        ref={ref}
        value={value}
        onValueChange={setValue}
        lang="hi"
        maxLength={500}
        minHeight={96}
        placeholder={ime ? "Type in Roman letters — converted to Hindi" : "Type"}
        tools={<TransliterationToggle pressed={ime} onPressedChange={setIme} languageName="Hindi" />}
      />
      <TransliterationCandidates anchorRef={ref} lang="hi" enabled={ime} getCandidates={getHindiCandidates} />
    </>
  );
}
```

Playground helpers in this snippet (not part of the library): getHindiCandidates.
