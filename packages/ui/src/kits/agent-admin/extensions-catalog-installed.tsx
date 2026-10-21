/** Installed extensions: the InstalledExtensionCard and its runtime status. */
import * as React from "react";
import {
  RiArrowUpCircleLine,
  RiDeleteBinLine,
  RiErrorWarningLine,
  RiEyeOffLine,
  RiGitBranchLine,
  RiKey2Line,
  RiLayoutMasonryLine,
  RiRestartLine,
} from "@remixicon/react";
import { cn } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import { CodeBlock } from "../../patterns/code-block";
import { ConfirmDialog } from "../../primitives/dialog";
import { InlineAlert, InlineAlertDescription, InlineAlertTitle } from "../../primitives/inline-alert";
import { StatusBadge, type StatusBadgeStatus } from "../../primitives/status-badge";
import { Switch } from "../../primitives/switch";
import { CapabilityMonogram } from "./capabilities";

/* ------------------------------------------------------------------ */
/* InstalledExtensionCard                                              */
/* ------------------------------------------------------------------ */

export type ExtensionRuntimeStatus = "running" | "disabled" | "error" | "restart-required";

const runtimeMeta: Record<ExtensionRuntimeStatus, { status: StatusBadgeStatus; label: string }> = {
  running: { status: "online", label: "Running" },
  disabled: { status: "offline", label: "Disabled" },
  error: { status: "error", label: "Error" },
  "restart-required": { status: "warning", label: "Restart required" },
};

export interface InstalledExtensionCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Extension name, shown as the card title. */
  name: string;
  /** Extension icon or logo, shown beside the name. */
  icon?: React.ReactNode;
  /** "Catalog", a git URL or a local path. */
  source?: string;
  /** Installed version (without the leading `v`). */
  version?: string;
  /** Newest available version; an update is offered when it differs from `version` and `onUpdate` is set. */
  latestVersion?: string;
  /** Runtime status of the extension (`running`, `disabled`, `error`, `restart-required`); sets the status pill. */
  runtime: ExtensionRuntimeStatus;
  /** Error detail shown when `runtime` is `error`. */
  error?: string;
  /** Shows an "Auth required" badge when the extension needs the user to sign in before it works. */
  authRequired?: boolean;
  /** Controlled on/off state of the enable switch. */
  enabled?: boolean;
  /** Initial on/off state when `enabled` is not controlled. */
  defaultEnabled?: boolean;
  /** Called with the new state when the user flips the enable switch. */
  onEnabledChange?: (enabled: boolean) => void;
  /** Called after the user consents to the update. */
  onUpdate?: () => void | Promise<void>;
  /** Changelog or notes shown in the consent dialog. */
  updateNotes?: React.ReactNode;
  /** New permissions requested by the update. */
  updatePermissions?: string[];
  /** Called when the user opens the extension's page or settings; the button is hidden when unset. */
  onOpen?: () => void;
  /** Called when the user hides the extension from the UI without uninstalling it; the button is hidden when unset. */
  onHide?: () => void;
  /** Called after the user confirms removal; may return a promise to keep the dialog busy until it settles. */
  onRemove?: () => void | Promise<void>;
  /** UI slots this extension contributes to (e.g. "sidebar.footer"). */
  slots?: string[];
  /** Setup command shown in a copyable block. */
  setupCommand?: string;
}

/** Installed plugin row: source, version, runtime status, auth, enable / update (consent) / open / hide / remove, slots and setup. */
export const InstalledExtensionCard = React.forwardRef<HTMLDivElement, InstalledExtensionCardProps>(
  (
    {
      name,
      icon,
      source,
      version,
      latestVersion,
      runtime,
      error,
      authRequired,
      enabled: enabledProp,
      defaultEnabled = true,
      onEnabledChange,
      onUpdate,
      updateNotes,
      updatePermissions,
      onOpen,
      onHide,
      onRemove,
      slots,
      setupCommand,
      className,
      ...props
    },
    ref
  ) => {
    const [enabled, setEnabled] = useControllableState({ value: enabledProp, defaultValue: defaultEnabled, onChange: onEnabledChange });
    const titleId = React.useId();
    const rt = runtimeMeta[runtime];
    const hasUpdate = Boolean(onUpdate && latestVersion && latestVersion !== version);
    return (
      <div
        ref={ref}
        role="group"
        aria-labelledby={titleId}
        data-slot="installed-extension-card"
        data-runtime={runtime}
        className={cn("space-y-3 rounded-box border border-border bg-card p-4 shadow-xs", className)}
        {...props}
      >
        <div className="flex items-start gap-3">
          {icon ? (
            <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-box border border-border bg-background [&_svg]:size-[18px]">
              {icon}
            </span>
          ) : (
            <CapabilityMonogram name={name} />
          )}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 id={titleId} className="truncate text-sm font-semibold text-foreground">
                {name}
              </h3>
              {version && <span className="font-mono text-xs text-muted-foreground">v{version}</span>}
              <StatusBadge status={rt.status} label={rt.label} size="sm" />
              {authRequired && (
                <Badge size="sm" color="warning" leadingIcon={<RiKey2Line aria-hidden className="size-3" />}>
                  Auth required
                </Badge>
              )}
            </div>
            {source && (
              <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                <RiGitBranchLine aria-hidden className="size-3 shrink-0" />
                <span className="truncate font-mono">{source}</span>
              </p>
            )}
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} aria-label={`Enable ${name}`} />
        </div>
        {runtime === "restart-required" && (
          <p role="note" className="flex items-center gap-1.5 rounded-md bg-warning-soft px-2.5 py-1.5 text-xs text-warning-soft-foreground">
            <RiRestartLine aria-hidden className="size-3.5 shrink-0" />
            Takes effect after restart
          </p>
        )}
        {runtime === "error" && error && (
          <p className="flex items-start gap-1.5 rounded-md bg-destructive-soft px-2.5 py-1.5 font-mono text-xs text-destructive-soft-foreground">
            <RiErrorWarningLine aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            {error}
          </p>
        )}
        {slots && slots.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <RiLayoutMasonryLine aria-hidden className="size-3.5" />
              Contributes to
            </span>
            <ul aria-label="UI slots" className="flex flex-wrap gap-1">
              {slots.map((s) => (
                <li key={s}>
                  <Badge size="sm" variant="outline" className="font-mono">
                    {s}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
        {setupCommand && <CodeBlock code={setupCommand} language="bash" filename="Setup" theme="light" />}
        <div className="flex flex-wrap items-center gap-1.5">
          {hasUpdate && (
            <ConfirmDialog
              trigger={
                <Button size="sm" variant="soft" leadingIcon={<RiArrowUpCircleLine aria-hidden />}>
                  Update to v{latestVersion}
                </Button>
              }
              title={`Update ${name} to v${latestVersion}?`}
              description={`You are on v${version ?? "?"}. Review what changes before updating.`}
              confirmLabel="Update"
              onConfirm={onUpdate}
            >
              <div className="space-y-3 text-sm">
                {updateNotes != null && <div className="text-muted-foreground">{updateNotes}</div>}
                {updatePermissions && updatePermissions.length > 0 && (
                  <InlineAlert variant="warning">
                    <InlineAlertTitle>New permissions requested</InlineAlertTitle>
                    <InlineAlertDescription>
                      <ul className="list-disc ps-4 font-mono text-xs">
                        {updatePermissions.map((p) => (
                          <li key={p}>{p}</li>
                        ))}
                      </ul>
                    </InlineAlertDescription>
                  </InlineAlert>
                )}
              </div>
            </ConfirmDialog>
          )}
          {onOpen && (
            <Button size="sm" variant="ghost" onClick={onOpen}>
              Open
            </Button>
          )}
          <span className="flex-1" />
          {onHide && (
            <Button size="sm" variant="ghost" leadingIcon={<RiEyeOffLine aria-hidden />} onClick={onHide}>
              Hide
            </Button>
          )}
          {onRemove && (
            <ConfirmDialog
              trigger={
                <Button size="sm" variant="ghost" className="text-destructive" leadingIcon={<RiDeleteBinLine aria-hidden />}>
                  Remove
                </Button>
              }
              tone="destructive"
              title={`Remove ${name}?`}
              description="The plugin and its settings are deleted. Its UI contributions disappear after restart."
              confirmLabel="Remove"
              onConfirm={onRemove}
            />
          )}
        </div>
      </div>
    );
  }
);
InstalledExtensionCard.displayName = "InstalledExtensionCard";
