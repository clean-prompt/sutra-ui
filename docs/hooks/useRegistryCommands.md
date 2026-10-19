# useRegistryCommands

> Registry shortcuts as runnable commands, grouped. Empty outside a `ShortcutProvider`.

- Import: `import { useRegistryCommands } from "@sutra/ui/overlays"`
- Source: `packages/ui/src/patterns/command-menu`

## Signature

```ts
useRegistryCommands({ exclude }?: UseRegistryCommandsOptions): { groups: ShortcutRegistryGroup[]; commands: ShortcutRegistryItem[]; run: (id: string) => boolean; }
```

## Options and result

| Prop | Type | Default | Description |
|---|---|---|---|
| `exclude` | `string[]` | `[]` | Registry ids to leave out (e.g. the palette's own toggle). |
