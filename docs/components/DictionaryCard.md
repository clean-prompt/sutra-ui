# DictionaryCard

> Dictionary entry: word, phonetic, frequency and senses grouped by part of speech with examples.

- Import: `import { DictionaryCard } from "@sutra/ui"` (or from `@sutra/ui/voice`)
- Source: `packages/ui/src/kits/voice/translate-dictionary` (kit `voice`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `senses` (required) | `DictionarySense[]` |  | Meanings grouped by part of speech, each with a definition and examples. |
| `word` (required) | `string` |  | The headword. |
| `actions` | `React.ReactNode` |  | Extra header actions (a SpeakButton is added for `lang` automatically). |
| `frequency` | `0 \| 1 \| 2 \| 3` |  | How common the word is, from 0 (rare) to 3 (very common); drawn as a three-bar meter. |
| `lang` | `string` |  | Language code of the word; sets `lang` and adds a speak button. |
| `phonetic` | `string` |  | Pronunciation text shown under the word (for example IPA). |

## Example (live: `#/components/voice/dictionary` in the playground)

```tsx
import { DictionaryCard } from "@sutra/ui/voice";

function DictionaryDemo() {
  return (
    <>
      <DictionaryCard
        word="bank"
        phonetic="/bæŋk/"
        lang="en"
        frequency={3}
        senses={[
          {
            partOfSpeech: "noun",
            definitions: [
              { text: "An organization that keeps money safe and lends it.", example: "She opened an account at the bank.", synonyms: ["lender", "treasury"] },
              { text: "The land along the side of a river.", example: "We had a picnic on the river bank." },
            ],
          },
          { partOfSpeech: "verb", definitions: [{ text: "To tilt an aircraft while turning.", example: "The plane banked to the left." }, { text: "To rely on something.", example: "Don't bank on it." }] },
        ]}
      />
      <DictionaryCard
        word="सुखद"
        phonetic="sukhad"
        lang="hi"
        frequency={1}
        senses={[{ partOfSpeech: "adjective", definitions: [{ text: "Pleasant; giving happiness.", example: "यह एक सुखद यात्रा थी।", synonyms: ["आनंददायक", "मनोहर"] }] }]}
      />
    </>
  );
}
```
