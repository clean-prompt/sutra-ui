# useReturnFocus

> Hand focus back to whatever had it when a modal opened. Radix only restores focus to a `Dialog.Trigger`, so a dialog opened from a hotkey, a `SearchTrigger` or any controlled `open` state (no trigger) drops focus to the page body on close, which loses the user's place. Spread the returned handlers onto the Radix content; the caller's own `onOpenAutoFocus` / `onCloseAutoFocus` run first and a `preventDefault()` in the close handler still wins. If the opener is gone by then (a menu item that opened the dialog and unmounted), Radix's default applies.

- Import: `import { useReturnFocus } from "@cleanprompt/sutra-ui/tokens"`
- Source: `packages/ui/src/hooks/use-return-focus`

## Signature

```ts
useReturnFocus({ onOpenAutoFocus, onCloseAutoFocus }?: AutoFocusHandlers): { onOpenAutoFocus: (event: Event) => void; onCloseAutoFocus: (event: Event) => void; }
```

## Options and result

| Prop | Type | Default | Description |
|---|---|---|---|
| `onCloseAutoFocus` | `(event: Event) => void` |  |  |
| `onOpenAutoFocus` | `(event: Event) => void` |  |  |
