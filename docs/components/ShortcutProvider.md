# ShortcutProvider

> Central keyboard shortcut registry. Mount once near the app root.

- Import: `import { ShortcutProvider } from "@sutra/ui"` (or from `@sutra/ui/suite`)
- Source: `packages/ui/src/patterns/shortcuts` (patterns)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `React.ReactNode` |  | The app subtree whose shortcuts the manager handles. |
| `platform` | `ShortcutPlatform` |  | Platform used to read `mod` and to show key glyphs. Defaults to the detected platform. |
| `sequenceTimeout` | `number` |  | Max delay between the keys of a sequence. Default 1000ms. |
| `target` | `Document \| HTMLElement \| null` |  | Element the keydown listener attaches to. Default `document`. |
