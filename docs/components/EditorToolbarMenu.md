# EditorToolbarMenu

> Dropdown tool (e.g. Insert ▸ Math, Mermaid, Callout) whose items carry icon, description and shortcut.

- Import: `import { EditorToolbarMenu } from "@sutra/ui"` (or from `@sutra/ui/editor`)
- Source: `packages/ui/src/kits/editor/editor-toolbar` (kit `editor`)
- Part of [`EditorToolbar`](EditorToolbar.md)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `items` (required) | `EditorToolbarMenuItem[]` |  | Menu entries, each with a label, optional icon, shortcut and handler. |
| `label` (required) | `string` |  | Accessible name and menu label of the trigger. |
| `align` | `"start" \| "center" \| "end"` | `"start"` | Alignment of the menu against the trigger. |
| `className` | `string` |  | Extra classes for the trigger. |
| `contentClassName` | `string` |  | Extra classes for the menu content. |
| `disabled` | `boolean` |  | Disables the trigger. |
| `footer` | `React.ReactNode` |  | Extra content under the items (e.g. a hint). |
| `icon` | `React.ReactNode` |  | Icon of the trigger. |
| `showLabel` | `boolean` | `true` | Show the label text (default true); icon-only otherwise. |

## Example (live: `#/components/editor/editor-toolbar` in the playground)

```tsx
import * as React from "react";
import {
  EditorToolbar,
  EditorToolbarButton,
  EditorToolbarMenu,
  EditorToolbarSeparator,
} from "@sutra/ui/editor";
import {
  RiBold,
  RiDoubleQuotesL,
  RiFunctions,
  RiImageLine,
  RiInformationLine,
  RiItalic,
  RiListOrdered,
  RiListUnordered,
  RiStrikethrough,
  RiTableLine,
} from "@sutra/ui/icons";

function ToolbarOverflowDemo() {
  const [width, setWidth] = React.useState(360);
  const [pressed, setPressed] = React.useState({ bold: true, italic: false });
  return (
    <div className="w-full space-y-3">
      <label className="flex items-center gap-3 text-sm text-muted-foreground">
        Width
        <input type="range" min={160} max={720} value={width} onChange={(e) => setWidth(Number(e.target.value))} aria-label="Toolbar width" className="h-6" />
        <span className="tabular-nums">{width}px</span>
      </label>
      <div style={{ width }} className="max-w-full overflow-hidden rounded-box border border-border">
        <EditorToolbar aria-label="Overflow demo" className="border-b-0">
          <EditorToolbarButton label="Bold" shortcut="mod+b" icon={<RiBold />} pressed={pressed.bold} onClick={() => setPressed((p) => ({ ...p, bold: !p.bold }))} />
          <EditorToolbarButton label="Italic" shortcut="mod+i" icon={<RiItalic />} pressed={pressed.italic} onClick={() => setPressed((p) => ({ ...p, italic: !p.italic }))} />
          <EditorToolbarButton label="Strikethrough" icon={<RiStrikethrough />} />
          <EditorToolbarSeparator />
          <EditorToolbarButton label="Bulleted list" icon={<RiListUnordered />} />
          <EditorToolbarButton label="Numbered list" icon={<RiListOrdered />} />
          <EditorToolbarButton label="Quote" icon={<RiDoubleQuotesL />} />
          <EditorToolbarSeparator />
          <EditorToolbarButton label="Image" icon={<RiImageLine />} />
          <EditorToolbarButton label="Table" icon={<RiTableLine />} />
          <EditorToolbarMenu
            label="Insert"
            items={[
              { label: "Math", icon: <RiFunctions />, shortcut: "mod+shift+m" },
              { label: "Callout", icon: <RiInformationLine /> },
            ]}
          />
        </EditorToolbar>
      </div>
    </div>
  );
}
```
