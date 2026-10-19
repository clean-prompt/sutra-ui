# ThinkingExpandAllProvider

> Shares one "expand all thinking" switch with every ChainOfThought inside (e.g. a transcript).

- Import: `import { ThinkingExpandAllProvider } from "@sutra/ui"` (or from `@sutra/ui/ai`)
- Source: `packages/ui/src/kits/ai/chain-of-thought` (kit `ai`)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `React.ReactNode` |  | Transcript subtree whose thinking blocks and `ThinkingToggle` share the state. |
| `defaultExpanded` | `boolean` | `false` | Initial state when `expanded` is not controlled. |
| `expanded` | `boolean` |  | Controlled "expand all thinking" state shared by every `ChainOfThought` below. |
| `onExpandedChange` | `(expanded: boolean) => void` |  | Called with the new state when the user toggles it. |
