# useShortcutRegistry

> All labelled, non-hidden shortcuts in the registry, grouped. Deduplicated by id (latest wins).

- Import: `import { useShortcutRegistry } from "@cleanprompt/sutra-ui/suite"`
- Source: `packages/ui/src/patterns/shortcuts`

## Signature

```ts
useShortcutRegistry({ includeInactive }?: UseShortcutRegistryOptions): ShortcutRegistry
```

## Options and result

| Prop | Type | Default | Description |
|---|---|---|---|
| `includeInactive` | `boolean` | `false` | Include shortcuts whose scope is not active. Default false. |
