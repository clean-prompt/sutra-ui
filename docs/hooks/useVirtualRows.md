# useVirtualRows

> Fixed-height windowing: which rows of a long list are inside (or near) the viewport.

- Import: `import { useVirtualRows } from "@sutra/ui/ops"`
- Source: `packages/ui/src/hooks/use-virtual-rows`

## Signature

```ts
useVirtualRows({ count, rowHeight, scrollElement, overscan, enabled, fallbackHeight, }: UseVirtualRowsOptions): VirtualRows
```

## Options and result

| Prop | Type | Default | Description |
|---|---|---|---|
| `count` (required) | `number` |  | Total number of rows in the list. |
| `rowHeight` (required) | `number` |  | Fixed row height in px. |
| `scrollElement` (required) | `HTMLElement \| null` |  | The scrolling element. |
| `enabled` | `boolean` | `true` | When false, every row is rendered. Default true. |
| `fallbackHeight` | `number` | `480` | Viewport height assumed before the element has been measured. Default 480. |
| `overscan` | `number` | `12` | Extra rows rendered above and below the viewport. Default 12. |
