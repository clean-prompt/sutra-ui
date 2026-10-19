# CommentsPanel

> Side panel of comment threads anchored to quoted excerpts, with Open / Resolved / All filters and a selection composer.

- Import: `import { CommentsPanel } from "@sutra/ui"` (or from `@sutra/ui/editor`)
- Source: `packages/ui/src/patterns/comments` (patterns)
- `data-slot`: `comments-panel`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `threads` (required) | `CommentThreadData[]` |  | Threads to list, in display order. |
| `actions` | `React.ReactNode` |  | Header actions (e.g. a close button). |
| `activeThreadId` | `string` |  | Id of the highlighted thread (e.g. the one whose anchor holds the cursor). |
| `currentUserId` | `string` |  | Id of the current user; their comments get edit and delete actions. |
| `defaultFilter` | `CommentFilter` | `"open"` | Initial filter when uncontrolled. |
| `filter` | `CommentFilter` |  | Controlled filter: open threads, resolved threads or all. Use with `onFilterChange`. |
| `now` | `Date \| number` |  | Reference time for relative timestamps ("5m ago"); pass it to keep renders deterministic. |
| `onCreateThread` | `(body: string, quote?: string) => void` |  | Creates a thread anchored to the selection. |
| `onDelete` | `(threadId: string, commentId: string) => void` |  | Called with the thread id and comment id when a comment is deleted. |
| `onEdit` | `(threadId: string, commentId: string, body: string) => void` |  | Called with the thread id, comment id and new text when a comment is edited. |
| `onFilterChange` | `(filter: CommentFilter) => void` |  | Called with the new filter when the user switches tabs. |
| `onFocusAnchor` | `(thread: CommentThreadData) => void` |  | Called with the thread when the user asks to jump to its anchor in the document. |
| `onReact` | `(threadId: string, commentId: string, emoji: string) => void` |  | Enables reactions. |
| `onReply` | `(threadId: string, body: string) => void` |  | Called with the thread id and the reply text when a reply is submitted. |
| `onResolve` | `(threadId: string, resolved: boolean) => void` |  | Called with the thread id and the new resolved state when a thread is resolved or reopened. |
| `reactionOptions` | `string[]` |  | Emoji offered in the reaction picker (needs `onReact`). |
| `role` | `CommentRole` | `"commenter"` | What the current user may do: `owner` and `editor` resolve any thread, `commenter` resolves their own and replies, `viewer` can only read. |
| `selection` | `string \| null` |  | Current editor selection; enables "Comment on selection". |
| `title` | `React.ReactNode` | `"Comments"` | Panel heading. |

## Example (live: `#/components/editor/comments-panel` in the playground)

```tsx
import * as React from "react";
import { CommentsPanel } from "@sutra/ui/editor";

function CommentsDemo() {
  const [threads, setThreads] = React.useState(initialThreads);
  const [selection, setSelection] = React.useState("exchange operations and converge");
  const [active, setActive] = React.useState<string | undefined>();
  const me = { id: "me", name: "You" };
  const update = (id: string, fn: (t: CommentThreadData) => CommentThreadData) => setThreads((all) => all.map((t) => (t.id === id ? fn(t) : t)));
  return (
    <div className="flex w-full flex-col gap-3 md:flex-row">
      <div className="flex-1 space-y-2 text-sm">
        <label className="block text-xs font-medium text-muted-foreground" htmlFor="sel">
          Simulated editor selection
        </label>
        <input
          id="sel"
          value={selection}
          onChange={(e) => setSelection(e.target.value)}
          className="h-9 w-full rounded-control border border-input bg-background px-3 text-sm shadow-xs"
        />
        {active && <p className="text-muted-foreground">Focused anchor of thread {active}.</p>}
      </div>
      <CommentsPanel
        threads={threads}
        currentUserId="me"
        role="editor"
        selection={selection}
        activeThreadId={active}
        onFocusAnchor={(t) => setActive(t.id)}
        onCreateThread={(body, quote) =>
          setThreads((all) => [{ id: `t${Date.now()}`, quote, comments: [{ id: `c${Date.now()}`, author: me, body, createdAt: Date.now() }] }, ...all])
        }
        onReply={(id, body) =>
          update(id, (t) => ({ ...t, comments: [...t.comments, { id: `c${Date.now()}`, author: me, body, createdAt: Date.now() }] }))
        }
        onResolve={(id, resolved) => update(id, (t) => ({ ...t, resolved, resolvedBy: resolved ? "You" : undefined }))}
        onEdit={(id, cid, body) =>
          update(id, (t) => ({ ...t, comments: t.comments.map((c) => (c.id === cid ? { ...c, body, editedAt: Date.now() } : c)) }))
        }
        onDelete={(id, cid) =>
          setThreads((all) =>
            all.map((t) => (t.id === id ? { ...t, comments: t.comments.filter((c) => c.id !== cid) } : t)).filter((t) => t.comments.length > 0)
          )
        }
        onReact={(id, cid, emoji) =>
          update(id, (t) => ({
            ...t,
            comments: t.comments.map((c) => {
              if (c.id !== cid) return c;
              const list = c.reactions ?? [];
              const found = list.find((r) => r.emoji === emoji);
              const reactions = found
                ? list.map((r) => (r.emoji === emoji ? { ...r, count: r.count + (r.reacted ? -1 : 1), reacted: !r.reacted } : r))
                : [...list, { emoji, count: 1, reacted: true }];
              return { ...c, reactions };
            }),
          }))
        }
        className="h-[520px] w-full overflow-hidden rounded-box border border-border md:w-96"
      />
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): initialThreads.
