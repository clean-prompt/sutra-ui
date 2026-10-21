# useReorder

> Controlled/uncontrolled list state with move helpers.

- Import: `import { useReorder } from "@cleanprompt/sutra-ui/social"`
- Source: `packages/ui/src/hooks/use-reorder`

## Signature

```ts
useReorder<T>({ items: itemsProp, defaultItems, onItemsChange }?: UseReorderOptions<T>): { items: T[]; setItems: (next: T[] | ((prev: T[]) => T[])) => void; move: (from: number, to: number) => void; moveUp: (index: number) => void; moveDown: (index: number) => void; moveToTop: (index: number) => void; moveToBottom: (index: number) => void; }
```

## Options and result

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultItems` | `T[]` | `[]` | Initial items when uncontrolled. |
| `items` | `T[]` |  | Controlled items in order. Use with `onItemsChange`. |
| `onItemsChange` | `(items: T[]) => void` |  | Called with the full list in its new order after every move. |
