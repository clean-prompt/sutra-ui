# useLightbox

> Imperative control for a `Lightbox`: `const lb = useLightbox(); lb.openAt(2); <Lightbox items={…} {...lb.props} />`.

- Import: `import { useLightbox } from "@cleanprompt/sutra-ui/mobile"`
- Source: `packages/ui/src/patterns/lightbox`

## Signature

```ts
useLightbox(initialIndex?: number): { open: boolean; index: number; openAt: (i?: number) => void; close: () => void; setIndex: Dispatch<SetStateAction<number>>; props: { open: boolean; onOpenChange: Dispatch<SetStateAction<boolean>>; index: number; onIndexChange: Dispatch<SetStateAction<number>>; }; }
```
