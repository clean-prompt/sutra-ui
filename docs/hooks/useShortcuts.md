# useShortcuts

> Register several shortcuts at once. Works standalone (local listener) without a provider.

- Import: `import { useShortcuts } from "@cleanprompt/sutra-ui/suite"`
- Source: `packages/ui/src/patterns/shortcuts`

## Signature

```ts
useShortcuts(definitions: ShortcutDefinition[]): void
```

## Example (live: `#/components/suite/shortcuts` in the playground)

```tsx
<ShortcutsDemo />
<div>
  <CommandItemShortcutDemo />
</div>
```

Playground helpers in this snippet (not part of the library): CommandItemShortcutDemo, ShortcutsDemo.
