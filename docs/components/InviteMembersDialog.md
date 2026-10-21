# InviteMembersDialog

> Invite people by email with a role, manage current members and copy an invite link.

- Import: `import { InviteMembersDialog } from "@sutra/ui"` (or from `@sutra/ui/blocks`)
- Source: `packages/ui/src/blocks/modal-dialog-blocks-invite` (blocks)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `className` | `string` |  | Classes for the dialog panel. |
| `defaultMembers` | `DialogMember[]` |  | Initial member list when uncontrolled. |
| `defaultOpen` | `boolean` |  | Initial open state when uncontrolled. |
| `defaultRole` | `string` | `"member"` | Role selected when the dialog opens. |
| `description` | `React.ReactNode` | `"Collaborate on notes, tasks and calendars in this workspace."` | Supporting text under the heading. |
| `inviteLink` | `string` |  | Link the "Copy invite link" button copies. Without it the button is hidden. |
| `members` | `DialogMember[]` |  | Controlled member list when paired with `onMembersChange`. Passed alone it only seeds the list (deprecated: use `defaultMembers` for that). |
| `onInvite` | `(emails: string[], role: string) => unknown` |  | Called with the entered emails and the chosen role when the user sends the invites. A returned promise shows a spinner; throw to show the error message. |
| `onMembersChange` | `(members: DialogMember[]) => void` |  | Called with the full member list after a role change or removal. |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the dialog opens or closes. |
| `open` | `boolean` |  | Controlled open state. Use with `onOpenChange`. |
| `roles` | `SelectOption[]` | `defaultRoles` | Roles offered in the role select; each has a `value` and a `label`. |
| `title` | `React.ReactNode` | `"Invite to Northwind Studio"` | Dialog heading; the default is sample text, so set it to your workspace. |
| `trigger` | `React.ReactNode` |  | Element that opens the dialog (rendered with `asChild`). |
