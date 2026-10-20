# useAssistantOrbState

> The orb state for what a voice session is doing, by priority: error, speaking, thinking, listening, muted, idle. The assistant's own activity outranks the user's, so a barge-in shows `listening` only once the assistant stops. The result is stable between renders for the same flags.

- Import: `import { useAssistantOrbState } from "@sutra/ui/voice"`
- Source: `packages/ui/src/kits/voice/assistant-orb`

## Signature

```ts
useAssistantOrbState(flags: AssistantOrbFlags): "idle" | "thinking" | "muted" | "error" | "listening" | "speaking"
```

## Options and result

| Prop | Type | Default | Description |
|---|---|---|---|
| `error` | `boolean` |  | Something went wrong; wins over everything else. |
| `listening` | `boolean` |  | The microphone is open and the assistant is hearing the user. |
| `muted` | `boolean` |  | The microphone is muted; shown only when nothing else is going on. |
| `speaking` | `boolean` |  | The assistant is talking. |
| `thinking` | `boolean` |  | The assistant is working out an answer. |
