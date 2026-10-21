import * as React from "react";
import { RiAddLine, RiDeleteBinLine, RiEditLine, RiPlugLine, RiStarLine } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { errorMessage, useAsyncAction } from "../../hooks/use-async-action";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Button } from "../../primitives/button";
import { Badge } from "../../primitives/badge";
import { Input } from "../../primitives/input";
import { Spinner } from "../../primitives/spinner";
import { SegmentedControl } from "../../primitives/segmented-control";
import { ConfirmDialog } from "../../primitives/dialog";

/* ------------------------------------------------------------------ */
/* ConnectionRegistry                                                  */
/* ------------------------------------------------------------------ */

export type ConnectionAuthKind = "none" | "token" | "ssh-key";

export interface ConnectionHeader {
  key: string;
  value: string;
}

export interface SavedConnection {
  id: string;
  name: string;
  /** URL or host (e.g. `https://gw.example.com`, `user@host:22`). */
  url: string;
  auth: ConnectionAuthKind;
  token?: string;
  sshKeyPath?: string;
  headers?: ConnectionHeader[];
  isDefault?: boolean;
}

export interface ConnectionTestResult {
  ok: boolean;
  message?: string;
  latencyMs?: number;
  version?: string;
}

export interface ConnectionRegistryProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** Controlled list of saved connections. */
  connections?: SavedConnection[];
  /** Initial connections when `connections` is not controlled. */
  defaultConnections?: SavedConnection[];
  /** Called with the full list after the user adds, edits, removes or defaults a connection. */
  onConnectionsChange?: (connections: SavedConnection[]) => void;
  /** Runs a connection check for the editor's current values. */
  onTest?: (connection: SavedConnection) => Promise<ConnectionTestResult> | ConnectionTestResult;
  /** Called with the connection and whether it is new when the user saves the editor. */
  onSave?: (connection: SavedConnection, isNew: boolean) => void;
  /** Called with the connection when the user removes it. */
  onRemove?: (connection: SavedConnection) => void;
  /** Called with the connection when the user makes it the default. */
  onSetDefault?: (connection: SavedConnection) => void;
  /** Id generator for new entries. */
  createId?: () => string;
}

const authLabels: Record<ConnectionAuthKind, string> = { none: "No auth", token: "Token", "ssh-key": "SSH key" };

function emptyConnection(id: string): SavedConnection {
  return { id, name: "", url: "", auth: "none", headers: [] };
}

let connectionSeq = 0;

/** Saved remote gateways list with an editor, connection test, default and remove. */
export const ConnectionRegistry = React.forwardRef<HTMLDivElement, ConnectionRegistryProps>(
  (
    {
      connections: connectionsProp,
      defaultConnections = [],
      onConnectionsChange,
      onTest,
      onSave,
      onRemove,
      onSetDefault,
      createId = () => `conn-${Date.now().toString(36)}-${++connectionSeq}`,
      className,
      ...props
    },
    ref
  ) => {
    const [connections, setConnections] = useControllableState({
      value: connectionsProp,
      defaultValue: defaultConnections,
      onChange: onConnectionsChange,
    });
    const [draft, setDraft] = React.useState<{ value: SavedConnection; isNew: boolean } | null>(null);
    const [result, setResult] = React.useState<ConnectionTestResult | null>(null);
    const testAction = useAsyncAction((conn: SavedConnection) => onTest?.(conn), {
      onSuccess: (r) => setResult(r ?? null),
      onError: (err) => setResult({ ok: false, message: errorMessage(err, "Connection failed") }),
    });
    const testing = testAction.busy;
    const [removing, setRemoving] = React.useState<SavedConnection | null>(null);
    const [touched, setTouched] = React.useState(false);
    const uid = React.useId();

    const startEdit = (conn: SavedConnection | null) => {
      setResult(null);
      setTouched(false);
      setDraft(
        conn
          ? { value: { ...conn, headers: conn.headers ? conn.headers.map((h) => ({ ...h })) : [] }, isNew: false }
          : { value: emptyConnection(createId()), isNew: true }
      );
    };

    const patch = (p: Partial<SavedConnection>) => setDraft((d) => (d ? { ...d, value: { ...d.value, ...p } } : d));
    const headers = draft?.value.headers ?? [];
    const setHeader = (i: number, h: Partial<ConnectionHeader>) =>
      patch({ headers: headers.map((x, j) => (j === i ? { ...x, ...h } : x)) });

    const nameError = touched && draft && !draft.value.name.trim() ? "Name is required" : null;
    const urlError = touched && draft && !draft.value.url.trim() ? "URL or host is required" : null;

    const cleaned = (c: SavedConnection): SavedConnection => ({
      ...c,
      name: c.name.trim(),
      url: c.url.trim(),
      headers: (c.headers ?? []).filter((h) => h.key.trim()),
    });

    const save = () => {
      if (!draft) return;
      setTouched(true);
      if (!draft.value.name.trim() || !draft.value.url.trim()) return;
      const next = cleaned(draft.value);
      const list = connections.length === 0 ? [{ ...next, isDefault: true }] : null;
      if (list) setConnections(list);
      else if (draft.isNew) setConnections([...connections, next]);
      else setConnections(connections.map((c) => (c.id === next.id ? next : c)));
      onSave?.(list ? list[0]! : next, draft.isNew);
      setDraft(null);
    };

    const test = () => {
      if (!draft || !onTest) return;
      setResult(null);
      void testAction.run(cleaned(draft.value));
    };

    const setDefault = (conn: SavedConnection) => {
      setConnections(connections.map((c) => ({ ...c, isDefault: c.id === conn.id })));
      onSetDefault?.(conn);
    };

    const fieldId = (name: string) => `${uid}-${name}`;

    return (
      <div ref={ref} className={cn("flex flex-col gap-4", className)} data-slot="connection-registry" {...props}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Remote gateways</h3>
            <p className="text-xs text-muted-foreground">Saved connections you can switch between.</p>
          </div>
          <Button size="sm" variant="secondary" leadingIcon={<RiAddLine aria-hidden />} onClick={() => startEdit(null)} disabled={!!draft?.isNew}>
            Add connection
          </Button>
        </div>

        {connections.length === 0 && !draft ? (
          <div className="rounded-box border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No saved connections yet.
          </div>
        ) : (
          <ul aria-label="Saved connections" className="divide-y divide-border overflow-hidden rounded-box border border-border bg-card">
            {connections.map((conn) => (
              <li key={conn.id} data-connection={conn.id} className="flex items-center gap-3 px-3 py-2.5">
                <RiPlugLine aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{conn.name}</span>
                    {conn.isDefault && (
                      <Badge size="sm" color="brand">
                        Default
                      </Badge>
                    )}
                  </div>
                  <div className="truncate font-mono text-xs text-muted-foreground">
                    {conn.url} · {authLabels[conn.auth]}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {!conn.isDefault && (
                    <Button size="icon-sm" variant="ghost" aria-label={`Set ${conn.name} as default`} onClick={() => setDefault(conn)}>
                      <RiStarLine aria-hidden />
                    </Button>
                  )}
                  <Button size="icon-sm" variant="ghost" aria-label={`Edit ${conn.name}`} onClick={() => startEdit(conn)}>
                    <RiEditLine aria-hidden />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Remove ${conn.name}`}
                    className="hover:text-destructive"
                    onClick={() => setRemoving(conn)}
                  >
                    <RiDeleteBinLine aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {draft && (
          <form
            aria-label={draft.isNew ? "New connection" : `Edit ${draft.value.name || "connection"}`}
            className="flex flex-col gap-4 rounded-box border border-border bg-subtle p-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor={fieldId("name")} className="text-sm font-medium">
                  Name
                </label>
                <Input
                  id={fieldId("name")}
                  value={draft.value.name}
                  invalid={!!nameError}
                  aria-describedby={nameError ? fieldId("name-err") : undefined}
                  onChange={(e) => patch({ name: e.target.value })}
                  placeholder="Home server"
                />
                {nameError && (
                  <p id={fieldId("name-err")} className="text-xs text-destructive">
                    {nameError}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={fieldId("url")} className="text-sm font-medium">
                  URL or host
                </label>
                <Input
                  id={fieldId("url")}
                  value={draft.value.url}
                  invalid={!!urlError}
                  aria-describedby={urlError ? fieldId("url-err") : undefined}
                  onChange={(e) => patch({ url: e.target.value })}
                  placeholder="https://gateway.example.com"
                  className="font-mono"
                />
                {urlError && (
                  <p id={fieldId("url-err")} className="text-xs text-destructive">
                    {urlError}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span id={fieldId("auth")} className="text-sm font-medium">
                Authentication
              </span>
              <SegmentedControl
                aria-labelledby={fieldId("auth")}
                size="sm"
                value={draft.value.auth}
                onValueChange={(v) => v && patch({ auth: v as ConnectionAuthKind })}
                options={(Object.keys(authLabels) as ConnectionAuthKind[]).map((k) => ({ value: k, label: authLabels[k] }))}
                className="self-start"
              />
              {draft.value.auth === "token" && (
                <Input
                  aria-label="Access token"
                  type="password"
                  autoComplete="off"
                  value={draft.value.token ?? ""}
                  onChange={(e) => patch({ token: e.target.value })}
                  placeholder="Paste a token"
                  className="font-mono"
                />
              )}
              {draft.value.auth === "ssh-key" && (
                <Input
                  aria-label="SSH key path"
                  value={draft.value.sshKeyPath ?? ""}
                  onChange={(e) => patch({ sshKeyPath: e.target.value })}
                  placeholder="~/.ssh/id_ed25519"
                  className="font-mono"
                />
              )}
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1.5 text-sm font-medium">Extra headers</legend>
              {headers.map((h, i) => (
                <div key={i} className="flex items-center gap-2" data-header-row={i}>
                  <Input
                    size="sm"
                    aria-label={`Header ${i + 1} name`}
                    value={h.key}
                    onChange={(e) => setHeader(i, { key: e.target.value })}
                    placeholder="X-Header"
                    className="font-mono"
                  />
                  <Input
                    size="sm"
                    aria-label={`Header ${i + 1} value`}
                    value={h.value}
                    onChange={(e) => setHeader(i, { value: e.target.value })}
                    placeholder="value"
                    className="font-mono"
                  />
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Remove header ${i + 1}`}
                    onClick={() => patch({ headers: headers.filter((_, j) => j !== i) })}
                  >
                    <RiDeleteBinLine aria-hidden />
                  </Button>
                </div>
              ))}
              <Button
                size="xs"
                variant="ghost"
                leadingIcon={<RiAddLine aria-hidden />}
                className="self-start"
                onClick={() => patch({ headers: [...headers, { key: "", value: "" }] })}
              >
                Add header
              </Button>
            </fieldset>

            <div role="status" aria-live="polite" className="min-h-5 text-sm">
              {testing ? (
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <Spinner size="xs" /> Testing connection…
                </span>
              ) : result ? (
                <span className={cn("inline-flex items-center gap-2", result.ok ? "text-success" : "text-destructive")} data-test-result={result.ok ? "ok" : "fail"}>
                  <span aria-hidden className={cn("size-2 rounded-full", result.ok ? "bg-success" : "bg-destructive")} />
                  {result.ok ? "Connected" : "Connection failed"}
                  {result.latencyMs != null && result.ok ? ` · ${Math.round(result.latencyMs)} ms` : ""}
                  {result.version ? ` · v${result.version}` : ""}
                  {result.message ? <span className="text-muted-foreground">— {result.message}</span> : null}
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {onTest && (
                <Button size="sm" variant="outline" onClick={test} loading={testing} disabled={!draft.value.url.trim()} className="me-auto">
                  Test connection
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
                Cancel
              </Button>
              <Button size="sm" type="submit">
                {draft.isNew ? "Save connection" : "Save changes"}
              </Button>
            </div>
          </form>
        )}

        <ConfirmDialog
          open={removing != null}
          onOpenChange={(o) => !o && setRemoving(null)}
          tone="destructive"
          title={`Remove ${removing?.name ?? "connection"}?`}
          description="The saved connection and its credentials will be deleted from this device."
          confirmLabel="Remove"
          onConfirm={() => {
            if (!removing) return;
            const rest = connections.filter((c) => c.id !== removing.id);
            if (removing.isDefault && rest.length && !rest.some((c) => c.isDefault)) rest[0] = { ...rest[0]!, isDefault: true };
            setConnections(rest);
            onRemove?.(removing);
            if (draft?.value.id === removing.id) setDraft(null);
            setRemoving(null);
          }}
        />
      </div>
    );
  }
);
ConnectionRegistry.displayName = "ConnectionRegistry";
