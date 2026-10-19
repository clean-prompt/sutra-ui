# useSpeechRecognition

> Web Speech API wrapper with interim/final transcript; inert (supported=false) where unavailable.

- Import: `import { useSpeechRecognition } from "@sutra/ui/voice"`
- Source: `packages/ui/src/kits/voice/voice`

## Signature

```ts
useSpeechRecognition(options?: UseSpeechRecognitionOptions): SpeechRecognitionState
```

## Options and result

| Prop | Type | Default | Description |
|---|---|---|---|
| `continuous` | `boolean` | `true` | Keep listening across pauses. Default true. |
| `interimResults` | `boolean` | `true` | Report partial results. Default true. |
| `lang` | `string` |  | BCP-47 language, e.g. "hi-IN". Default the document language. |
| `onEnd` | `() => void` |  |  |
| `onError` | `(error: string) => void` |  |  |
| `onFinal` | `(text: string) => void` |  | Called with each finalized chunk. |
