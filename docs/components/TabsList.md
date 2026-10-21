# TabsList

> Container for triggers; renders the sliding active indicator.

- Import: `import { TabsList } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/navigation`)
- Source: `packages/ui/src/primitives/tabs` (primitives)
- Part of [`Tabs`](Tabs.md)
- Also accepts the props of HTMLAttributes, PrimitivePropsWithRef, TabsListProps

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `fullWidth` | `boolean` |  | Stretch triggers to fill the width. |

## Notes

See the notes in [`Tabs`](Tabs.md#notes).

## Example

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@cleanprompt/sutra-ui";

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
