# NotificationsMenu

> Bell button with unread count opening a notification list with All/Unread tabs and "Mark all read".

- Import: `import { NotificationsMenu } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/blocks`)
- Source: `packages/ui/src/blocks/dropdown-menu-blocks` (blocks)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `align` | `Align` | `"end"` | Alignment of the panel against the trigger. |
| `className` | `string` |  | Classes for the trigger. |
| `defaultNotifications` | `NotificationItem[]` |  | Initial list when uncontrolled. |
| `defaultOpen` | `boolean` |  | Initial open state when uncontrolled. |
| `notifications` | `NotificationItem[]` |  | Controlled list when paired with `onNotificationsChange`. Passed alone it only seeds the list (deprecated: use `defaultNotifications` for that). |
| `onNotificationClick` | `(item: NotificationItem) => void` |  | Called with the notification when a row is clicked. |
| `onNotificationsChange` | `(items: NotificationItem[]) => void` |  | Called with the full list after the user marks items read, dismisses them or marks all read. |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the panel opens or closes. |
| `onViewAll` | `() => void` |  | Called when "View all" is clicked. |
| `open` | `boolean` |  | Controlled open state. Use with `onOpenChange`. |
