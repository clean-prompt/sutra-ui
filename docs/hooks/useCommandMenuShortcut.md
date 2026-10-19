# useCommandMenuShortcut

> Toggles a command menu with ⌘/Ctrl + `key` (default "k"). Registers in the shortcut registry when a `ShortcutProvider` is present; otherwise uses its own listener.

- Import: `import { useCommandMenuShortcut } from "@sutra/ui/overlays"`
- Source: `packages/ui/src/patterns/command-menu`

## Signature

```ts
useCommandMenuShortcut(setOpen: Dispatch<SetStateAction<boolean>>, key?: string): void
```
