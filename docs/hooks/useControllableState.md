# useControllableState

> State that can be controlled (value + onChange) or uncontrolled (defaultValue). Functional updates compose within a tick (`set(v => v + 1)` twice adds 2) and the setter is stable.

- Import: `import { useControllableState } from "@sutra/ui/tokens"`
- Source: `packages/ui/src/hooks/use-controllable-state`

## Signature

```ts
useControllableState<T>({ value, defaultValue, onChange, }: { value?: T | undefined; defaultValue: T; onChange?: ((value: T) => void) | undefined; }): readonly [T, (next: T | ((prev: T) => T)) => void]
```

## Options and result

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultValue` (required) | `T` |  | Initial value used while the state is uncontrolled. |
| `onChange` | `(value: T) => void` |  | Called with the next value whenever it changes (controlled or not). |
| `value` | `T` |  | Controlled value; when it is not `undefined` the hook mirrors it and never changes it on its own. |
