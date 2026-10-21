/** MCP: the ConnectorAccounts, plus re-exports of the config model, server form and card, connector chooser and directory, and the key/value rows input. */
import * as React from "react";
import { RiAddLine, RiArrowDownSLine, RiCheckLine, RiCloseLine, RiDeleteBinLine, RiPencilLine, RiRefreshLine } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { errorMessage } from "../../hooks/use-async-action";
import { Button } from "../../primitives/button";
import { Input } from "../../primitives/input";
import { StatusBadge, type StatusBadgeStatus } from "../../primitives/status-badge";

export * from "./mcp-model";
export * from "./mcp-server-form";
export * from "./mcp-server-card";
export * from "./mcp-connectors";

export { KeyValueRowsInput, looksSecretKey, type KeyValueRowsEntry, type KeyValueRowsInputProps } from "./key-value-rows-internal";

/* ------------------------------------------------------------------ */
/* ConnectorAccounts                                                   */
/* ------------------------------------------------------------------ */

export type ConnectorAccountStatus = "connected" | "expired" | "error" | "retired";

export interface ConnectorAccount {
  id: string;
  alias: string;
  /** Email or handle the account signed in as. */
  identity?: string;
  status: ConnectorAccountStatus;
  /** Preformatted "last used" text. */
  lastUsed?: string;
  error?: string;
}

const accountStatusMeta: Record<ConnectorAccountStatus, { status: StatusBadgeStatus; label: string }> = {
  connected: { status: "online", label: "Connected" },
  expired: { status: "warning", label: "Expired" },
  error: { status: "error", label: "Error" },
  retired: { status: "offline", label: "Retired" },
};

export interface ConnectorAccountsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Accounts linked to the connector, each with alias, status and identity. */
  accounts: ConnectorAccount[];
  /** Rename an account. Throw to show an error. */
  onRename?: (id: string, alias: string) => void | Promise<void>;
  /** Called with the account id when the user presses Repair on an expired or errored account. */
  onRepair?: (id: string) => void;
  /** Called when the user presses Add account; the button is hidden when unset. */
  onAdd?: () => void;
  /** Called with the account id when the user presses Remove on a non-retired account. */
  onRemove?: (id: string) => void;
  /** Connector name used in the heading ("Slack accounts"); the heading reads "Accounts" when unset. */
  connectorName?: string;
}

function AccountAlias({
  account,
  taken,
  onRename,
}: {
  account: ConnectorAccount;
  taken: (alias: string) => boolean;
  onRename?: ConnectorAccountsProps["onRename"];
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(account.alias);
  const [error, setError] = React.useState<string | null>(null);
  const inputId = React.useId();
  const start = () => {
    setDraft(account.alias);
    setError(null);
    setEditing(true);
  };
  const commit = async () => {
    const next = draft.trim();
    if (!next) return setError("Name can't be empty");
    if (next === account.alias) return setEditing(false);
    if (taken(next)) return setError("That name is already taken");
    try {
      await onRename?.(account.id, next);
      setEditing(false);
    } catch (e) {
      setError(errorMessage(e, "Couldn't rename"));
    }
  };
  if (!editing) {
    return (
      <span className="flex min-w-0 items-center gap-1">
        <span className="truncate text-sm font-medium text-foreground">{account.alias}</span>
        {onRename && account.status !== "retired" && (
          <Button size="icon-xs" variant="ghost" aria-label={`Rename ${account.alias}`} onClick={start}>
            <RiPencilLine aria-hidden />
          </Button>
        )}
      </span>
    );
  }
  return (
    <span className="block min-w-0 flex-1">
      <span className="flex items-center gap-1">
        <Input
          id={inputId}
          size="sm"
          autoFocus
          value={draft}
          aria-label="Account name"
          invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-err` : undefined}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void commit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              setEditing(false);
            }
          }}
          className="h-7"
        />
        <Button size="icon-xs" variant="ghost" aria-label="Save name" onClick={() => void commit()}>
          <RiCheckLine aria-hidden />
        </Button>
        <Button size="icon-xs" variant="ghost" aria-label="Cancel rename" onClick={() => setEditing(false)}>
          <RiCloseLine aria-hidden />
        </Button>
      </span>
      {error && (
        <span id={`${inputId}-err`} role="alert" className="mt-1 block text-xs text-destructive">
          {error}
        </span>
      )}
    </span>
  );
}

/** Multiple accounts per connector: inline alias rename, status, repair, folded retired accounts and add. */
export const ConnectorAccounts = React.forwardRef<HTMLDivElement, ConnectorAccountsProps>(
  ({ accounts, onRename, onRepair, onAdd, onRemove, connectorName, className, ...props }, ref) => {
    const [showRetired, setShowRetired] = React.useState(false);
    const active = accounts.filter((a) => a.status !== "retired");
    const retired = accounts.filter((a) => a.status === "retired");
    const retiredId = React.useId();
    const row = (a: ConnectorAccount) => {
      const st = accountStatusMeta[a.status];
      return (
        <li key={a.id} data-account={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <AccountAlias
              account={a}
              onRename={onRename}
              taken={(alias) => accounts.some((o) => o.id !== a.id && o.alias.toLowerCase() === alias.toLowerCase())}
            />
            {(a.identity || a.lastUsed) && (
              <p className="truncate text-xs text-muted-foreground">
                {a.identity}
                {a.identity && a.lastUsed && " · "}
                {a.lastUsed}
              </p>
            )}
            {a.error && <p className="text-xs text-destructive">{a.error}</p>}
          </div>
          <StatusBadge status={st.status} label={st.label} size="sm" />
          {onRepair && (a.status === "expired" || a.status === "error") && (
            <Button size="xs" variant="soft" leadingIcon={<RiRefreshLine aria-hidden />} onClick={() => onRepair(a.id)} aria-label={`Repair ${a.alias}`}>
              Repair
            </Button>
          )}
          {onRemove && a.status !== "retired" && (
            <Button size="icon-xs" variant="ghost" aria-label={`Remove ${a.alias}`} onClick={() => onRemove(a.id)}>
              <RiDeleteBinLine aria-hidden />
            </Button>
          )}
        </li>
      );
    };
    return (
      <div ref={ref} data-slot="connector-accounts" className={cn("rounded-box border border-border bg-card shadow-xs", className)} {...props}>
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <h3 className="text-sm font-semibold text-foreground">
            {connectorName ? `${connectorName} accounts` : "Accounts"}
          </h3>
          <span className="text-xs text-muted-foreground tabular-nums">{active.length}</span>
          {onAdd && (
            <Button size="xs" variant="ghost" className="ms-auto" leadingIcon={<RiAddLine aria-hidden />} onClick={onAdd}>
              Add account
            </Button>
          )}
        </div>
        {active.length ? (
          <ul aria-label="Accounts" className="divide-y divide-border">
            {active.map(row)}
          </ul>
        ) : (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">No accounts connected</p>
        )}
        {retired.length > 0 && (
          <div className="border-t border-border">
            <button
              type="button"
              aria-expanded={showRetired}
              aria-controls={showRetired ? retiredId : undefined}
              onClick={() => setShowRetired((s) => !s)}
              className={cn("flex w-full items-center gap-1.5 px-3 py-2 text-start text-xs font-medium text-muted-foreground hover:text-foreground", focusRing)}
            >
              <RiArrowDownSLine aria-hidden className={cn("size-4 chevron-turn", !showRetired && "-rotate-90 rtl:rotate-90")} />
              Retired accounts ({retired.length})
            </button>
            {showRetired && (
              <ul id={retiredId} aria-label="Retired accounts" className="divide-y divide-border opacity-75">
                {retired.map(row)}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  }
);
ConnectorAccounts.displayName = "ConnectorAccounts";