import * as React from "react";
import {
  RiAlertLine,
  RiDeleteBinLine,
  RiEditLine,
  RiKey2Line,
  RiMore2Line,
  RiRefreshLine,
} from "@remixicon/react";
import { cn } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { DAY_MS, MINUTE_MS, formatRelative, formatShortDate, toMs, type TimeInput } from "../../lib/time";
import { Button } from "../../primitives/button";
import { Badge } from "../../primitives/badge";
import { CheckboxField } from "../../primitives/checkbox";
import {
  ConfirmDialog,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../primitives/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../primitives/dropdown-menu";
import { Input } from "../../primitives/input";
import { Label } from "../../primitives/label";
import { Popover, PopoverContent, PopoverTrigger } from "../../primitives/popover";
import { SimpleSelect } from "../../primitives/select";
import { SecretRevealOnce } from "./secret";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../primitives/table";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

type DateInput = TimeInput;

/** "just now", "5 min ago", "3h ago", "in 3 days", "2 mo ago". */
export function formatRelativeDate(value: DateInput, now: number = Date.now()) {
  const t = toMs(value);
  if (t !== undefined && t > now && t - now < MINUTE_MS) return "in under a minute";
  // Long style with this list's compact hour/month/year units.
  return formatRelative(t, { now, style: "long", future: true, justNowMs: MINUTE_MS })
    .replace(/ hours?\b/, "h")
    .replace(/ months?\b/, " mo")
    .replace(/ years?\b/, "y");
}

/** Mask a key for display: "sk-live-abc…a1b2" → "sk-…a1b2". */
export function maskApiKey(key: { key?: string; prefix?: string; last4?: string } | string) {
  const k = typeof key === "string" ? { key } : key;
  const full = k.key ?? "";
  const prefix = k.prefix ?? (/^([a-z]{2,8}[-_])/i.exec(full)?.[1] ?? "");
  const last4 = k.last4 ?? full.slice(-4);
  return `${prefix}…${last4}`;
}

const shortDate = (v: DateInput) => formatShortDate(v, { year: "always" });

/* ------------------------------------------------------------------ */
/* ApiKeyList                                                          */
/* ------------------------------------------------------------------ */

export interface ApiKey {
  id: string;
  name: string;
  /** Full key (only used to derive the mask). */
  key?: string;
  prefix?: string;
  last4?: string;
  scopes: string[];
  createdAt: DateInput;
  /** null/undefined = never expires. */
  expiresAt?: DateInput | null;
  lastUsedAt?: DateInput | null;
  usageCount?: number;
  revoked?: boolean;
}

export interface ApiKeyListProps extends React.HTMLAttributes<HTMLDivElement> {
  keys: ApiKey[];
  onEdit?: (key: ApiKey) => void;
  onRotate?: (key: ApiKey) => void;
  /** May return a promise; the confirm dialog waits for it. */
  onRevoke?: (key: ApiKey) => void | Promise<void>;
  /** Scope chips shown before "+N more". Default 2. */
  maxScopes?: number;
  /** Warn when a key expires within this many days. Default 7. */
  expiringSoonDays?: number;
  /** Reference time (tests/SSR). */
  now?: number;
  /** Shown when there is nothing to list. Default "No API keys yet". */
  emptyState?: React.ReactNode;
  /** @deprecated Use `emptyState`. */
  empty?: React.ReactNode;
}

function ExpiryCell({ expiresAt, now, soonDays }: { expiresAt?: DateInput | null; now: number; soonDays: number }) {
  if (expiresAt == null) return <span className="text-muted-foreground">Never</span>;
  const t = toMs(expiresAt) ?? NaN;
  if (t <= now) {
    return (
      <Badge size="sm" color="destructive" title={shortDate(t)}>
        Expired {formatRelativeDate(t, now)}
      </Badge>
    );
  }
  if (t - now <= soonDays * DAY_MS) {
    return (
      <Badge size="sm" color="warning" leadingIcon={<RiAlertLine aria-hidden />} title={shortDate(t)}>
        Expires {formatRelativeDate(t, now)}
      </Badge>
    );
  }
  return <span title={shortDate(t)}>{formatRelativeDate(t, now)}</span>;
}

function ScopeChips({ scopes, max, keyName }: { scopes: string[]; max: number; keyName: string }) {
  const shown = scopes.slice(0, max);
  const rest = scopes.slice(max);
  if (scopes.length === 0) return <span className="text-muted-foreground">All</span>;
  return (
    <span className="flex flex-wrap items-center gap-1">
      {shown.map((s) => (
        <Badge key={s} size="sm" variant="outline" className="font-mono">
          {s}
        </Badge>
      ))}
      {rest.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`Show ${rest.length} more scopes for ${keyName}`}
              className="h-5 rounded-control px-1.5 text-2xs font-medium text-primary hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              +{rest.length} more
            </button>
          </PopoverTrigger>
          <PopoverContent size="sm" align="start" aria-label={`Scopes for ${keyName}`}>
            <p className="mb-2 text-xs font-medium text-muted-foreground">All scopes</p>
            <ul className="flex flex-wrap gap-1">
              {scopes.map((s) => (
                <li key={s}>
                  <Badge size="sm" variant="outline" className="font-mono">
                    {s}
                  </Badge>
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      )}
    </span>
  );
}

/** API keys table: masked key, scopes, expiry warnings, usage and a row menu (edit, rotate, revoke). */
export const ApiKeyList = React.forwardRef<HTMLDivElement, ApiKeyListProps>(
  (
    { keys, onEdit, onRotate, onRevoke, maxScopes = 2, expiringSoonDays = 7, now: nowProp, emptyState, empty, className, ...props },
    ref
  ) => {
    const now = nowProp ?? Date.now();
    const [revoking, setRevoking] = React.useState<ApiKey | null>(null);
    const hasMenu = !!(onEdit || onRotate || onRevoke);
    return (
      <div ref={ref} data-slot="api-key-list" className={cn("w-full", className)} {...props}>
        {keys.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-box border border-dashed border-border px-6 py-10 text-center">
            <RiKey2Line aria-hidden className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{emptyState ?? empty ?? "No API keys yet"}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Scopes</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead className="text-right">Requests</TableHead>
                {hasMenu && (
                  <TableHead className="w-10">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((k) => (
                <TableRow key={k.id} data-key={k.id} data-revoked={k.revoked || undefined} className={cn(k.revoked && "opacity-60")}>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-2">
                      {k.name}
                      {k.revoked && (
                        <Badge size="sm" color="neutral">
                          Revoked
                        </Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">{maskApiKey(k)}</TableCell>
                  <TableCell>
                    <ScopeChips scopes={k.scopes} max={maxScopes} keyName={k.name} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground" title={shortDate(k.createdAt)}>
                    {formatRelativeDate(k.createdAt, now)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <ExpiryCell expiresAt={k.expiresAt} now={now} soonDays={expiringSoonDays} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {k.lastUsedAt ? formatRelativeDate(k.lastUsedAt, now) : "Never"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{(k.usageCount ?? 0).toLocaleString()}</TableCell>
                  {hasMenu && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-xs" aria-label={`Actions for ${k.name}`} disabled={k.revoked}>
                            <RiMore2Line aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onEdit && (
                            <DropdownMenuItem icon={<RiEditLine aria-hidden />} onSelect={() => onEdit(k)}>
                              Edit
                            </DropdownMenuItem>
                          )}
                          {onRotate && (
                            <DropdownMenuItem icon={<RiRefreshLine aria-hidden />} onSelect={() => onRotate(k)}>
                              Rotate
                            </DropdownMenuItem>
                          )}
                          {onRevoke && (
                            <>
                              {(onEdit || onRotate) && <DropdownMenuSeparator />}
                              <DropdownMenuItem variant="destructive" icon={<RiDeleteBinLine aria-hidden />} onSelect={() => setRevoking(k)}>
                                Revoke
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <ConfirmDialog
          open={!!revoking}
          onOpenChange={(open) => !open && setRevoking(null)}
          tone="destructive"
          icon={<RiDeleteBinLine aria-hidden />}
          title={`Revoke “${revoking?.name ?? ""}”?`}
          description="Requests using this key will fail immediately. This can't be undone."
          confirmLabel="Revoke key"
          onConfirm={async () => {
            if (revoking) await onRevoke?.(revoking);
          }}
        />
      </div>
    );
  }
);
ApiKeyList.displayName = "ApiKeyList";

/* ------------------------------------------------------------------ */
/* ApiKeyCreateDialog                                                  */
/* ------------------------------------------------------------------ */

export interface ApiKeyOption {
  value: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  /** Shown when this option is checked. */
  warning?: React.ReactNode;
}

export interface ApiKeyExpiryOption {
  label: string;
  /** Days, or null for never. */
  days: number | null;
}

export const defaultApiKeyExpiryOptions: ApiKeyExpiryOption[] = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "1 year", days: 365 },
  { label: "Never", days: null },
];

export interface ApiKeyCreateInput {
  name: string;
  scopes: string[];
  /** Expiry in days, or null for never. */
  expiresInDays: number | null;
  permissions: string[];
}

export interface ApiKeyCreateDialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  scopes: ApiKeyOption[];
  permissions?: ApiKeyOption[];
  expiryOptions?: ApiKeyExpiryOption[];
  /** Default expiry index. Default 1 (30 days). */
  defaultExpiryIndex?: number;
  /** Create the key and return its secret (string or `{ secret }`). Throw to show an error. */
  onCreate: (input: ApiKeyCreateInput) => string | { secret: string } | Promise<string | { secret: string }>;
  /** File name for the show-once download. */
  fileName?: string;
  /**
   * Called when `onCreate` resolves after the dialog was closed (or unmounted) mid-request. The key
   * exists server-side but its secret was never shown, so apps should revoke it.
   */
  onCreateDiscarded?: (result: string | { secret: string }, input: ApiKeyCreateInput) => void;
}

/** Create-key dialog: name, scopes, expiry and permissions, then a show-once secret. */
export function ApiKeyCreateDialog({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  trigger,
  title = "Create API key",
  description = "Keys are shown once. Grant only the scopes this key needs.",
  scopes,
  permissions = [],
  expiryOptions = defaultApiKeyExpiryOptions,
  defaultExpiryIndex = 1,
  onCreate,
  fileName = "api-key.txt",
  onCreateDiscarded,
}: ApiKeyCreateDialogProps) {
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  const [name, setName] = React.useState("");
  const [selected, setSelected] = React.useState<string[]>([]);
  const [perms, setPerms] = React.useState<string[]>([]);
  const [expiry, setExpiry] = React.useState(String(Math.min(defaultExpiryIndex, expiryOptions.length - 1)));
  const [secret, setSecret] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [touched, setTouched] = React.useState(false);
  const id = React.useId();
  // Bumped on every submit, reset and unmount; a request whose token is stale has its result discarded.
  const requestRef = React.useRef(0);
  const discardedRef = React.useRef(onCreateDiscarded);
  discardedRef.current = onCreateDiscarded;

  const reset = () => {
    requestRef.current += 1;
    setBusy(false);
    setName("");
    setSelected([]);
    setPerms([]);
    setExpiry(String(Math.min(defaultExpiryIndex, expiryOptions.length - 1)));
    setSecret(null);
    setError(undefined);
    setTouched(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && secret) return; // must acknowledge via Done
    setOpen(next);
    if (!next) reset();
  };

  // Also reset when a controlled parent closes the dialog without going through onOpenChange.
  React.useEffect(() => {
    if (!open) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  React.useEffect(
    () => () => {
      requestRef.current += 1;
    },
    []
  );

  const nameError = touched && !name.trim() ? "Give the key a name." : undefined;
  const scopeError = touched && selected.length === 0 ? "Pick at least one scope." : undefined;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!name.trim() || selected.length === 0) return;
    const token = ++requestRef.current;
    const input: ApiKeyCreateInput = {
      name: name.trim(),
      scopes: selected,
      expiresInDays: expiryOptions[Number(expiry)]?.days ?? null,
      permissions: perms,
    };
    setBusy(true);
    setError(undefined);
    try {
      const result = await onCreate(input);
      if (token !== requestRef.current) {
        discardedRef.current?.(result, input);
        return;
      }
      setSecret(typeof result === "string" ? result : result.secret);
    } catch (err) {
      if (token !== requestRef.current) return;
      setError(err instanceof Error ? err.message : "Couldn't create the key.");
    } finally {
      if (token === requestRef.current) setBusy(false);
    }
  };

  const toggleIn = (list: string[], v: string, on: boolean) => (on ? [...list.filter((x) => x !== v), v] : list.filter((x) => x !== v));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent showClose={!secret} onEscapeKeyDown={(e) => secret && e.preventDefault()}>
        {secret ? (
          <>
            <DialogHeader icon={<RiKey2Line aria-hidden />} tone="success">
              <DialogTitle>Key created</DialogTitle>
              <DialogDescription>“{name.trim()}” is ready to use.</DialogDescription>
            </DialogHeader>
            <SecretRevealOnce
              secret={secret}
              fileName={fileName}
              onDone={() => {
                setOpen(false);
                reset();
              }}
            />
          </>
        ) : (
          <form onSubmit={submit} className="contents" noValidate>
            <DialogHeader icon={<RiKey2Line aria-hidden />}>
              <DialogTitle>{title}</DialogTitle>
              {description && <DialogDescription>{description}</DialogDescription>}
            </DialogHeader>
            <DialogBody className="grid gap-5">
              <div className="grid gap-1.5">
                <Label htmlFor={`${id}-name`} required>
                  Name
                </Label>
                <Input
                  id={`${id}-name`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Production server"
                  invalid={!!nameError}
                  aria-describedby={nameError ? `${id}-name-error` : undefined}
                  autoComplete="off"
                />
                {nameError && (
                  <p id={`${id}-name-error`} className="text-xs text-destructive">
                    {nameError}
                  </p>
                )}
              </div>
              <fieldset className="grid gap-2">
                <legend className="mb-2 text-sm font-medium text-foreground">Scopes</legend>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {scopes.map((s) => (
                    <CheckboxField
                      key={s.value}
                      label={<span className="font-mono text-[0.8125rem]">{typeof s.label === "string" ? s.label : s.value}</span>}
                      description={s.description}
                      checked={selected.includes(s.value)}
                      onCheckedChange={(v) => setSelected((cur) => toggleIn(cur, s.value, v === true))}
                    />
                  ))}
                </div>
                {scopeError && <p className="text-xs text-destructive">{scopeError}</p>}
              </fieldset>
              <div className="grid gap-1.5">
                <Label htmlFor={`${id}-expiry`}>Expires</Label>
                <SimpleSelect
                  id={`${id}-expiry`}
                  value={expiry}
                  onValueChange={setExpiry}
                  options={expiryOptions.map((o, i) => ({ value: String(i), label: o.label }))}
                />
                {expiryOptions[Number(expiry)]?.days == null && (
                  <p className="flex items-center gap-1.5 text-xs text-warning-soft-foreground">
                    <RiAlertLine aria-hidden className="size-3.5" />
                    Keys that never expire are riskier. Rotate them regularly.
                  </p>
                )}
              </div>
              {permissions.length > 0 && (
                <fieldset className="grid gap-2.5">
                  <legend className="mb-2 text-sm font-medium text-foreground">Permissions</legend>
                  {permissions.map((p) => {
                    const on = perms.includes(p.value);
                    return (
                      <div key={p.value} className="grid gap-1.5">
                        <CheckboxField
                          label={p.label}
                          description={p.description}
                          checked={on}
                          onCheckedChange={(v) => setPerms((cur) => toggleIn(cur, p.value, v === true))}
                        />
                        {on && p.warning && (
                          <p role="note" className="ml-7 flex items-start gap-1.5 rounded-md bg-warning-soft px-2.5 py-1.5 text-xs text-warning-soft-foreground">
                            <RiAlertLine aria-hidden className="mt-px size-3.5 shrink-0" />
                            {p.warning}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </fieldset>
              )}
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={busy}>
                Create key
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
ApiKeyCreateDialog.displayName = "ApiKeyCreateDialog";

/* ------------------------------------------------------------------ */
/* ApiKeyUsage                                                         */
/* ------------------------------------------------------------------ */

export interface ApiKeyUsageRow {
  id?: string;
  /** Endpoint, model or day. */
  label: React.ReactNode;
  requests: number;
  errors?: number;
  lastUsedAt?: DateInput;
}

export interface ApiKeyUsageProps extends React.HTMLAttributes<HTMLDivElement> {
  rows: ApiKeyUsageRow[];
  labelHeader?: React.ReactNode;
  now?: number;
  /** Show a totals row. Default true. */
  showTotal?: boolean;
}

/** Compact per-endpoint usage table with inline bars and error rate. */
export const ApiKeyUsage = React.forwardRef<HTMLDivElement, ApiKeyUsageProps>(
  ({ rows, labelHeader = "Endpoint", now: nowProp, showTotal = true, className, ...props }, ref) => {
    const now = nowProp ?? Date.now();
    const max = Math.max(1, ...rows.map((r) => r.requests));
    const total = rows.reduce((a, r) => a + r.requests, 0);
    const totalErrors = rows.reduce((a, r) => a + (r.errors ?? 0), 0);
    const hasLast = rows.some((r) => r.lastUsedAt != null);
    return (
      <div ref={ref} data-slot="api-key-usage" className={cn("w-full", className)} {...props}>
        <Table density="compact">
          <TableHeader>
            <TableRow>
              <TableHead>{labelHeader}</TableHead>
              <TableHead className="text-right">Requests</TableHead>
              <TableHead className="text-right">Errors</TableHead>
              {hasLast && <TableHead className="text-right">Last</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => {
              const errRate = r.requests ? (r.errors ?? 0) / r.requests : 0;
              return (
                <TableRow key={r.id ?? i}>
                  <TableCell>
                    <span className="grid gap-1">
                      <span className="truncate font-mono text-xs">{r.label}</span>
                      <span aria-hidden className="block h-1 rounded-full bg-muted">
                        <span className="block h-full rounded-full bg-primary/70" style={{ width: `${(r.requests / max) * 100}%` }} />
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r.requests.toLocaleString()}</TableCell>
                  <TableCell className={cn("text-right tabular-nums", errRate > 0.05 ? "text-destructive" : "text-muted-foreground")}>
                    {(r.errors ?? 0).toLocaleString()}
                  </TableCell>
                  {hasLast && (
                    <TableCell className="whitespace-nowrap text-right text-muted-foreground">
                      {r.lastUsedAt != null ? formatRelativeDate(r.lastUsedAt, now) : "—"}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {showTotal && rows.length > 1 && (
              <TableRow className="font-medium">
                <TableCell>Total</TableCell>
                <TableCell className="text-right tabular-nums">{total.toLocaleString()}</TableCell>
                <TableCell className="text-right tabular-nums">{totalErrors.toLocaleString()}</TableCell>
                {hasLast && <TableCell />}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    );
  }
);
ApiKeyUsage.displayName = "ApiKeyUsage";
