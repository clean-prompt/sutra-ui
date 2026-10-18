import * as React from "react";
import { Collapsible } from "radix-ui";
import {
  RiArrowDownSLine,
  RiCheckLine,
  RiCloseCircleLine,
  RiCloseLine,
  RiErrorWarningLine,
  RiShieldCheckLine,
  RiTimeLine,
  RiToolsLine,
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { formatDuration } from "../lib/duration";
import { Button } from "./button";
import { Spinner } from "./spinner";
import { PermissionPrompt, type PermissionDecision, type PermissionPromptProps } from "./permission-prompt";

export type ChatToolState = "pending" | "running" | "completed" | "error";

const stateMeta: Record<ChatToolState, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-muted text-muted-foreground" },
  running: { label: "Running", className: "bg-info-soft text-info-soft-foreground" },
  completed: { label: "Completed", className: "bg-success-soft text-success-soft-foreground" },
  error: { label: "Error", className: "bg-destructive-soft text-destructive-soft-foreground" },
};

export interface ChatToolStateBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  state: ChatToolState;
}

/** Status pill for a tool call. */
export const ChatToolStateBadge = React.forwardRef<HTMLSpanElement, ChatToolStateBadgeProps>(
  ({ state, className, children, ...props }, ref) => {
    const meta = stateMeta[state];
    return (
      <span
        ref={ref}
        data-state={state}
        className={cn(
          "inline-flex h-5 shrink-0 items-center gap-1 rounded-control px-1.5 text-2xs font-medium [&_svg]:size-3",
          meta.className,
          className
        )}
        {...props}
      >
        {state === "pending" && <RiTimeLine aria-hidden />}
        {state === "running" && <Spinner aria-hidden role="presentation" size="xs" className="size-3 text-current" />}
        {state === "completed" && <RiCheckLine aria-hidden />}
        {state === "error" && <RiErrorWarningLine aria-hidden />}
        {children ?? meta.label}
      </span>
    );
  }
);
ChatToolStateBadge.displayName = "ChatToolStateBadge";

function formatValue(value: unknown) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

/** "850ms", "2.0s", "12s", "1m 5s". */
const formatToolDuration = (ms: number) =>
  formatDuration(ms, { ms: true, decimals: 1, decimalsBelow: 10_000, trimZeros: false, maxUnit: "m" });

function JsonBlock({ label, value, tone }: { label: string; value: unknown; tone?: "error" }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-2xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
      <pre
        className={cn(
          "scrollbar-thin max-h-72 overflow-auto rounded-md border border-border bg-subtle p-3 font-mono text-xs leading-5 text-foreground",
          tone === "error" && "border-destructive/30 bg-destructive-soft text-destructive-soft-foreground"
        )}
      >
        <code>{formatValue(value)}</code>
      </pre>
    </div>
  );
}

export interface ChatToolProps
  extends Omit<React.ComponentPropsWithoutRef<typeof Collapsible.Root>, "title"> {
  /** Tool name, e.g. "web_search". */
  name: React.ReactNode;
  state?: ChatToolState;
  icon?: React.ReactNode;
  /** Duration in milliseconds. */
  duration?: number;
  /** Arguments passed to the tool (rendered as JSON). */
  input?: unknown;
  /** Tool result (rendered as JSON). */
  output?: unknown;
  /** Error text shown when `state` is "error". */
  errorText?: React.ReactNode;
}

/** Collapsible tool-call card with state badge, input and output. Children replace the default body. */
export const ChatTool = React.forwardRef<HTMLDivElement, ChatToolProps>(
  (
    { name, state = "completed", icon, duration, input, output, errorText, className, children, ...props },
    ref
  ) => {
    const hasBody = children != null || input !== undefined || output !== undefined || errorText != null;
    return (
      <Collapsible.Root
        ref={ref}
        data-tool-state={state}
        className={cn("w-full overflow-hidden rounded-box border border-border bg-card shadow-xs", className)}
        {...props}
      >
        <Collapsible.Trigger
          disabled={!hasBody}
          className={cn(
            "group/tool flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors enabled:hover:bg-subtle",
            focusRing
          )}
        >
          <span
            aria-hidden
            className="flex size-6 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground [&_svg]:size-3.5"
          >
            {icon ?? <RiToolsLine />}
          </span>
          <span className="min-w-0 flex-1 truncate font-mono text-[13px] font-medium text-foreground">{name}</span>
          {duration != null && state !== "running" && (
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatToolDuration(duration)}</span>
          )}
          <ChatToolStateBadge state={state} />
          {hasBody && (
            <RiArrowDownSLine
              aria-hidden
              className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]/tool:rotate-180"
            />
          )}
        </Collapsible.Trigger>
        {hasBody && (
          <Collapsible.Content className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
            <div className="flex flex-col gap-3 border-t border-border px-3 py-3">
              {children ?? (
                <>
                  {input !== undefined && <JsonBlock label="Input" value={input} />}
                  {state === "error" && errorText != null ? (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-2xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Error</span>
                      <div className="rounded-md border border-destructive/30 bg-destructive-soft p-3 text-xs leading-5 text-destructive-soft-foreground">
                        {errorText}
                      </div>
                    </div>
                  ) : (
                    output !== undefined && (
                      <JsonBlock label="Output" value={output} tone={state === "error" ? "error" : undefined} />
                    )
                  )}
                </>
              )}
            </div>
          </Collapsible.Content>
        )}
      </Collapsible.Root>
    );
  }
);
ChatTool.displayName = "ChatTool";

export type ChatToolApprovalStatus = "pending" | "approved" | "denied";

export interface ChatToolApprovalProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Tool name awaiting approval. */
  name: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Arguments the tool will run with. */
  input?: unknown;
  status?: ChatToolApprovalStatus;
  onApprove?: () => void;
  onDeny?: () => void;
  approveLabel?: string;
  denyLabel?: string;
  icon?: React.ReactNode;
  /** "numbered" renders a keyboard-driven `PermissionPrompt` (Yes / Always / No with feedback). Default "default". */
  variant?: "default" | "numbered";
  /** Numbered variant: full decision payload (choice, scope, feedback). */
  onDecision?: (decision: PermissionDecision) => void;
  /** Numbered variant: extra props for the inner `PermissionPrompt`. */
  permissionProps?: Partial<PermissionPromptProps>;
}

/** Human-in-the-loop prompt: shows the pending tool call with Approve / Deny buttons. */
export const ChatToolApproval = React.forwardRef<HTMLDivElement, ChatToolApprovalProps>(
  (
    {
      name,
      title = "Approval required",
      description,
      input,
      status = "pending",
      onApprove,
      onDeny,
      approveLabel = "Approve",
      denyLabel = "Deny",
      icon,
      variant = "default",
      onDecision,
      permissionProps,
      className,
      children,
      ...props
    },
    ref
  ) =>
    variant === "numbered" ? (
      <PermissionPrompt
        ref={ref}
        tool="mcp"
        icon={icon}
        title={
          title === "Approval required" ? (
            <>
              Allow <code className="font-mono text-[0.92em]">{name}</code> to run?
            </>
          ) : (
            title
          )
        }
        preview={
          input !== undefined || children || description ? (
            <>
              {description != null && <p className="text-sm text-muted-foreground">{description}</p>}
              {input !== undefined && <JsonBlock label="Arguments" value={input} />}
              {children}
            </>
          ) : undefined
        }
        decision={status === "pending" ? undefined : { choice: status === "approved" ? "allow" : "deny" }}
        onDecision={(d) => {
          onDecision?.(d);
          if (d.choice === "deny") onDeny?.();
          else onApprove?.();
        }}
        data-status={status}
        className={className}
        {...permissionProps}
        {...(props as Omit<PermissionPromptProps, "title">)}
      />
    ) : (
    <div
      ref={ref}
      role="group"
      data-status={status}
      className={cn(
        "w-full overflow-hidden rounded-box border bg-card shadow-xs",
        status === "pending" ? "border-warning/50" : "border-border",
        className
      )}
      {...props}
    >
      <div className="flex items-start gap-3 px-3.5 pt-3.5">
        <span
          aria-hidden
          className="flex size-7 shrink-0 items-center justify-center rounded-md bg-warning-soft text-warning-soft-foreground [&_svg]:size-4"
        >
          {icon ?? <RiShieldCheckLine />}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">
            {description ?? (
              <>
                The assistant wants to run <code className="font-mono text-[13px] text-foreground">{name}</code>.
              </>
            )}
          </p>
        </div>
      </div>
      {(input !== undefined || children) && (
        <div className="flex flex-col gap-3 px-3.5 pt-3">
          {input !== undefined && <JsonBlock label="Arguments" value={input} />}
          {children}
        </div>
      )}
      <div className="mt-3.5 flex items-center justify-end gap-2 border-t border-border bg-subtle px-3.5 py-2.5">
        {status === "pending" ? (
          <>
            <Button variant="secondary" size="sm" onClick={onDeny} leadingIcon={<RiCloseLine />}>
              {denyLabel}
            </Button>
            <Button variant="primary" size="sm" onClick={onApprove} leadingIcon={<RiCheckLine />}>
              {approveLabel}
            </Button>
          </>
        ) : (
          <span
            role="status"
            className={cn(
              "mr-auto inline-flex items-center gap-1.5 text-sm font-medium [&_svg]:size-4",
              status === "approved" ? "text-success" : "text-destructive"
            )}
          >
            {status === "approved" ? <RiCheckLine aria-hidden /> : <RiCloseCircleLine aria-hidden />}
            {status === "approved" ? "Approved" : "Denied"}
          </span>
        )}
      </div>
    </div>
    )
);
ChatToolApproval.displayName = "ChatToolApproval";
