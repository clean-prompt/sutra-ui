# LightboxTrigger

> Opens the surrounding `Lightbox` at `index`. Render inside `<Lightbox>`'s children.

- Import: `import { LightboxTrigger } from "@sutra/ui"` (or from `@sutra/ui/mobile`)
- Source: `packages/ui/src/patterns/lightbox` (patterns)
- Part of [`Lightbox`](Lightbox.md)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `index` (required) | `number` |  | Item index to open. |
| `asChild` | `boolean` |  | Render as the child element instead of a `<button>`, keeping the trigger behaviour. |

## Notes

See the notes in [`Lightbox`](Lightbox.md#notes).

## Example

```tsx
import { Lightbox, LightboxTrigger, type LightboxItem } from "@sutra/ui";

const photos: LightboxItem[] = [
  { src: "/images/alps.jpg", alt: "Alps at dawn", caption: "Alps at dawn" },
  { src: "/images/lake.jpg", alt: "Lake at sunrise", caption: "Lake at sunrise" },
  { src: "/images/forest.jpg", alt: "Pine forest in fog" },
];

export function Example() {
  return (
    <Lightbox items={photos} loop>
      <div className="flex gap-2">
        {photos.map((photo, index) => (
          <LightboxTrigger key={photo.src} index={index}>
            <img src={photo.src} alt="" className="h-24 w-32 object-cover" />
          </LightboxTrigger>
        ))}
      </div>
    </Lightbox>
  );
}
```
