# useSlashTrigger

> Watch a textarea for a trigger character at the start of a word and report the query under the caret.

- Import: `import { useSlashTrigger } from "@sutra/ui/ai"`
- Source: `packages/ui/src/kits/ai/slash-menu`

## Signature

```ts
useSlashTrigger(textareaRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>, triggers?: readonly string[]): SlashTriggerState
```
