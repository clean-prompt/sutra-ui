# useShortcutPlatform

> Platform used for `mod` and glyphs: the `platform` given to the `ShortcutProvider`, else detected. Detection is not read during the hydrating render: the server and the first client render use the non-Mac default and a Mac browser settles on its own platform right after hydration, so the markup never mismatches. (A client-only render detects at once.)

- Import: `import { useShortcutPlatform } from "@cleanprompt/sutra-ui/suite"`
- Source: `packages/ui/src/hooks/use-shortcut-manager`

## Signature

```ts
useShortcutPlatform(): ShortcutPlatform
```
