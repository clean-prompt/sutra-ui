# GroupInfoPanel

> Side panel for a group chat: members with roles, shared media grid, mute and leave.

- Import: `import { GroupInfoPanel } from "@sutra/ui"` (or from `@sutra/ui/social`)
- Source: `packages/ui/src/kits/social/messenger` (kit `social`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `members` (required) | `GroupMember[]` |  | Members to list, each with a name, role and presence. |
| `name` (required) | `string` |  | Group name, shown as the heading. |
| `avatarSrc` | `string` |  | Group avatar image URL. |
| `currentUserId` | `string` |  | Id of the signed-in member; that row is marked "you". |
| `defaultMuted` | `boolean` | `false` | Initial mute state when `muted` is not controlled. |
| `description` | `React.ReactNode` |  | Group description under the name. |
| `leaveLabel` | `string` | `"Leave group"` | Label of the leave button. Default "Leave group". |
| `media` | `GroupMediaItem[]` |  | Shared media shown as a thumbnail grid. |
| `muted` | `boolean` |  | Controlled state of the mute switch. |
| `onAddMember` | `() => void` |  | Called when the user presses Add member; the button is hidden when unset. |
| `onLeave` | `() => void` |  | Called when the user presses the leave button; the button is hidden when unset. |
| `onMediaClick` | `(item: GroupMediaItem) => void` |  | Called with the item when the user opens a thumbnail. |
| `onMemberClick` | `(member: GroupMember) => void` |  | Called with the member when the user opens a member row. |
| `onMutedChange` | `(muted: boolean) => void` |  | Called with the new state when the user flips the mute switch. |

## Example (live: `#/components/social/group-info-panel` in the playground)

```tsx
import { RiFilePdf2Line, RiStickyNoteLine } from "@sutra/ui/icons";
import { GroupInfoPanel, MessengerHeader } from "@sutra/ui/social";

function GroupInfoDemo() {
  return (
    <div className="mx-auto w-full max-w-sm rounded-box border border-border">
      <MessengerHeader
        name="Lisbon crew"
        members={[{ name: "Ana Lima" }, { name: "Bo Chen" }, { name: "Chandra Rao" }, { name: "Dmitri V" }]}
        presence={minutesAgo(5)}
        onInfo={() => {}}
      />
      <GroupInfoPanel
        name="Lisbon crew"
        description="Planning the October trip."
        currentUserId="me"
        members={[
          { id: "me", name: "You Self", role: "owner", status: "online" },
          { id: "ana", name: "Ana Lima", role: "admin", status: "online", subtitle: "Booking flights" },
          { id: "bo", name: "Bo Chen", status: "away" },
          { id: "ch", name: "Chandra Rao" },
          { id: "dm", name: "Dmitri V", status: "busy" },
        ]}
        media={[
          { id: "1", alt: "Beach", preview: <span className="text-2xl">🏖️</span> },
          { id: "2", alt: "Tram 28", preview: <span className="text-2xl">🚋</span> },
          { id: "3", alt: "Pastel de nata", preview: <span className="text-2xl">🥮</span> },
          { id: "4", alt: "Itinerary", preview: <RiStickyNoteLine className="size-6" /> },
          { id: "5", alt: "Boarding passes", preview: <RiFilePdf2Line className="size-6" /> },
          { id: "6", alt: "Sunset", preview: <span className="text-2xl">🌅</span> },
        ]}
        onAddMember={() => {}}
        onMemberClick={() => {}}
        onLeave={() => {}}
      />
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): minutesAgo.
