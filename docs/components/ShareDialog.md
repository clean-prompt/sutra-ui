# ShareDialog

> Share an item: invite with a role, per-person roles, general access, link role + expiry, and copy link.

- Import: `import { ShareDialog } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/blocks`)
- Source: `packages/ui/src/blocks/modal-dialog-blocks-share` (blocks)
- `data-slot`: `share-expiry-summary`

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `access` | `ShareAccess` |  | Controlled who can open the item: `restricted` (invited people), `workspace` or `link` (anyone with the link). Use with `onAccessChange`. |
| `allowComments` | `boolean` |  | Controlled state of the "Allow comments on public link" switch. |
| `className` | `string` |  | Classes for the dialog panel. |
| `currentUserId` | `string` |  | Id (in `people`) of the signed-in person: their row says "(you)" and offers "Leave" unless they own the item. |
| `defaultAccess` | `ShareAccess` | `"link"` | Initial access when uncontrolled. |
| `defaultAllowComments` | `boolean` | `false` | Initial state of the comments switch when uncontrolled. |
| `defaultExpiry` | `ShareLinkExpiry` | `"7d"` | Initial link expiry when uncontrolled. |
| `defaultInviteRole` | `ShareLinkRole` | `"editor"` | Role preselected for invites. Default "editor". |
| `defaultLinkRole` | `ShareLinkRole` | `"viewer"` | Initial link role when uncontrolled. |
| `defaultOpen` | `boolean` |  | Initial open state when uncontrolled. |
| `defaultPeople` | `DialogMember[]` |  | Initial people list when uncontrolled. |
| `expiresAt` | `Date \| null` |  | Expiry date for a controlled `custom` expiry (or to show an existing deadline). |
| `expiry` | `ShareLinkExpiry` |  | Controlled link expiry: `never`, `1h`, `1d`, `7d`, `30d` or `custom`. |
| `itemName` | `string` |  | Name of the shared item, shown in the title ("Share “Q4 plan”"). Without it the title is "Share". |
| `link` | `string` |  | The link the "Copy link" button copies. Without it the button is hidden. |
| `linkRole` | `ShareLinkRole` |  | Controlled role granted by the link (`editor`, `commenter` or `viewer`). Use with `onLinkRoleChange`. |
| `onAccessChange` | `(access: ShareAccess) => void` |  | Called with the new access level. |
| `onAllowCommentsChange` | `(allow: boolean) => void` |  | Called with the new state of the comments switch. |
| `onCopyLink` | `(link: string) => void` |  | Called with the link after the user copies it. |
| `onExpiryChange` | `(expiry: ShareLinkExpiry, expiresAt: Date \| null) => void` |  | `expiresAt` is null for "never". |
| `onInvite` | `(email: string, role: ShareLinkRole) => unknown` |  | Called when someone is invited, with the role picked next to the email field. |
| `onLeave` | `() => void` |  | Called when the current user chooses "Leave". |
| `onLinkRoleChange` | `(role: ShareLinkRole) => void` |  | Called with the new link role. |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the dialog opens or closes. |
| `onPeopleChange` | `(people: DialogMember[]) => void` |  | Called with the full people list after a role change or removal. |
| `onRemovePerson` | `(personId: string) => void` |  | Called with the person id when they are removed. |
| `onRoleChange` | `(personId: string, role: ShareRole) => void` |  | Called with the person id and the new role when a role is changed. |
| `open` | `boolean` |  | Controlled open state. Use with `onOpenChange`. |
| `people` | `DialogMember[]` |  | Controlled people list when paired with `onPeopleChange`. Passed alone it only seeds the list (deprecated: use `defaultPeople` for that). |
| `showAllowComments` | `boolean` | `true` | Show the "Allow comments on public link" switch for public links. Default true. |
| `trigger` | `React.ReactNode` |  | Element that opens the dialog (rendered with `asChild`). |
| `workspaceName` | `string` | `"Northwind Studio"` | Workspace name for the "Anyone at …" access option. Pass "" to hide that option. |

## Example (live: `#/components/mobile/share-dialog` in the playground)

```tsx
import { ShareDialog } from "@cleanprompt/sutra-ui/blocks";
import { Button } from "@cleanprompt/sutra-ui/core";
import { RiCompass3Line, RiShareLine } from "@cleanprompt/sutra-ui/icons";

<ShareDialog {...demoShare} trigger={<Button leadingIcon={<RiShareLine />}>Share</Button>} />
<ShareDialog
  {...demoShare}
  currentUserId="p3"
  defaultAccess="restricted"
  itemName="Design review"
  trigger={
    <Button variant="secondary" leadingIcon={<RiCompass3Line />}>
      As a commenter
    </Button>
  }
/>
```
