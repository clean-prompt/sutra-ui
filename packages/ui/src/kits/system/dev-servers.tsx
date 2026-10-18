import * as React from "react";
import { RiFlashlightFill, RiFolder3Line, RiMoonLine, RiStopCircleLine } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { accentClasses, accentStyle, type Accent } from "../../lib/accent";
import { formatList, pluralize } from "../../lib/format";
import {
  classifyDevServer,
  formatMemory,
  summarizeIdleServers,
  type DevServerActivity,
  type DevServerProject,
  type IdleServerSummary,
} from "../../lib/system-monitor";
import type { TimeInput } from "../../lib/time";
import { Button } from "../../primitives/button";
import { ConfirmDialog } from "../../primitives/dialog";
import { InlineAlert, InlineAlertDescription, InlineAlertTitle } from "../../primitives/inline-alert";
import { PortBadgeList } from "../../primitives/port-badge";
import { Skeleton } from "../../primitives/progress";
import { StatusBadge } from "../../primitives/status-badge";

export {
  classifyDevServer,
  summarizeIdleServers,
  DEFAULT_IDLE_AFTER_MS,
  type DevServerActivity,
  type DevServerClassifyOptions,
  type DevServerProject,
  type DevServerState,
  type IdleServerSummary,
} from "../../lib/system-monitor";

/** "Stopping them frees 1.37 GB and ports 3000, 4321." */
export function describeIdleSavings(summary: IdleServerSummary, formatBytes: (bytes: number) => string = formatMemory): string {
  const ports = summary.ports.length > 0 ? ` and ${pluralize(summary.ports.length, "port")} ${summary.ports.join(", ")}` : "";
  return `Stopping ${summary.count === 1 ? "it" : "them"} frees ${formatBytes(summary.memoryBytes)}${ports}.`;
}

export interface DevServerListProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  projects: DevServerProject[];
  /** Stops one server (after confirmation). May return a promise; the dialog waits for it. */
  onStop?: (id: string) => void | Promise<void>;
  /** Stops every idle server (after confirmation from the banner's "Stop All…"). */
  onStopIdle?: (ids: string[]) => void | Promise<void>;
  /** Makes the project name a button. */
  onOpen?: (id: string) => void;
  /** Reference time for idle and uptime text (pass it for deterministic output). Default: render time. */
  now?: TimeInput;
  /** A `running` server idle this long counts as idle. Default 30 minutes. */
  idleAfterMs?: number;
  /** Show the "running but idle" banner when some servers are idle. Default true. */
  showIdleBanner?: boolean;
  /** Categorical colour for icons and port badges. Default "orange". */
  accent?: Accent;
  /** Memory text. Default decimal units ("458 MB", "1.18 GB"). */
  formatBytes?: (bytes: number) => string;
  /** Accessible name of the list. Default "Dev servers". */
  label?: string;
  emptyState?: React.ReactNode;
  /** Data is on its way. With no projects yet the list shows placeholder rows; with projects the root is only marked busy. */
  loading?: boolean;
  /** Placeholder rows while loading. Default 3. */
  loadingRows?: number;
}

function subtitle(project: DevServerProject): string | undefined {
  if (project.runtime) return project.runtime;
  if (typeof project.processes === "number" && Number.isFinite(project.processes)) {
    return `${project.processes} ${pluralize(project.processes, "process", "processes")}`;
  }
  return undefined;
}

function ActivityPill({ activity }: { activity: DevServerActivity }) {
  if (!activity.label) return null;
  const working = activity.kind === "working";
  return (
    <StatusBadge
      data-slot="dev-server-activity"
      data-kind={activity.kind}
      tone={working ? "success" : "neutral"}
      icon={working ? <RiFlashlightFill /> : <RiMoonLine />}
      label={activity.label}
      className={cn("shrink-0", !working && "text-muted-foreground")}
    />
  );
}

/** Running dev servers by project: ports, activity ("working", "idle 2 hours"), memory, and a banner to stop idle ones. */
export const DevServerList = React.forwardRef<HTMLDivElement, DevServerListProps>(
  (
    {
      projects,
      onStop,
      onStopIdle,
      onOpen,
      now: nowProp,
      idleAfterMs,
      showIdleBanner = true,
      accent = "orange",
      formatBytes = formatMemory,
      label = "Dev servers",
      emptyState,
      loading = false,
      loadingRows = 3,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const skeleton = loading && projects.length === 0;
    const now = nowProp ?? Date.now();
    const options = { now, idleAfterMs };
    const rows = projects.map((project) => ({ project, activity: classifyDevServer(project, options) }));
    const idle = summarizeIdleServers(projects, options);

    return (
      <div
        ref={ref}
        data-slot="dev-server-list"
        aria-busy={loading || undefined}
        style={accentStyle(accent, style)}
        className={cn("flex flex-col gap-1 text-sm", className)}
        {...props}
      >
        {!skeleton && showIdleBanner && idle.count > 0 ? (
          <InlineAlert
            tone="neutral"
            data-slot="dev-server-idle-banner"
            icon={
              <span className={cn("inline-flex size-8 items-center justify-center rounded-md", accentClasses.soft)}>
                <RiMoonLine />
              </span>
            }
            className="mb-1 items-center border-transparent bg-[color-mix(in_oklab,var(--sutra-accent,var(--primary))_10%,transparent)] [&>[data-slot=inline-alert-icon]]:mt-0"
            action={
              onStopIdle ? (
                <ConfirmDialog
                  title={`Stop ${idle.count} idle ${pluralize(idle.count, "dev server")}?`}
                  description={`${formatList(idle.names)} will be stopped. ${describeIdleSavings(idle, formatBytes)}`}
                  confirmLabel="Stop All"
                  tone="destructive"
                  onConfirm={() => onStopIdle(idle.ids)}
                  trigger={
                    <Button
                      size="sm"
                      className={cn(accentClasses.solid, "text-white hover:bg-[color-mix(in_oklab,var(--sutra-accent,var(--primary))_85%,black)]")}
                    >
                      Stop All…
                    </Button>
                  }
                />
              ) : undefined
            }
          >
            <InlineAlertTitle>
              {idle.count} {pluralize(idle.count, "dev server")} {idle.count === 1 ? "is" : "are"} running but idle
            </InlineAlertTitle>
            <InlineAlertDescription className="text-muted-foreground opacity-100">
              {describeIdleSavings(idle, formatBytes)}
            </InlineAlertDescription>
          </InlineAlert>
        ) : null}

        {skeleton ? (
          <>
            <span className="sr-only">Loading dev servers…</span>
            <ul aria-hidden className="m-0 flex list-none flex-col p-0">
              {Array.from({ length: Math.max(0, loadingRows) }, (_, i) => (
                <li key={i} data-slot="dev-server-skeleton-row" className="flex items-center gap-3 rounded-box px-3 py-3">
                  <Skeleton className="size-8 shrink-0 rounded-md" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Skeleton shape="text" className="w-32 max-w-full" />
                    <Skeleton shape="text" className="h-[0.7em] w-20 max-w-full" />
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Skeleton data-slot="dev-server-skeleton-port" className="h-6 w-12 rounded-control" />
                    <Skeleton data-slot="dev-server-skeleton-pill" className="h-6 w-20 rounded-full" />
                  </div>
                  <div className="flex w-20 shrink-0 justify-end">
                    <Skeleton shape="text" className="w-14" />
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : rows.length === 0 ? (
          <div data-slot="dev-server-empty" className="px-3 py-8 text-center text-muted-foreground">
            {emptyState ?? "No dev servers running"}
          </div>
        ) : (
          <ul role="list" aria-label={label} className="m-0 flex list-none flex-col p-0">
            {rows.map(({ project, activity }) => {
              const sub = subtitle(project);
              return (
                <li
                  key={project.id}
                  data-slot="dev-server-row"
                  data-activity={activity.kind}
                  className="group/row flex items-center gap-3 rounded-box px-3 py-3 transition-colors hover:bg-muted/50"
                >
                  <span aria-hidden className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-md [&_svg]:size-4", accentClasses.soft)}>
                    <RiFolder3Line />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    {onOpen ? (
                      <button
                        type="button"
                        onClick={() => onOpen(project.id)}
                        className={cn("self-start truncate rounded-xs text-left font-medium text-foreground hover:underline", focusRing)}
                      >
                        {project.name}
                      </button>
                    ) : (
                      <span className="truncate font-medium text-foreground">{project.name}</span>
                    )}
                    {sub ? <span className="truncate text-xs text-muted-foreground">{sub}</span> : null}
                  </span>
                  <span className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                    {project.ports && project.ports.length > 0 ? (
                      <PortBadgeList ports={project.ports} label={`${project.name} ports`} size="md" />
                    ) : null}
                    <ActivityPill activity={activity} />
                  </span>
                  <span data-slot="dev-server-memory" className="w-20 shrink-0 text-right font-semibold tabular-nums text-foreground">
                    {formatBytes(project.memoryBytes)}
                  </span>
                  {onStop ? (
                    <ConfirmDialog
                      title={`Stop ${project.name}?`}
                      description={`Its processes will be stopped${project.ports && project.ports.length > 0 ? `, freeing ${pluralize(project.ports.length, "port")} ${project.ports.join(", ")}` : ""}.`}
                      confirmLabel="Stop"
                      tone="destructive"
                      onConfirm={() => onStop(project.id)}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Stop ${project.name}`}
                          className="shrink-0 text-muted-foreground opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 [@media(hover:none)]:opacity-100"
                        >
                          <RiStopCircleLine aria-hidden />
                        </Button>
                      }
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }
);
DevServerList.displayName = "DevServerList";
