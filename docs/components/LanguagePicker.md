# LanguagePicker

> Searchable language list (English/native name/code) with Detect, Recent and keyboard navigation.

- Import: `import { LanguagePicker } from "@sutra/ui"` (or from `@sutra/ui/voice`)
- Source: `packages/ui/src/kits/voice/translate` (kit `voice`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `allowDetect` | `boolean` | `false` | Offer the "Detect language" pseudo-option. |
| `autoFocus` | `boolean` | `true` | Focuses the search field on mount. |
| `defaultValue` | `string` |  | Initially selected code when uncontrolled. |
| `detected` | `string` |  | Language detected while on "Detect". |
| `label` | `string` | `"Languages"` | Accessible name for the list. Default "Languages". |
| `languages` | `Language[]` | `languages` | Languages to offer, each with a code and name; defaults to the built-in list. |
| `onValueChange` | `(code: string) => void` |  | Called with the language code when the user picks a language. |
| `recent` | `string[]` | `[]` | Recently used codes, most recent first. |
| `value` | `string` |  | Controlled language code of the selected entry. |

## Example (live: `#/components/voice/language-picker` in the playground)

```tsx
import * as React from "react";
import { LanguagePicker, getLanguage } from "@sutra/ui/voice";

function LanguagePickerDemo() {
  const [value, setValue] = React.useState("en");
  return (
    <>
      <div className="w-80 overflow-hidden rounded-box border border-border bg-popover shadow-lg">
        <LanguagePicker value={value} onValueChange={setValue} recent={["hi", "es", "ja"]} allowDetect autoFocus={false} />
      </div>
      {/* Selected: {getLanguage(value)?.name ?? value} */}
    </>
  );
}
```
