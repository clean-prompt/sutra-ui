import * as React from "react";
import {
  RiAddLine,
  RiArrowGoBackLine,
  RiArrowUpDownLine,
  RiCheckLine,
  RiCloudLine,
  RiComputerLine,
  RiDeleteBinLine,
  RiEditLine,
  RiPlayLine,
  RiPlugLine,
  RiRestartLine,
  RiSettings3Line,
  RiStarLine,
  RiStopLine,
  RiUserSettingsLine,
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { formatDuration } from "../lib/duration";
import { errorMessage, useAsyncAction } from "../hooks/use-async-action";
import { useControllableState } from "../hooks/use-controllable-state";
import { Button } from "./button";
import { InlineAlert } from "./inline-alert";
import { Badge } from "./badge";
import { Input } from "./input";
import { Spinner } from "./spinner";
import { SegmentedControl } from "./segmented-control";
import { ConfirmDialog } from "./dialog";
import { AgentAvatar, randomAvatarSpec, type AgentAvatarSpec } from "./agent-avatar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./command-menu";

/* ------------------------------------------------------------------ */
/* Shared                                                              */
/* ------------------------------------------------------------------ */

export type WorkspaceGatewayReachability = "reachable" | "unreachable" | "connecting";

const reachabilityMeta: Record<WorkspaceGatewayReachability, { label: string; dot: string }> = {
  reachable: { label: "Reachable", dot: "bg-success" },
  unreachable: { label: "Unreachable", dot: "bg-destructive" },
  connecting: { label: "Connecting", dot: "bg-warning motion-safe:animate-pulse" },
};

/** Small reachability dot with screen-reader text. */
function ReachabilityDot({ state, className }: { state: WorkspaceGatewayReachability; className?: string }) {
  const meta = reachabilityMeta[state];
  return (
    <span className={cn("relative inline-flex size-2 shrink-0", className)} data-reachability={state}>
      <span aria-hidden className={cn("inline-flex size-full rounded-full", meta.dot)} />
      <span className="sr-only">{meta.label}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* WorkspaceProfileSwitcher                                            */
/* ------------------------------------------------------------------ */

export interface WorkspaceProfile {
  id: string;
  name: string;
  /** Agent avatar spec; generated from the id when omitted. */
  avatar?: AgentAvatarSpec;
  description?: string;
  isDefault?: boolean;
}

export interface WorkspaceGateway {
  id: string;
  name: string;
  kind: "local" | "remote";
  /** Host or URL shown under the name. */
  host?: string;
  reachability: WorkspaceGatewayReachability;
  /** Round-trip latency in ms. */
  latencyMs?: number;
  profiles: WorkspaceProfile[];
}

export interface WorkspaceSelection {
  gatewayId: string;
  profileId: string;
}

export interface WorkspaceProfileSwitcherProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "value" | "defaultValue" | "children" | "type"> {
  gateways: WorkspaceGateway[];
  value?: WorkspaceSelection;
  defaultValue?: WorkspaceSelection;
  onValueChange?: (value: WorkspaceSelection, detail: { gateway: WorkspaceGateway; profile: WorkspaceProfile }) => void;
  onManageConnections?: () => void;
  /** "New profile" action; receives the gateway of the current selection. */
  onNewProfile?: (gatewayId?: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Allow picking profiles on unreachable gateways. Default false. */
  allowUnreachable?: boolean;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
}

function findSelection(gateways: WorkspaceGateway[], sel?: WorkspaceSelection) {
  if (!sel) return null;
  const gateway = gateways.find((g) => g.id === sel.gatewayId);
  const profile = gateway?.profiles.find((p) => p.id === sel.profileId);
  return gateway && profile ? { gateway, profile } : null;
}

/** Two-level gateway → profile switcher with search, reachability and latency. */
export const WorkspaceProfileSwitcher = React.forwardRef<HTMLButtonElement, WorkspaceProfileSwitcherProps>(
  (
    {
      gateways,
      value: valueProp,
      defaultValue,
      onValueChange,
      onManageConnections,
      onNewProfile,
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      allowUnreachable = false,
      searchPlaceholder = "Search gateways and profiles…",
      disabled,
      className,
      contentClassName,
      ...props
    },
    ref
  ) => {
    const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
    const [internal, setInternal] = React.useState<WorkspaceSelection | undefined>(defaultValue);
    const value = valueProp ?? internal;
    const current = findSelection(gateways, value);

    const select = (gateway: WorkspaceGateway, profile: WorkspaceProfile) => {
      const next = { gatewayId: gateway.id, profileId: profile.id };
      if (valueProp === undefined) setInternal(next);
      onValueChange?.(next, { gateway, profile });
      setOpen(false);
    };

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            ref={ref}
            type="button"
            disabled={disabled}
            aria-label={current ? `Switch profile (current: ${current.profile.name} on ${current.gateway.name})` : "Switch profile"}
            className={cn(
              "inline-flex h-11 w-full min-w-56 items-center gap-2.5 rounded-control border border-border bg-background px-2.5 text-left shadow-xs transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50",
              focusRing,
              className
            )}
            {...props}
          >
            {current ? (
              <>
                <AgentAvatar spec={current.profile.avatar ?? randomAvatarSpec(current.profile.id)} size={28} label="" />
                <span className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="truncate text-sm font-medium text-foreground">{current.profile.name}</span>
                  <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                    <ReachabilityDot state={current.gateway.reachability} className="size-1.5" />
                    {current.gateway.name}
                  </span>
                </span>
              </>
            ) : (
              <span className="flex-1 truncate text-sm text-muted-foreground">Select a profile</span>
            )}
            <RiArrowUpDownLine aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          size="auto"
          padded={false}
          aria-label="Switch profile"
          className={cn("w-80 overflow-hidden", contentClassName)}
        >
          <Command loop label="Switch profile">
            <CommandInput placeholder={searchPlaceholder} aria-label="Search gateways and profiles" />
            <CommandList>
              <CommandEmpty>No matching profiles</CommandEmpty>
              {gateways.map((gateway) => {
                const blocked = gateway.reachability === "unreachable" && !allowUnreachable;
                return (
                  <CommandGroup
                    key={gateway.id}
                    data-gateway={gateway.id}
                    heading={
                      <span className="flex items-center gap-2">
                        {gateway.kind === "local" ? (
                          <RiComputerLine aria-hidden className="size-3.5" />
                        ) : (
                          <RiCloudLine aria-hidden className="size-3.5" />
                        )}
                        <span className="min-w-0 flex-1 truncate">{gateway.name}</span>
                        <ReachabilityDot state={gateway.reachability} />
                        <span className="tabular-nums">
                          {gateway.reachability === "unreachable"
                            ? "Unreachable"
                            : gateway.reachability === "connecting"
                              ? "Connecting…"
                              : gateway.latencyMs != null
                                ? `${Math.round(gateway.latencyMs)} ms`
                                : null}
                        </span>
                      </span>
                    }
                  >
                    {gateway.profiles.length === 0 && (
                      <p className="px-2 py-1.5 text-xs text-muted-foreground">No profiles</p>
                    )}
                    {gateway.profiles.map((profile) => {
                      const selected = value?.gatewayId === gateway.id && value.profileId === profile.id;
                      return (
                        <CommandItem
                          key={profile.id}
                          value={`${gateway.id}/${profile.id}`}
                          keywords={[profile.name, gateway.name, gateway.host ?? ""]}
                          disabled={blocked}
                          onSelect={() => select(gateway, profile)}
                          aria-current={selected ? "true" : undefined}
                          data-profile={profile.id}
                          icon={<AgentAvatar spec={profile.avatar ?? randomAvatarSpec(profile.id)} size={22} label="" />}
                          description={profile.description}
                        >
                          <span className="truncate">{profile.name}</span>
                          {profile.isDefault && (
                            <Badge size="sm" color="neutral">
                              Default
                            </Badge>
                          )}
                          {selected && <RiCheckLine aria-label="Selected" className="ml-auto text-primary!" />}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                );
              })}
              {(onNewProfile || onManageConnections) && (
                <>
                  <CommandGroup className="border-t border-border">
                    {onNewProfile && (
                      <CommandItem
                        value="__new-profile"
                        keywords={["new", "profile", "create"]}
                        icon={<RiAddLine aria-hidden />}
                        onSelect={() => {
                          setOpen(false);
                          onNewProfile(value?.gatewayId);
                        }}
                      >
                        New profile
                      </CommandItem>
                    )}
                    {onManageConnections && (
                      <CommandItem
                        value="__manage-connections"
                        keywords={["manage", "connections", "gateways"]}
                        icon={<RiSettings3Line aria-hidden />}
                        onSelect={() => {
                          setOpen(false);
                          onManageConnections();
                        }}
                      >
                        Manage connections
                      </CommandItem>
                    )}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }
);
WorkspaceProfileSwitcher.displayName = "WorkspaceProfileSwitcher";

/* ------------------------------------------------------------------ */
/* ProfileScopeBanner                                                  */
/* ------------------------------------------------------------------ */

export interface ProfileScopeBannerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Profile currently being acted on. */
  profileName: React.ReactNode;
  /** Optional gateway name appended to the message. */
  gatewayName?: React.ReactNode;
  /** Custom message; replaces the default sentence. */
  message?: React.ReactNode;
  onSwitchBack?: () => void;
  switchBackLabel?: React.ReactNode;
  /** Stick to the top of the scroll container. Default true. */
  sticky?: boolean;
}

/** App-wide amber banner warning that actions apply to a non-default profile. A preset over `InlineAlert layout="strip"`. */
export const ProfileScopeBanner = React.forwardRef<HTMLDivElement, ProfileScopeBannerProps>(
  (
    { profileName, gatewayName, message, onSwitchBack, switchBackLabel = "Switch back", sticky = true, className, ...props },
    ref
  ) => (
    <InlineAlert
      ref={ref}
      tone="warning"
      layout="strip"
      role="region"
      aria-label="Profile scope"
      icon={<RiUserSettingsLine />}
      action={
        onSwitchBack && (
          <Button
            size="xs"
            variant="outline"
            leadingIcon={<RiArrowGoBackLine aria-hidden />}
            onClick={onSwitchBack}
            className="border-warning/40 bg-transparent text-current hover:bg-warning/15"
          >
            {switchBackLabel}
          </Button>
        )
      }
      className={cn("z-40", sticky && "sticky top-0", className)}
      {...props}
    >
      <p className="min-w-0">
        {message ?? (
          <>
            You&apos;re acting on profile <strong className="font-semibold">{profileName}</strong>
            {gatewayName ? (
              <>
                {" "}
                on <strong className="font-semibold">{gatewayName}</strong>
              </>
            ) : null}{" "}
            — changes apply there.
          </>
        )}
      </p>
    </InlineAlert>
  )
);
ProfileScopeBanner.displayName = "ProfileScopeBanner";

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
  connections?: SavedConnection[];
  defaultConnections?: SavedConnection[];
  onConnectionsChange?: (connections: SavedConnection[]) => void;
  /** Runs a connection check for the editor's current values. */
  onTest?: (connection: SavedConnection) => Promise<ConnectionTestResult> | ConnectionTestResult;
  onSave?: (connection: SavedConnection, isNew: boolean) => void;
  onRemove?: (connection: SavedConnection) => void;
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
      <div ref={ref} className={cn("flex flex-col gap-4", className)} {...props}>
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
            <div className="grid gap-3 sm:grid-cols-2">
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
                <Button size="sm" variant="outline" onClick={test} loading={testing} disabled={!draft.value.url.trim()} className="mr-auto">
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

/* ------------------------------------------------------------------ */
/* GatewayStatusPopover                                                */
/* ------------------------------------------------------------------ */

export type GatewayRunState = "running" | "starting" | "stopping" | "stopped" | "error";

const runStateMeta: Record<GatewayRunState, { label: string; dot: string }> = {
  running: { label: "Running", dot: "bg-success" },
  starting: { label: "Starting", dot: "bg-warning motion-safe:animate-pulse" },
  stopping: { label: "Stopping", dot: "bg-warning motion-safe:animate-pulse" },
  stopped: { label: "Stopped", dot: "bg-muted-foreground" },
  error: { label: "Error", dot: "bg-destructive" },
};

export interface GatewayStatusPopoverProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "name" | "children" | "type" | "onError"> {
  state: GatewayRunState;
  /** Gateway display name. Default "Gateway". */
  name?: React.ReactNode;
  /** Seconds (formatted) or a preformatted string. */
  uptime?: number | string;
  version?: string;
  host?: string;
  /** Error detail shown when state is "error". */
  error?: React.ReactNode;
  onRestart?: () => void;
  onStop?: () => void;
  onStart?: () => void;
  /** Recent log lines rendered in the tail panel. */
  logLines?: string[];
  /** Custom log tail content (e.g. a streaming LogViewer); replaces `logLines`. */
  logSlot?: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  contentClassName?: string;
}

/** Status-bar gateway indicator with a popover of uptime, version, controls and a live log tail. */
export const GatewayStatusPopover = React.forwardRef<HTMLButtonElement, GatewayStatusPopoverProps>(
  (
    {
      state,
      name = "Gateway",
      uptime,
      version,
      host,
      error,
      onRestart,
      onStop,
      onStart,
      logLines,
      logSlot,
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      className,
      contentClassName,
      ...props
    },
    ref
  ) => {
    const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
    const meta = runStateMeta[state];
    const busy = state === "starting" || state === "stopping";
    const uid = React.useId();
    const logRef = React.useRef<HTMLPreElement>(null);
    React.useEffect(() => {
      const el = logRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }, [logLines, open]);
    const uptimeText = typeof uptime === "number" ? formatDuration(uptime * 1000, { round: "floor" }) : uptime;
    const rows: [string, React.ReactNode][] = [];
    if (uptimeText && state === "running") rows.push(["Uptime", uptimeText]);
    if (version) rows.push(["Version", version]);
    if (host) rows.push(["Host", host]);

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            ref={ref}
            type="button"
            data-state-kind={state}
            className={cn(
              "inline-flex h-6 items-center gap-1.5 rounded-sm px-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              focusRing,
              className
            )}
            {...props}
          >
            <span aria-hidden className={cn("size-2 rounded-full", meta.dot)} />
            <span>{name}</span>
            <span className="text-foreground">{meta.label}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="start"
          size="auto"
          padded={false}
          aria-labelledby={`${uid}-title`}
          className={cn("w-80", contentClassName)}
        >
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <span aria-hidden className={cn("size-2.5 rounded-full", meta.dot)} />
            <span id={`${uid}-title`} className="text-sm font-semibold text-foreground">
              {name}
            </span>
            <span className="ml-auto text-xs text-muted-foreground" role="status">
              {meta.label}
            </span>
          </div>
          <div className="flex flex-col gap-3 px-4 py-3">
            {state === "error" && error && (
              <p className="rounded-sm bg-destructive-soft px-2 py-1.5 text-xs text-destructive-soft-foreground">{error}</p>
            )}
            {rows.length > 0 && (
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                {rows.map(([k, v]) => (
                  <React.Fragment key={k}>
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="truncate text-right font-mono text-foreground">{v}</dd>
                  </React.Fragment>
                ))}
              </dl>
            )}
            <div className="flex flex-wrap gap-2">
              {state === "stopped" || state === "error"
                ? onStart && (
                    <Button size="xs" variant="secondary" leadingIcon={<RiPlayLine aria-hidden />} onClick={onStart}>
                      Start
                    </Button>
                  )
                : null}
              {onRestart && state !== "stopped" && (
                <Button size="xs" variant="secondary" leadingIcon={<RiRestartLine aria-hidden />} onClick={onRestart} disabled={busy}>
                  Restart
                </Button>
              )}
              {onStop && state !== "stopped" && state !== "error" && (
                <Button size="xs" variant="destructive-soft" leadingIcon={<RiStopLine aria-hidden />} onClick={onStop} disabled={busy}>
                  Stop
                </Button>
              )}
            </div>
            {(logSlot || logLines) && (
              <section aria-label="Recent logs" className="flex flex-col gap-1">
                <span className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">Recent logs</span>
                {logSlot ?? (
                  <pre
                    ref={logRef}
                    tabIndex={0}
                    aria-live="polite"
                    className={cn(
                      "max-h-40 overflow-auto rounded-sm bg-inverse p-2 font-mono text-2xs leading-relaxed text-inverse-foreground scrollbar-thin",
                      focusRing
                    )}
                  >
                    {logLines && logLines.length ? logLines.join("\n") : "No log output yet"}
                  </pre>
                )}
              </section>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  }
);
GatewayStatusPopover.displayName = "GatewayStatusPopover";
