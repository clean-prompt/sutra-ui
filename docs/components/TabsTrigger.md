# TabsTrigger

> A tab button with optional icon and count badge.

- Import: `import { TabsTrigger } from "@sutra/ui"` (or from `@sutra/ui/navigation`)
- Source: `packages/ui/src/primitives/tabs` (primitives)
- Part of [`Tabs`](Tabs.md)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes, PrimitivePropsWithRef, TabsTriggerProps

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `accent` | `Accent` |  | Categorical colour for this trigger when active; overrides the `Tabs` accent. |
| `badge` | `React.ReactNode` |  | Count badge after the label. |
| `icon` | `React.ReactNode` |  | Icon shown before the tab label. |

## Notes

See the notes in [`Tabs`](Tabs.md#notes).

## Example

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@sutra/ui";

export function Example() {
  return (
    <Tabs defaultValue="overview" variant="underline" className="max-w-md">
      <TabsList aria-label="Project sections">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="members" badge={12}>
          Members
        </TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="pt-4 text-sm">
        Atlas has 3 active sprints and 48 open issues.
      </TabsContent>
      <TabsContent value="members" className="pt-4 text-sm">
        Twelve people can edit this project.
      </TabsContent>
      <TabsContent value="settings" className="pt-4 text-sm">
        Rename, archive or delete the project.
      </TabsContent>
    </Tabs>
  );
}
```
