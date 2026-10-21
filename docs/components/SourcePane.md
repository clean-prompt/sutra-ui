# SourcePane

> Source text pane: auto-growing textarea, counter, clear, did-you-mean strip, voice/speak slots, RTL.

- Import: `import { SourcePane } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/voice`)
- Source: `packages/ui/src/kits/voice/translate-panes` (kit `voice`)
- `data-slot`: `did-you-mean`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultValue` | `string` | `""` | Initial text when uncontrolled. Default "". |
| `lang` | `string` |  | Language code of the text (drives `dir` and `lang`). |
| `maxLength` | `number` | `5000` | Character limit. Default 5000. |
| `minHeight` | `number` | `128` | Minimum textarea height in px. Default 128. |
| `onAcceptSuggestion` | `(suggestion: string) => void` |  | Called with the suggestion when the user accepts the "Did you mean" correction. |
| `onValueChange` | `(value: string) => void` |  | Called with the text on every edit. |
| `placeholder` | `string` | `"Enter text"` | Placeholder of the text area. Default "Enter text". |
| `speak` | `React.ReactNode` |  | Slot for a SpeakButton (default renders one for `lang` when text is present). |
| `suggestion` | `string` |  | "Did you mean" correction. |
| `textareaProps` | `React.TextareaHTMLAttributes<HTMLTextAreaElement>` |  | Props passed to the textarea. |
| `tools` | `React.ReactNode` |  | Extra footer tools (e.g. a TransliterationToggle). |
| `value` | `string` |  | Controlled text to translate. |
| `voice` | `React.ReactNode` |  | Slot for a VoiceInput. |

## Example (live: `#/components/voice/transliteration` in the playground)

```tsx
import * as React from "react";
import {
  SourcePane,
  TransliterationCandidates,
  TransliterationToggle,
} from "@cleanprompt/sutra-ui/voice";

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
