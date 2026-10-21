# AgentSessionList

> Sessions sidebar for agent apps: groups, search, status filter, multi-select, bulk actions and keyboard navigation.

- Import: `import { AgentSessionList } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent`)
- Source: `packages/ui/src/kits/agent/agent-sessions` (kit `agent`)
- `data-slot`: `agent-session-list`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `sessions` (required) | `AgentSession[]` |  | Sessions to list, each with title, status, time and optional group. |
| `activeId` | `string \| null` |  | Id of the session that is open; `null` or unset marks none. |
| `defaultCheckboxMode` | `boolean` | `false` | Start with selection checkboxes visible. |
| `defaultLocation` | `AgentSessionLocation` | `"local"` | Initial location tab when `location` is not controlled. |
| `defaultQuery` | `string` | `""` | Initial search text when `query` is not controlled. |
| `defaultSelectedIds` | `string[]` | `[]` | Initially checked ids when `selectedIds` is not controlled. |
| `defaultStatusFilter` | `AgentSessionFilter[]` | `[]` | Initial status filters when `statusFilter` is not controlled. |
| `emptyState` | `React.ReactNode` |  | Shown when there is nothing to list. Default "No sessions match". |
| `emptyText` | `React.ReactNode` |  | **Deprecated.** Use `emptyState`. Content shown when there is nothing to list. |
| `groups` | `AgentSessionGroup[]` | `[]` | Named groups that sessions can belong to; sessions are listed under their group. |
| `location` | `AgentSessionLocation` |  | Controlled location tab: `local` or `remote`. |
| `now` | `number` |  | Reference time for relative timestamps. |
| `onActiveChange` | `(id: string) => void` |  | Called with the session id when the user opens a session. |
| `onArchive` | `(ids: string[]) => void` |  | Called with the ids of the chosen sessions when the user archives them. |
| `onCreateGroup` | `() => void` |  | Called when the user presses New group; the button is hidden when unset. |
| `onDelete` | `(ids: string[]) => void` |  | Called with the ids of the chosen sessions after the user confirms deleting them. |
| `onLocationChange` | `(location: AgentSessionLocation) => void` |  | Called with the location when the user switches tab. |
| `onMarkUnread` | `(ids: string[]) => void` |  | Called with the ids of the chosen sessions when the user marks them unread. |
| `onMoveToGroup` | `(ids: string[], groupId: string \| null) => void` |  | Called with the session ids and the target group id (`null` for ungrouped) when the user moves sessions. |
| `onNewSession` | `(groupId?: string) => void` |  | Called when the user starts a new session, with the group id when started from a group; the button is hidden when unset. |
| `onQueryChange` | `(query: string) => void` |  | Called with the search text on every change. |
| `onRenameGroup` | `(id: string, name: string) => void` |  | Called with the group id and the new name when the user renames a group. |
| `onRenameSession` | `(id: string, title: string) => void` |  | Called with the session id and the new title when the user renames a session. |
| `onSelectedIdsChange` | `(ids: string[]) => void` |  | Called with the checked ids when the selection changes. |
| `onStatusFilterChange` | `(filter: AgentSessionFilter[]) => void` |  | Called with the active filters when the user toggles one. |
| `query` | `string` |  | Controlled search text. |
| `selectedIds` | `string[]` |  | Controlled ids of the checked sessions (checkbox mode). |
| `showLocationTabs` | `boolean` | `true` | Show the local / remote switch. Default true. |
| `statusFilter` | `AgentSessionFilter[]` |  | Controlled status filters (`waiting`, `running`, `unread`, `failed`); empty shows all sessions. |
| `title` | `React.ReactNode` | `"Sessions"` | Heading. Default "Sessions". |

## Example (live: `#/components/agent-sessions/agent-session-list` in the playground)

```tsx
import * as React from "react";
import { AgentSessionList } from "@cleanprompt/sutra-ui/agent";

function SessionListDemo() {
  const [now] = React.useState(() => Date.now());
  const [groups, setGroups] = React.useState<AgentSessionGroup[]>([
    { id: "web", name: "web-app" },
    { id: "api", name: "api-server" },
    { id: "infra", name: "infra", defaultCollapsed: true },
  ]);
  const [sessions, setSessions] = React.useState<AgentSession[]>([
    { id: "1", title: "Fix hydration warning on /settings", status: "running", updatedAt: now - 1 * minute, groupId: "web", branch: "fix/hydration", cost: "$0.41" },
    { id: "2", title: "Add dark mode toggle", status: "waiting", updatedAt: now - 6 * minute, groupId: "web", branch: "feat/dark-mode" },
    { id: "3", title: "Migrate to React Router 7", status: "unread", updatedAt: now - 52 * minute, groupId: "web", branch: "chore/rr7", cost: "$2.10" },
    { id: "4", title: "Rate limiter for /v1/search", status: "failed", updatedAt: now - 3 * 60 * minute, groupId: "api", branch: "feat/rate-limit" },
    { id: "5", title: "Write tests for billing webhooks", status: "idle", updatedAt: now - 26 * 60 * minute, groupId: "api", repo: "acme/api" },
    { id: "6", title: "Terraform: split staging state", status: "idle", updatedAt: now - 4 * 24 * 60 * minute, groupId: "infra" },
    { id: "7", title: "Explain the auth flow", status: "idle", updatedAt: now - 2 * 60 * minute },
    { id: "8", title: "Nightly dependency bump", status: "elsewhere", updatedAt: now - 12 * minute, location: "remote", repo: "acme/web" },
    { id: "9", title: "Triage flaky e2e suite", status: "running", updatedAt: now - 3 * minute, location: "remote", repo: "acme/web" },
  ]);
  const [active, setActive] = React.useState<string | null>("1");
  const [selected, setSelected] = React.useState<string[]>([]);
  const [log, setLog] = React.useState("");

  const remove = (ids: string[], verb: string) => {
    setSessions((s) => s.filter((x) => !ids.includes(x.id)));
    setSelected([]);
    setLog(`${verb} ${ids.length} session${ids.length > 1 ? "s" : ""}`);
  };

  return (
    <>
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="h-[30rem] w-full max-w-xs rounded-box border border-border bg-subtle p-2">
          <AgentSessionList
            className="h-full"
            sessions={sessions}
            groups={groups}
            now={now}
            activeId={active}
            onActiveChange={setActive}
            selectedIds={selected}
            onSelectedIdsChange={setSelected}
            onNewSession={(g) => setLog(g ? `New session in ${groups.find((x) => x.id === g)?.name}` : "New session")}
            onCreateGroup={() => setGroups((g) => [...g, { id: `g${g.length + 1}`, name: `New group ${g.length - 2}` }])}
            onRenameSession={(id, title) => setSessions((s) => s.map((x) => (x.id === id ? { ...x, title } : x)))}
            onRenameGroup={(id, name) => setGroups((g) => g.map((x) => (x.id === id ? { ...x, name } : x)))}
            onArchive={(ids) => remove(ids, "Archived")}
            onDelete={(ids) => remove(ids, "Deleted")}
            onMarkUnread={(ids) =>
              setSessions((s) => s.map((x) => (ids.includes(x.id) ? { ...x, status: "unread" } : x)))
            }
            onMoveToGroup={(ids, groupId) =>
              setSessions((s) => s.map((x) => (ids.includes(x.id) ? { ...x, groupId: groupId ?? undefined } : x)))
            }
          />
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            Active: <span className="text-foreground">{sessions.find((s) => s.id === active)?.title ?? "none"}</span>
          </p>
          <p>Selected: {selected.length ? selected.join(", ") : "none"}</p>
          {log && <p>Last action: {log}</p>}
          <p className="text-xs">Tips: double-click or F2 to rename, Space to select, Shift+Arrow to extend, right-click for more.</p>
        </div>
      </div>
    </>
  );
}
```

Playground helpers in this snippet (not part of the library): minute.
