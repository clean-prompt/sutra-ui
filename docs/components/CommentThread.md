# CommentThread

> A comment thread: quoted anchor, comments (Markdown), reactions, reply box and resolve / reopen.

- Import: `import { CommentThread } from "@sutra/ui"` (or from `@sutra/ui/editor`)
- Source: `packages/ui/src/patterns/comments` (patterns)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `thread` (required) | `CommentThreadData` |  | The thread to render: its comments, resolved state and optional anchor quote. |
| `active` | `boolean` |  | Highlight (e.g. the thread whose anchor holds the cursor). |
| `currentUserId` | `string` |  | Id of the current user; their comments get edit and delete actions. |
| `now` | `Date \| number` |  | Reference time for relative timestamps. |
| `onDelete` | `(threadId: string, commentId: string) => void` |  | Called with the thread id and comment id when a comment is deleted. |
| `onEdit` | `(threadId: string, commentId: string, body: string) => void` |  | Called with the thread id, comment id and new text when a comment is edited. |
| `onFocusAnchor` | `(thread: CommentThreadData) => void` |  | Called with the thread when the user asks to jump to its anchor in the document. |
| `onReact` | `(threadId: string, commentId: string, emoji: string) => void` |  | Enables reactions. |
| `onReply` | `(threadId: string, body: string) => void` |  | Called with the thread id and the reply text when a reply is submitted. |
| `onResolve` | `(threadId: string, resolved: boolean) => void` |  | Called with the thread id and the new resolved state when a thread is resolved or reopened. |
| `reactionOptions` | `string[]` | `defaultReactions` | Emoji offered in the reaction picker (needs `onReact`). |
| `role` | `CommentRole` | `"commenter"` | What the current user may do: `owner` and `editor` resolve any thread, `commenter` resolves their own and replies, `viewer` can only read. |
