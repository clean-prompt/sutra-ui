/** LLM providers: the ProviderRow and ProviderList, plus re-exports of the provider model, logo and quota chip, connect dialog, custom endpoint form and env key groups (one module per family). */
import * as React from "react";
import { RiKey2Line, RiLinkM, RiPlugLine, RiRefreshLine, RiServerLine, RiShieldKeyholeLine } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { pluralize } from "../../lib/format";
import { capitalize } from "../../lib/text";
import { DAY_MS, toMs } from "../../lib/time";
import { Button } from "../../primitives/button";
import { Badge } from "../../primitives/badge";
import { StatusBadge, type StatusBadgeStatus } from "../../primitives/status-badge";
import { type ProviderAuthMethod, type ProviderEntry, type ProviderStatus, providerAuthLabels, providerStatusLabels, formatTokenExpiry } from "./llm-providers-model";
import { ProviderLogo, ProviderQuotaChip } from "./llm-providers-logo";
import { type TimeValue } from "./llm-providers-internal";

export * from "./llm-providers-model";
export * from "./llm-providers-logo";
export * from "./llm-providers-connect";
export * from "./llm-providers-endpoint";
export * from "./llm-providers-keys";

const statusBadge: Record<ProviderStatus, StatusBadgeStatus> = {
  connected: "success",
  expired: "warning",
  error: "error",
  "not-configured": "inactive",
};

const authIcon: Record<ProviderAuthMethod, React.ComponentType<{ className?: string; "aria-hidden"?: React.AriaAttributes["aria-hidden"] }>> = {
  oauth: RiShieldKeyholeLine,
  "api-key": RiKey2Line,
  local: RiServerLine,
  custom: RiLinkM,
};

/* ------------------------------------------------------------------ */
/* ProviderRow / ProviderList                                          */
/* ------------------------------------------------------------------ */

export interface ProviderRowProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** The provider to show (name, status, auth method, quotas). */
  provider: ProviderEntry;
  /** Called with the provider when the user presses Connect on an unconfigured provider. */
  onConnect?: (provider: ProviderEntry) => void;
  /** Called with the provider when the user disconnects a connected provider. */
  onDisconnect?: (provider: ProviderEntry) => void;
  /** Called with the provider when the user presses Manage on a connected provider. */
  onManage?: (provider: ProviderEntry) => void;
  /** Reference time for relative quota labels; set it in tests and SSR for stable output. */
  now?: number;
}

/** One provider: monogram logo, auth method, status, token expiry, model count, quota and actions. */
export const ProviderRow = React.forwardRef<HTMLDivElement, ProviderRowProps>(
  ({ provider: p, onConnect, onDisconnect, onManage, now, className, ...props }, ref) => {
    const AuthIcon = authIcon[p.auth];
    const configured = p.status !== "not-configured";
    const expiry = configured ? formatTokenExpiry(p.tokenExpiresAt, now) : "";
    const expiringSoon = (() => {
      const t = toMs(p.tokenExpiresAt);
      return t != null && t - (now ?? Date.now()) < 3 * DAY_MS;
    })();
    return (
      <div
        ref={ref}
        data-slot="provider-row"
        data-status={p.status}
        className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3", className)}
        {...props}
      >
        <ProviderLogo name={p.name} monogram={p.monogram} color={p.color} />
        <div className="min-w-0 flex-1 basis-48">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">{p.name}</span>
            <Badge size="sm" variant="outline" color="neutral" data-slot="provider-auth" leadingIcon={<AuthIcon aria-hidden className="text-muted-foreground" />}>
              {providerAuthLabels[p.auth]}
            </Badge>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            {p.status === "error" && p.error ? (
              <span className="text-destructive">{p.error}</span>
            ) : p.account && configured ? (
              <span className="truncate">{p.account}</span>
            ) : p.description ? (
              <span className="truncate">{p.description}</span>
            ) : null}
            {expiry && (
              <span data-slot="provider-expiry" className={cn((p.status === "expired" || expiringSoon) && "text-warning-soft-foreground")}>
                {capitalize(expiry)}
              </span>
            )}
            {p.modelCount != null && (
              <span data-slot="provider-model-count">
                {p.modelCount} {pluralize(p.modelCount, "model")}
              </span>
            )}
          </div>
        </div>
        <div className="ms-auto flex max-w-full flex-wrap items-center justify-end gap-2">
          {p.quota && configured && (
            <ProviderQuotaChip used={p.quota.used} resetsAt={p.quota.resetsAt} label={p.quota.label ? `${p.name} ${p.quota.label}` : `${p.name} quota`} now={now} />
          )}
          <StatusBadge size="sm" status={statusBadge[p.status]} label={providerStatusLabels[p.status]} />
          {!configured ? (
            <Button size="sm" variant="secondary" leadingIcon={<RiPlugLine aria-hidden />} onClick={() => onConnect?.(p)} aria-label={`Connect ${p.name}`}>
              Connect
            </Button>
          ) : (
            <>
              {(p.status === "expired" || p.status === "error") && (
                <Button size="sm" variant="primary" leadingIcon={<RiRefreshLine aria-hidden />} onClick={() => onConnect?.(p)} aria-label={`Reconnect ${p.name}`}>
                  Reconnect
                </Button>
              )}
              {onManage && (
                <Button size="sm" variant="ghost" onClick={() => onManage(p)} aria-label={`Manage ${p.name}`}>
                  Manage
                </Button>
              )}
              {onDisconnect && (
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onDisconnect(p)} aria-label={`Disconnect ${p.name}`}>
                  Disconnect
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }
);
ProviderRow.displayName = "ProviderRow";

export interface ProviderListProps extends Omit<ProviderRowProps, "provider" | "title"> {
  /** Providers to list, grouped into connected and available. */
  providers: ProviderEntry[];
  /** Heading of the group of configured providers. */
  connectedLabel?: string;
  /** Heading of the group of providers that are not configured. */
  availableLabel?: string;
}

/** Providers grouped into "Connected" and "Available" sections. */
export const ProviderList = React.forwardRef<HTMLDivElement, ProviderListProps>(
  ({ providers, onConnect, onDisconnect, onManage, now, connectedLabel = "Connected", availableLabel = "Available", className, ...props }, ref) => {
    const id = React.useId();
    const groups = [
      { key: "connected", label: connectedLabel, items: providers.filter((p) => p.status !== "not-configured") },
      { key: "available", label: availableLabel, items: providers.filter((p) => p.status === "not-configured") },
    ].filter((g) => g.items.length > 0);
    return (
      <div ref={ref} data-slot="provider-list" className={cn("w-full space-y-5", className)} {...props}>
        {groups.map((g) => (
          <section key={g.key} aria-labelledby={`${id}-${g.key}`} data-group={g.key}>
            <h3 id={`${id}-${g.key}`} className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {g.label}
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-2xs font-medium tabular-nums">{g.items.length}</span>
            </h3>
            <ul className="divide-y divide-border overflow-hidden rounded-box border border-border bg-card">
              {g.items.map((p) => (
                <li key={p.id}>
                  <ProviderRow provider={p} onConnect={onConnect} onDisconnect={onDisconnect} onManage={onManage} now={now} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    );
  }
);
ProviderList.displayName = "ProviderList";
