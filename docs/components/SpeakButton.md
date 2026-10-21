# SpeakButton

> Reads text aloud with the system voice for `lang`; hidden when no such voice exists.

- Import: `import { SpeakButton } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/voice`)
- Source: `packages/ui/src/kits/voice/voice` (kit `voice`)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `text` (required) | `string` |  | Text to read aloud. |
| `asChild` | `boolean` |  | Render as the child element (e.g. a link) while keeping button styles. |
| `fullWidth` | `boolean \| null` |  | Stretches the button to the width of its container. |
| `label` | `string` | `"Listen"` | Accessible label while idle. Default "Listen". |
| `lang` | `string` |  | BCP-47 language of `text`. |
| `leadingIcon` | `React.ReactNode` |  | Icon before the label. |
| `loading` | `boolean` |  | Shows a spinner and disables the button. |
| `rate` | `number` |  | Speaking speed, where 1 is normal; passed to speech synthesis. |
| `size` | `"icon" \| "sm" \| "md" \| "lg" \| "xs" \| "xl" \| "icon-xs" \| "icon-sm" \| "icon-lg" \| "icon-xl" \| null` | `"md"` | Button height and padding; `icon-*` sizes are square. |
| `spinnerProps` | `Partial<SpinnerProps>` |  | Overrides for the loading spinner (variant, size, `label`, colour via `className`); it inherits the button text colour by default. |
| `trailingIcon` | `React.ReactNode` |  | Icon after the label. |
| `variant` | `"link" \| "ghost" \| "primary" \| "destructive" \| "soft" \| "outline" \| "inverse" \| "secondary" \| "tertiary" \| "destructive-soft" \| null` | `"primary"` | Visual style: `primary` (filled), `secondary` (bordered), `tertiary` (muted fill), `soft`, `ghost`, `outline`, `destructive`, `destructive-soft`, `inverse` or `link`. |

## Example (live: `#/components/voice/speak-button` in the playground)

```tsx
import { SpeakButton, getLanguage } from "@cleanprompt/sutra-ui/voice";

function SpeakButtonDemo() {
  const samples = [
    { lang: "en", text: "Hello, how are you today?" },
    { lang: "hi", text: "नमस्ते, आप कैसे हैं?" },
    { lang: "ja", text: "こんにちは、お元気ですか？" },
    { lang: "fr", text: "Bonjour, comment ça va ?" },
  ];
  return (
    <>
      <ul className="space-y-2">
        {samples.map((s) => (
          <li key={s.lang} className="flex items-center gap-2 text-sm">
            <span lang={s.lang} className="min-w-0 flex-1">
              {s.text}
            </span>
            <span className="w-16 text-xs text-muted-foreground">{getLanguage(s.lang)?.name}</span>
            <SpeakButton text={s.text} lang={s.lang} label={`Listen (${getLanguage(s.lang)?.name})`} />
          </li>
        ))}
      </ul>
    </>
  );
}
```
