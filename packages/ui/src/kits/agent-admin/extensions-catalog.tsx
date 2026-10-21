/** Extensions catalog: the SyncReceiptCard, plus re-exports of the catalog card, installed card, install dialog, scan verdict and skill views. */
import * as React from "react";
import { RiAlertLine, RiArrowUpCircleLine, RiCheckLine, RiCloseCircleLine, RiRestartLine } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import { FlowArrow } from "../../primitives/flow-arrow-internal";

export * from "./extensions-catalog-card";
export * from "./extensions-catalog-installed";
export * from "./extensions-catalog-install";
export * from "./extensions-catalog-scan";
export * from "./extensions-catalog-skill";

/* ------------------------------------------------------------------ */
/* SyncReceiptCard                                                     */
/* ------------------------------------------------------------------ */

export interface SyncReceiptUpdated {
  name: string;
  from?: string;
  to?: string;
}

export interface SyncReceiptIssue {
  name: string;
  reason?: string;
}

export interface SyncReceiptCardProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** Heading of the receipt; defaults to a generic "Sync complete" style title. */
  title?: React.ReactNode;
  /** Preformatted time of the sync. */
  syncedAt?: string;
  /** Items that were updated by the sync, with old and new versions. */
  updated?: SyncReceiptUpdated[];
  /** Items that failed to sync, each with the reason. */
  failed?: SyncReceiptIssue[];
  /** Items disabled by a dependency conflict, each with the reason. */
  disabled?: SyncReceiptIssue[];
  /** Items with updates still available after the sync. */
  availableUpdates?: SyncReceiptUpdated[];
  /** Called when the user presses Retry on the failures; the button is hidden when unset. */
  onRetry?: () => void;
  /** Called when the user presses Update all for `availableUpdates`; the button is hidden when unset. */
  onUpdateAll?: () => void;
}

function ReceiptSection({
  label,
  count,
  tone,
  icon,
  children,
}: {
  label: string;
  count: number;
  tone: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  if (!count) return null;
  return (
    <section aria-label={label} className="space-y-1.5">
      <h4 className={cn("flex items-center gap-1.5 text-xs font-semibold", tone)}>
        <span aria-hidden className="[&_svg]:size-3.5">
          {icon}
        </span>
        {label}
        <span className="tabular-nums">({count})</span>
      </h4>
      <ul className="space-y-1 ps-5 text-sm">{children}</ul>
    </section>
  );
}

/** Post-sync summary: updated, failed rebuilds, disabled by dependency conflict and available updates. */
export const SyncReceiptCard = React.forwardRef<HTMLElement, SyncReceiptCardProps>(
  ({ title = "Sync complete", syncedAt, updated = [], failed = [], disabled = [], availableUpdates = [], onRetry, onUpdateAll, className, ...props }, ref) => {
    const clean = !updated.length && !failed.length && !disabled.length && !availableUpdates.length;
    const headId = React.useId();
    return (
      <article ref={ref} aria-labelledby={headId} data-slot="sync-receipt-card" className={cn("space-y-3 rounded-box border border-border bg-card p-4 shadow-xs", className)} {...props}>
        <header className="flex items-center gap-2">
          <h3 id={headId} className="text-sm font-semibold text-foreground">
            {title}
          </h3>
          {syncedAt && <span className="text-xs text-muted-foreground">{syncedAt}</span>}
        </header>
        <div className="flex flex-wrap gap-1.5">
          <Badge size="sm" color="success">{updated.length} updated</Badge>
          {failed.length > 0 && <Badge size="sm" color="destructive">{failed.length} failed</Badge>}
          {disabled.length > 0 && <Badge size="sm" color="warning">{disabled.length} disabled</Badge>}
          {availableUpdates.length > 0 && <Badge size="sm" color="info">{availableUpdates.length} updates available</Badge>}
        </div>
        {clean && <p className="text-sm text-muted-foreground">Everything is up to date.</p>}
        <ReceiptSection label="Updated" count={updated.length} tone="text-success-soft-foreground" icon={<RiCheckLine aria-hidden />}>
          {updated.map((u) => (
            <li key={u.name} className="font-mono text-xs">
              {u.name}
              {(u.from || u.to) && (
                <span className="text-muted-foreground">
                  {" "}
                  {u.from} <FlowArrow /> {u.to}
                </span>
              )}
            </li>
          ))}
        </ReceiptSection>
        <ReceiptSection label="Failed rebuilds" count={failed.length} tone="text-destructive" icon={<RiCloseCircleLine aria-hidden />}>
          {failed.map((f) => (
            <li key={f.name} className="text-xs">
              <span className="font-mono">{f.name}</span>
              {f.reason && <span className="text-muted-foreground"> — {f.reason}</span>}
            </li>
          ))}
        </ReceiptSection>
        <ReceiptSection label="Disabled by dependency conflict" count={disabled.length} tone="text-warning-soft-foreground" icon={<RiAlertLine aria-hidden />}>
          {disabled.map((f) => (
            <li key={f.name} className="text-xs">
              <span className="font-mono">{f.name}</span>
              {f.reason && <span className="text-muted-foreground"> — {f.reason}</span>}
            </li>
          ))}
        </ReceiptSection>
        <ReceiptSection label="Available updates" count={availableUpdates.length} tone="text-info-soft-foreground" icon={<RiArrowUpCircleLine aria-hidden />}>
          {availableUpdates.map((u) => (
            <li key={u.name} className="font-mono text-xs">
              {u.name}
              {u.to && <span className="text-muted-foreground"> <FlowArrow /> {u.to}</span>}
            </li>
          ))}
        </ReceiptSection>
        {(onRetry || onUpdateAll) && (failed.length > 0 || availableUpdates.length > 0) && (
          <div className="flex justify-end gap-2 border-t border-border pt-3">
            {onRetry && failed.length > 0 && (
              <Button size="sm" variant="ghost" leadingIcon={<RiRestartLine aria-hidden />} onClick={onRetry}>
                Retry failed
              </Button>
            )}
            {onUpdateAll && availableUpdates.length > 0 && (
              <Button size="sm" variant="soft" leadingIcon={<RiArrowUpCircleLine aria-hidden />} onClick={onUpdateAll}>
                Update all
              </Button>
            )}
          </div>
        )}
      </article>
    );
  }
);
SyncReceiptCard.displayName = "SyncReceiptCard";
