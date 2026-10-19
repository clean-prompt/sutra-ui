# FileFormatIcon

> A document icon with a folded corner and a colored file-extension label.

- Import: `import { FileFormatIcon } from "@sutra/ui"` (or from `@sutra/ui/assets`)
- Source: `packages/ui/src/assets/file-format` (assets)
- Also accepts the props of SVGAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `ext` (required) | `string` |  | Extension or filename (e.g. `"pdf"` or `"Q3 report.pdf"`). |
| `color` | `string` |  | Override the format color. |
| `label` | `string` |  | Override the label text (defaults to the uppercased extension). |
| `size` | `FileFormatIconSize \| number` | `"md"` | Size token or height in pixels. |
| `title` | `string` |  | Accessible name; when set the icon is exposed as an image, otherwise it is decorative. |
| `variant` | `"default" \| "solid" \| "minimal"` | `"default"` | `default` white sheet with a colored label, `solid` colored sheet, `minimal` outline with colored text. |

## Example (live: `#/components/assets/file-format-icons` in the playground)

```tsx
import { FileFormatIcon, getFileCategory } from "@sutra/ui/assets";

function FileFormatIconsDemo() {
  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(3.5rem,1fr))] gap-x-4 gap-y-5">
        {allFormats.map((ext) => (
          <div key={ext} className="flex flex-col items-center gap-1.5" title={getFileCategory(ext)}>
            <FileFormatIcon ext={ext} size="md" />
            <span className="font-mono text-[10px] text-muted-foreground">.{ext}</span>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {/* Variants and sizes */}
        <div className="flex flex-wrap items-end gap-4">
          {(["default", "solid", "minimal"] as const).map((variant) => (
            <FileFormatIcon key={variant} ext="Q3 report.pdf" variant={variant} size="xl" />
          ))}
          <span className="mx-2 h-10 w-px bg-border" />
          {(["xs", "sm", "md", "lg", "xl"] as const).map((size) => (
            <FileFormatIcon key={size} ext="xlsx" variant="solid" size={size} />
          ))}
          <FileFormatIcon ext="brief.unknown" size="xl" label="file" />
        </div>
      </div>
    </>
  );
}
```

Playground helpers in this snippet (not part of the library): allFormats.
