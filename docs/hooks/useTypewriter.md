# useTypewriter

> Types one line, or several in turn, one character at a time (graphemes are not split). A `setTimeout` chain driven by state: one timer at a time, none once it is done, all cleared on unmount, safe under StrictMode. Under `prefers-reduced-motion` the full text is there from the first render and nothing runs (with several lines: the first with `loop`, otherwise the last, which is where the typing would have ended).

- Import: `import { useTypewriter } from "@cleanprompt/sutra-ui/tokens"`
- Source: `packages/ui/src/hooks/use-typewriter`

## Signature

```ts
useTypewriter(text: string | readonly string[], options?: UseTypewriterOptions): TypewriterState
```
