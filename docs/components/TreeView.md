# TreeView

> Data-driven tree with expand/collapse, selection, tri-state checkboxes and full keyboard support.

- Import: `import { TreeView } from "@sutra/ui"` (or from `@sutra/ui/navigation`)
- Source: `packages/ui/src/patterns/tree-view` (patterns)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `nodes` (required) | `TreeNode[]` |  | Top-level nodes; each has an `id`, a `label` and optional `children`, icon and disabled flag. |
| `checkable` | `boolean` | `false` | Show tri-state checkboxes. Checking a parent checks every descendant. |
| `checked` | `string[]` |  | Fully checked node ids (parents included). |
| `defaultChecked` | `string[]` |  | Initially checked node ids when uncontrolled (see `checkable`). |
| `defaultExpanded` | `string[]` |  | Initially expanded node ids when uncontrolled. |
| `defaultSelected` | `string[]` |  | Initially selected node ids when uncontrolled. |
| `expanded` | `string[]` |  | Expanded node ids. |
| `expandOnClick` | `boolean` | `true` | Clicking a parent row toggles it. Default true. |
| `indentGuides` | `boolean` | `true` | Vertical indent guide lines. Default true. |
| `onCheckedChange` | `(checked: string[]) => void` |  | Called with the fully checked node ids after a checkbox changes. |
| `onExpandedChange` | `(expanded: string[]) => void` |  | Called with the expanded node ids after a node is expanded or collapsed. |
| `onNodeAction` | `(node: TreeNode) => void` |  | Fired on click or Enter. |
| `onSelectedChange` | `(selected: string[]) => void` |  | Called with the selected node ids after the selection changes. |
| `selected` | `string[]` |  | Controlled selected node ids. Use with `onSelectedChange`. |
| `selectionMode` | `"single" \| "multiple" \| "none"` | `"single"` | Default "single". |
| `showIcons` | `boolean` | `true` | Default folder/file icons when a node has no `icon`. Default true. |
| `size` | `"sm" \| "md"` | `"md"` | Row height and text size. |
| `typeahead` | `boolean` | `true` | Jump to nodes by typing their first letters. Default true. |

## Notes

**When to use:** A data-driven tree of nodes you can expand, select (one, many or none) and optionally check with tri-state checkboxes, with the full WAI-ARIA tree keyboard model, type-ahead and indent guides. Use it for file trees, nested settings and category pickers.

**Use instead when:**
- `Treemap`: hierarchy shown by size
- `Accordion`: a few stacked sections with free content
- `Sidebar`: app navigation
- `Select`: one value from a flat list
- `Table`: hierarchical rows with several columns

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | One tab stop (roving): the focused node, else the first selected visible node, else the first |
| ArrowDown, ArrowUp | Next or previous visible node. With Shift in `multiple` mode the destination is added to the selection |
| Arrow towards the inline end | On a closed parent: open it. On an open parent: focus its first child |
| Arrow towards the inline start | On an open parent: close it. Otherwise: focus the parent |
| Home, End | First or last visible node |
| Enter | Select the node (Ctrl or Cmd+Enter toggles in `multiple`) and call `onNodeAction` |
| Space | Toggle the checkbox when `checkable`, otherwise select (toggle in `multiple`) |
| `*` | Open every closed sibling of the focused node |
| Ctrl or Cmd+A | Select every enabled visible node (`multiple` only) |
| A letter | Jump to the next visible node whose text starts with what you typed (500 ms buffer; the same letter repeated cycles) |

In RTL the two horizontal arrows swap (`logicalArrow`): ArrowLeft opens and ArrowRight closes. Disabled nodes can be focused but not selected, opened or checked.

### Screen readers

- The list is `role="tree"` and needs `aria-label` or `aria-labelledby`; it has `aria-multiselectable` in `multiple` mode. Nodes are `treeitem`s with `aria-level`, `aria-posinset`, `aria-setsize`, `aria-expanded` (parents only), `aria-selected` (not with `selectionMode="none"`), `aria-disabled`, and, when `checkable`, `aria-checked` including `mixed`. Child lists are `role="group"`.
- The chevron, the visual checkbox and the icons are `aria-hidden`: the state is on the item. Collapsed children are not in the DOM.
- Type-ahead reads `label` when it is a string or number; use `textValue` for any other label.

### Reduced motion

The chevron turns with the `chevron-turn` transition and child lists open and close with `animate-collapsible-down` and `-up`. The global net ends the transition and the animation in 1 ms, so the list opens at once.

### Server rendering

Server render: same markup as the client. The whole tree is plain markup from `nodes` and the expanded ids; only expanded branches are rendered. Nothing depends on browser APIs until a key is pressed (the direction is read then).

### Gotchas

- A click on a row selects it and, on a parent, also toggles it (`expandOnClick`, default true). The chevron and the checkbox toggle only themselves. Parents are selectable too, and `onNodeAction` runs on click and Enter, not on Space or arrow movement.
- `expanded`, `selected` and `checked` are arrays of node ids with `onExpandedChange`, `onSelectedChange` and `onCheckedChange`. Checked state is derived from the leaves: `checked` lists every fully checked node, parents included, and a parent with a disabled unchecked leaf can only ever be `mixed` (toggling it checks the enabled leaves, toggling again clears them).
- `selectionMode` defaults to `single`; with `none` rows do not select (and omit `aria-selected`) but still expand and fire `onNodeAction`. With `checkable`, selection and checking are separate: Enter selects, Space checks.
- Row height is `size` (`sm` 28 px, `md` 32 px) and nesting indents by 14 or 16 px per level; `indentGuides={false}` and `showIcons={false}` remove the lines and the default folder and file icons.

## Example

```tsx
import * as React from "react";
import { TreeView, type TreeNode } from "@sutra/ui";

const files: TreeNode[] = [
  {
    id: "src",
    label: "src",
    children: [
      { id: "index", label: "index.ts" },
      { id: "utils", label: "utils.ts" },
    ],
  },
  { id: "readme", label: "README.md" },
];

export function Example() {
  const [selected, setSelected] = React.useState<string[]>([]);
  return (
    <TreeView aria-label="Project files" nodes={files} defaultExpanded={["src"]} selected={selected} onSelectedChange={setSelected} />
  );
}
```
