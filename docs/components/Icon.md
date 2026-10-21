# Icon

> Sized, toned wrapper around any icon component.

- Import: `import { Icon } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/assets`)
- Source: `packages/ui/src/assets/icons` (assets)
- Also accepts the props of SVGAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `as` (required) | `IconComponent` |  | The icon component to render, e.g. `RiHomeLine`. |
| `label` | `string` |  | Accessible label. When omitted the icon is decorative (`aria-hidden`). |
| `size` | `IconSize` | `"sm"` | Icon size: `xs` 12px, `sm` 16px, `md` 20px, `lg` 24px or `xl` 32px. |
| `tone` | `IconTone` |  | Semantic colour; the default inherits the surrounding text colour. |

## Variants

- `size`: `sm`, `md`, `lg`, `xl` (default "sm")

## Example (live: `#/components/assets/icons` in the playground)

```tsx
import * as React from "react";
import { Icon } from "@cleanprompt/sutra-ui/assets";
import { RiHeartLine, RiStarLine } from "@cleanprompt/sutra-ui/icons";
import { useCopy } from "@cleanprompt/sutra-ui/tokens";

function IconsDemo() {
  const { copied, copy } = useCopy();
  const [lastCopied, setLastCopied] = React.useState<string | null>(null);

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-2">
        {popularIcons.map(([name, Comp]) => (
          <button
            key={name}
            type="button"
            onClick={async () => {
              if (await copy(name)) setLastCopied(name);
            }}
            className="flex flex-col items-center gap-2 rounded-control border border-transparent px-1 py-3 text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Icon as={Comp} size="lg" />
            <span className="w-full truncate text-center text-[10px]">
              {copied && lastCopied === name ? "Copied" : name.slice(2)}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {/* Icon sizes and tones */}
        <div className="flex flex-wrap items-center gap-4">
          {(["xs", "sm", "md", "lg", "xl"] as const).map((size) => (
            <Icon key={size} as={RiStarLine} size={size} />
          ))}
          <span className="mx-2 h-6 w-px bg-border" />
          {(["default", "muted", "primary", "success", "warning", "destructive", "info"] as const).map((tone) => (
            <Icon key={tone} as={RiHeartLine} size="lg" tone={tone} label={tone} />
          ))}
        </div>
      </div>
    </>
  );
}
```

Playground helpers in this snippet (not part of the library): popularIcons.
