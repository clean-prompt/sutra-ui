/** MCP server display: the McpServerCard, McpTransportBadge and `formatMcpTestResult`. */
import * as React from "react";
import {
  RiCheckLine,
  RiDeleteBinLine,
  RiErrorWarningLine,
  RiFileList3Line,
  RiFlashlightLine,
  RiLoginBoxLine,
  RiRefreshLine,
  RiServerLine,
  RiToolsLine,
} from "@remixicon/react";
import { cn } from "../../lib/cn";
import { pluralize } from "../../lib/format";
import { errorMessage, useAsyncAction } from "../../hooks/use-async-action";
import { Badge, type BadgeColor } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import { ConfirmDialog } from "../../primitives/dialog";
import { Spinner } from "../../primitives/spinner";
import { StatusBadge, type StatusBadgeStatus } from "../../primitives/status-badge";
import { type McpTransport } from "./mcp-model";

/* ------------------------------------------------------------------ */
/* McpServerCard                                                       */
/* ------------------------------------------------------------------ */

export type McpServerStatus = "connected" | "connecting" | "failed" | "disabled" | "needs-auth";

export type McpTestResult = { ok: true; tools: string[] } | { ok: false; error: string };

const transportMeta: Record<McpTransport, { label: string; color: BadgeColor }> = {
  stdio: { label: "stdio", color: "purple" },
  http: { label: "HTTP", color: "blue" },
  sse: { label: "SSE", color: "orange" },
};

const mcpStatusMeta: Record<McpServerStatus, { status: StatusBadgeStatus; label: string }> = {
  connected: { status: "online", label: "Connected" },
  connecting: { status: "processing", label: "Connecting" },
  failed: { status: "error", label: "Failed" },
  disabled: { status: "offline", label: "Disabled" },
  "needs-auth": { status: "warning", label: "Needs sign-in" },
};

export interface McpTransportBadgeProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "color"> {
  /** Transport to label (for example stdio or HTTP); sets the badge text and icon. */
  transport: McpTransport;
}

/** stdio / HTTP / SSE badge with a distinct tone each. */
export const McpTransportBadge = React.forwardRef<HTMLSpanElement, McpTransportBadgeProps>(({ transport, className, ...props }, ref) => (
  <Badge ref={ref} size="sm" variant="outline" color={transportMeta[transport].color} data-transport={transport} className={cn("font-mono", className)} {...props}>
    {transportMeta[transport].label}
  </Badge>
));
McpTransportBadge.displayName = "McpTransportBadge";

/** Format a test result as one line. */
export function formatMcpTestResult(result: McpTestResult) {
  if (!result.ok) return result.error;
  return result.tools.length ? `Tools: ${result.tools.join(", ")}` : "Connected — no tools";
}

export interface McpServerCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Server name, shown as the card title. */
  name: string;
  /** How the server is reached (shown as a transport badge). */
  transport: McpTransport;
  /**
   * Connection state: `connected`, `connecting`, `failed`, `disabled` or `needs-auth`; sets the status pill and the
   * actions offered.
   */
  status: McpServerStatus;
  /** Command line or URL. */
  endpoint?: string;
  /** Number of tools the server exposes, shown as a count. */
  toolCount?: number;
  /** Most recent error message, shown when the server is in an error state. */
  lastError?: string;
  /** Runs a connection test and resolves with its result; shows a Test button when set. */
  onTest?: () => Promise<McpTestResult>;
  /** Start OAuth. Resolve when signed in; reject to show the retry state. */
  onConnect?: () => Promise<void>;
  /** Called with the new state when the user presses Enable or Disable; the button is hidden when unset. */
  onEnabledChange?: (enabled: boolean) => void;
  /** Called after the user confirms removal; may return a promise. */
  onRemove?: () => void | Promise<void>;
  /** Called when the user presses View logs; the button is hidden when unset. */
  onViewLogs?: () => void;
}

/** MCP server summary with transport, status, tool count, last error and Test / Connect / Disable / Remove / Logs actions. */
export const McpServerCard = React.forwardRef<HTMLDivElement, McpServerCardProps>(
  (
    { name, transport, status, endpoint, toolCount, lastError, onTest, onConnect, onEnabledChange, onRemove, onViewLogs, className, ...props },
    ref
  ) => {
    const [testing, setTesting] = React.useState(false);
    const [result, setResult] = React.useState<McpTestResult | null>(null);
    const [oauth, setOauth] = React.useState<"idle" | "waiting" | "failed">("idle");
    const [oauthError, setOauthError] = React.useState<string | null>(null);
    const titleId = React.useId();
    const meta = mcpStatusMeta[status];
    const disabled = status === "disabled";

    const test = async () => {
      if (!onTest) return;
      setTesting(true);
      setResult(null);
      try {
        setResult(await onTest());
      } catch (e) {
        setResult({ ok: false, error: errorMessage(e, "Test failed") });
      } finally {
        setTesting(false);
      }
    };
    // Each Connect / Retry supersedes the previous attempt, and Cancel drops it, so a stale result is ignored.
    const connectAction = useAsyncAction(() => onConnect?.(), {
      onSuccess: () => setOauth("idle"),
      onError: (e) => {
        setOauth("failed");
        setOauthError(errorMessage(e, "Sign-in didn't complete"));
      },
    });
    const connect = () => {
      if (!onConnect) return;
      setOauth("waiting");
      setOauthError(null);
      void connectAction.run();
    };
    const cancelConnect = () => {
      connectAction.reset();
      setOauth("idle");
    };

    return (
      <div
        ref={ref}
        role="group"
        aria-labelledby={titleId}
        data-slot="mcp-server-card"
        data-status={status}
        className={cn("space-y-3 rounded-box border border-border bg-card p-4 shadow-xs", disabled && "bg-subtle", className)}
        {...props}
      >
        <div className="flex items-start gap-3">
          <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-box border border-border bg-background text-muted-foreground [&_svg]:size-[18px]">
            <RiServerLine aria-hidden />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 id={titleId} className="truncate font-mono text-sm font-semibold text-foreground">
                {name}
              </h3>
              <McpTransportBadge transport={transport} />
              <StatusBadge status={meta.status} label={meta.label} size="sm" />
            </div>
            {endpoint && <p className="truncate font-mono text-xs text-muted-foreground" title={endpoint}>{endpoint}</p>}
          </div>
          {toolCount != null && (
            <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground tabular-nums">
              <RiToolsLine aria-hidden className="size-3.5" />
              {toolCount} {pluralize(toolCount, "tool")}
            </span>
          )}
        </div>

        {lastError && status === "failed" && (
          <p className="flex items-start gap-1.5 rounded-md bg-destructive-soft px-2.5 py-1.5 font-mono text-xs text-destructive-soft-foreground">
            <RiErrorWarningLine aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            <span className="min-w-0 break-words">
              <span className="sr-only">Last error: </span>
              {lastError}
            </span>
          </p>
        )}

        {result && (
          <p
            role="status"
            data-test-result={result.ok ? (result.tools.length ? "tools" : "empty") : "error"}
            className={cn(
              "flex items-start gap-1.5 rounded-md px-2.5 py-1.5 text-xs",
              result.ok ? "bg-success-soft text-success-soft-foreground" : "bg-destructive-soft text-destructive-soft-foreground"
            )}
          >
            {result.ok ? <RiCheckLine aria-hidden className="mt-0.5 size-3.5 shrink-0" /> : <RiErrorWarningLine aria-hidden className="mt-0.5 size-3.5 shrink-0" />}
            <span className="min-w-0 break-words font-mono">{formatMcpTestResult(result)}</span>
          </p>
        )}

        {oauth !== "idle" && (
          <div
            role="status"
            data-oauth={oauth}
            className={cn(
              "flex flex-wrap items-center gap-2 rounded-md px-2.5 py-1.5 text-xs",
              oauth === "waiting" ? "bg-info-soft text-info-soft-foreground" : "bg-warning-soft text-warning-soft-foreground"
            )}
          >
            {oauth === "waiting" ? <Spinner size="xs" /> : <RiErrorWarningLine aria-hidden className="size-3.5" />}
            <span className="flex-1">{oauth === "waiting" ? "Waiting for sign-in in your browser…" : oauthError}</span>
            <Button size="xs" variant="ghost" leadingIcon={<RiRefreshLine aria-hidden />} onClick={connect}>
              Retry
            </Button>
            <Button size="xs" variant="ghost" onClick={cancelConnect}>
              Cancel
            </Button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          {onTest && (
            <Button size="sm" variant="outline" leadingIcon={<RiFlashlightLine aria-hidden />} onClick={test} loading={testing} disabled={disabled}>
              Test
            </Button>
          )}
          {onConnect && (status === "needs-auth" || status === "failed") && oauth === "idle" && (
            <Button size="sm" variant="soft" leadingIcon={<RiLoginBoxLine className="rtl:-scale-x-100" aria-hidden />} onClick={connect}>
              Connect
            </Button>
          )}
          {onViewLogs && (
            <Button size="sm" variant="ghost" leadingIcon={<RiFileList3Line aria-hidden />} onClick={onViewLogs}>
              View logs
            </Button>
          )}
          <span className="flex-1" />
          {onEnabledChange && (
            <Button size="sm" variant="ghost" onClick={() => onEnabledChange(disabled)}>
              {disabled ? "Enable" : "Disable"}
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
              description="The agent loses access to this server's tools. You can add it again later."
              confirmLabel="Remove"
              onConfirm={onRemove}
            />
          )}
        </div>
      </div>
    );
  }
);
McpServerCard.displayName = "McpServerCard";
