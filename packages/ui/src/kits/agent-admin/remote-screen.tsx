import * as React from "react";
import {
  RiCameraLine,
  RiCheckboxCircleFill,
  RiCloseCircleFill,
  RiFullscreenExitLine,
  RiFullscreenLine,
  RiAspectRatioLine,
  RiExternalLinkLine,
  RiQuestionFill,
  RiRefreshLine,
  RiRobot2Line,
  RiUserLine,
} from "@remixicon/react";
import { cn } from "../../lib/cn";
import { useAsyncAction } from "../../hooks/use-async-action";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Button } from "../../primitives/button";
import { Spinner } from "../../primitives/spinner";

/* ------------------------------------------------------------------ */
/* RemoteScreenViewer                                                  */
/* ------------------------------------------------------------------ */

export type RemoteScreenState = "connecting" | "live" | "paused" | "disconnected";
export type RemoteScreenController = "agent" | "user";

const stateMeta: Record<RemoteScreenState, { label: string; dot: string }> = {
  connecting: { label: "Connecting", dot: "bg-warning" },
  live: { label: "Live", dot: "bg-success" },
  paused: { label: "Paused", dot: "bg-muted-foreground" },
  disconnected: { label: "Disconnected", dot: "bg-destructive" },
};

export interface RemoteScreenViewerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  state: RemoteScreenState;
  /**
   * Your remote-desktop surface. Sutra does not bundle a VNC / RDP client: mount e.g. a noVNC
   * `RFB` canvas (or a WebRTC `<video>`) here and it is scaled into the frame.
   */
  children?: React.ReactNode;
  /** Alternative to `children`: an image stream (MJPEG URL or the latest screenshot data URL). */
  frameSrc?: string;
  /** Who holds the input lease. */
  controller?: RemoteScreenController;
  defaultController?: RemoteScreenController;
  onControllerChange?: (controller: RemoteScreenController) => void;
  /** Remote desktop width / height, used for the aspect ratio and "actual size". Default 1280×800. */
  screenWidth?: number;
  screenHeight?: number;
  /** Round-trip latency in ms. */
  latencyMs?: number;
  /** Shows a screenshot button. */
  onScreenshot?: () => void;
  /** Shows a Reconnect button while disconnected. */
  onReconnect?: () => void;
  title?: React.ReactNode;
  /** Scale-to-fit (default) or actual size with scrolling. */
  fit?: boolean;
  defaultFit?: boolean;
  onFitChange?: (fit: boolean) => void;
}

function latencyTone(ms: number) {
  return ms < 80 ? "text-success" : ms < 200 ? "text-warning" : "text-destructive";
}

/** Frame for an agent's computer-use screen: state, control lease, fit / fullscreen, latency and screenshot. Bring your own VNC canvas. */
export const RemoteScreenViewer = React.forwardRef<HTMLDivElement, RemoteScreenViewerProps>(
  (
    {
      state,
      children,
      frameSrc,
      controller: controllerProp,
      defaultController = "agent",
      onControllerChange,
      screenWidth = 1280,
      screenHeight = 800,
      latencyMs,
      onScreenshot,
      onReconnect,
      title = "Agent screen",
      fit: fitProp,
      defaultFit = true,
      onFitChange,
      className,
      ...props
    },
    ref
  ) => {
    const [controller, setController] = useControllableState<RemoteScreenController>({
      value: controllerProp,
      defaultValue: defaultController,
      onChange: onControllerChange,
    });
    const [fit, setFit] = useControllableState({ value: fitProp, defaultValue: defaultFit, onChange: onFitChange });
    const rootRef = React.useRef<HTMLDivElement>(null);
    React.useImperativeHandle(ref, () => rootRef.current as HTMLDivElement);
    const [fullscreen, setFullscreen] = React.useState(false);

    React.useEffect(() => {
      const onChange = () => setFullscreen(document.fullscreenElement === rootRef.current);
      document.addEventListener("fullscreenchange", onChange);
      return () => document.removeEventListener("fullscreenchange", onChange);
    }, []);

    const toggleFullscreen = () => {
      const el = rootRef.current;
      if (!el) return;
      if (document.fullscreenElement) void document.exitFullscreen?.();
      else if (el.requestFullscreen) void el.requestFullscreen().catch(() => {});
    };

    const meta = stateMeta[state];
    const userInControl = controller === "user";
    const canControl = state === "live" || state === "paused";

    return (
      <div
        ref={rootRef}
        data-slot="remote-screen-viewer"
        data-state={state}
        data-controller={controller}
        className={cn(
          "flex flex-col overflow-hidden rounded-box border border-border bg-card shadow-xs",
          fullscreen && "rounded-none border-0",
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <span className="truncate text-sm font-medium text-foreground">{title}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-2xs font-medium text-muted-foreground">
            <span className={cn("size-1.5 rounded-full", meta.dot, state === "live" && "motion-safe:animate-pulse")} aria-hidden />
            {meta.label}
          </span>
          {latencyMs != null && state === "live" && (
            <span className={cn("text-2xs font-medium tabular-nums", latencyTone(latencyMs))} aria-label={`Latency ${latencyMs} milliseconds`}>
              {latencyMs} ms
            </span>
          )}
          <div className="ml-auto flex items-center gap-0.5">
            {onScreenshot && (
              <Button variant="ghost" size="icon-xs" aria-label="Take screenshot" onClick={onScreenshot} disabled={state === "disconnected"}>
                <RiCameraLine aria-hidden />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={fit ? "Show actual size" : "Scale to fit"}
              aria-pressed={fit}
              onClick={() => setFit(!fit)}
            >
              <RiAspectRatioLine aria-hidden />
            </Button>
            <Button variant="ghost" size="icon-xs" aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={toggleFullscreen}>
              {fullscreen ? <RiFullscreenExitLine aria-hidden /> : <RiFullscreenLine aria-hidden />}
            </Button>
          </div>
        </div>

        <div
          className={cn("relative min-h-0 flex-1 bg-neutral-950", fit ? "overflow-hidden" : "scrollbar-thin overflow-auto")}
          style={fit ? { aspectRatio: `${screenWidth} / ${screenHeight}` } : { maxHeight: fullscreen ? undefined : 480 }}
        >
          <div
            data-slot="remote-screen-surface"
            className={cn(
              "[&>canvas]:block [&>canvas]:size-full [&>video]:block [&>video]:size-full [&>img]:block [&>img]:size-full",
              fit ? "absolute inset-0 [&>canvas]:object-contain [&>img]:object-contain [&>video]:object-contain" : "relative",
              !userInControl && "pointer-events-none",
              state === "paused" && "opacity-60 grayscale"
            )}
            style={fit ? undefined : { width: screenWidth, height: screenHeight }}
            aria-label="Remote screen"
            role="group"
          >
            {children ?? (frameSrc ? <img src={frameSrc} alt="" draggable={false} /> : null)}
          </div>
          {state !== "live" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-950/60 text-sm text-white">
              {state === "connecting" && (
                <>
                  <Spinner label="" />
                  Connecting to the agent's screen…
                </>
              )}
              {state === "paused" && <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-medium">Stream paused</span>}
              {state === "disconnected" && (
                <>
                  <span>Screen disconnected</span>
                  {onReconnect && (
                    <Button size="sm" variant="inverse" leadingIcon={<RiRefreshLine aria-hidden />} onClick={onReconnect}>
                      Reconnect
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div
          role="status"
          data-slot="remote-screen-lease"
          className={cn(
            "flex items-center gap-2 border-t px-3 py-2 text-sm",
            userInControl ? "border-primary/30 bg-primary-soft text-primary-soft-foreground" : "border-border bg-subtle text-foreground"
          )}
        >
          {userInControl ? <RiUserLine aria-hidden className="size-4" /> : <RiRobot2Line aria-hidden className="size-4" />}
          <span className="flex-1 font-medium">{userInControl ? "You're in control" : "Agent is in control"}</span>
          <Button
            size="xs"
            variant={userInControl ? "secondary" : "primary"}
            disabled={!canControl}
            onClick={() => setController(userInControl ? "agent" : "user")}
          >
            {userInControl ? "Hand back" : "Take over"}
          </Button>
        </div>
      </div>
    );
  }
);
RemoteScreenViewer.displayName = "RemoteScreenViewer";

/* ------------------------------------------------------------------ */
/* PermissionPreflightCard                                             */
/* ------------------------------------------------------------------ */

export type OsPermissionState = "granted" | "denied" | "unknown";

export interface OsPermission {
  id: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  state: OsPermissionState;
  /** Optional permissions don't block the "ready" state. */
  optional?: boolean;
}

export interface PermissionPreflightCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  permissions: OsPermission[];
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Opens the OS settings pane for a permission. */
  onOpenSettings?: (id: string) => void;
  /** Re-queries permission state. The button spins until a returned promise settles. */
  onRecheck?: () => void | Promise<void>;
}

const permIcon: Record<OsPermissionState, { Icon: typeof RiCheckboxCircleFill; className: string; label: string }> = {
  granted: { Icon: RiCheckboxCircleFill, className: "text-success", label: "Granted" },
  denied: { Icon: RiCloseCircleFill, className: "text-destructive", label: "Denied" },
  unknown: { Icon: RiQuestionFill, className: "text-muted-foreground", label: "Not checked" },
};

/** OS permission checklist (screen recording, accessibility, microphone…) with open-settings and re-check. */
export const PermissionPreflightCard = React.forwardRef<HTMLDivElement, PermissionPreflightCardProps>(
  (
    {
      permissions,
      title = "Computer use permissions",
      description = "The agent needs these macOS permissions to see and control the screen.",
      onOpenSettings,
      onRecheck,
      className,
      ...props
    },
    ref
  ) => {
    const { run: recheck, busy: checking } = useAsyncAction(onRecheck);
    const granted = permissions.filter((p) => p.state === "granted").length;
    const ready = permissions.every((p) => p.optional || p.state === "granted");
    const titleId = React.useId();

    return (
      <div
        ref={ref}
        role="group"
        aria-labelledby={titleId}
        data-slot="permission-preflight-card"
        data-ready={ready || undefined}
        className={cn("flex flex-col gap-3 rounded-box border border-border bg-card p-4 shadow-xs", className)}
        {...props}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <h3 id={titleId} className="text-sm font-semibold text-foreground">
              {title}
            </h3>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          {onRecheck && (
            <Button size="xs" variant="secondary" leadingIcon={<RiRefreshLine aria-hidden />} loading={checking} onClick={() => void recheck()}>
              Re-check
            </Button>
          )}
        </div>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {permissions.map((p) => {
            const m = permIcon[p.state];
            return (
              <li key={p.id} data-permission={p.id} data-state={p.state} className="flex items-center gap-3 px-3 py-2">
                <m.Icon role="img" aria-label={m.label} className={cn("size-5 shrink-0", m.className)} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {p.label}
                    {p.optional && <span className="ml-1.5 text-2xs font-normal text-muted-foreground">Optional</span>}
                  </p>
                  {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                </div>
                {p.state !== "granted" && onOpenSettings && (
                  <Button size="xs" variant="ghost" trailingIcon={<RiExternalLinkLine aria-hidden />} onClick={() => onOpenSettings(p.id)}>
                    Open settings
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
        <p role="status" className={cn("text-xs font-medium", ready ? "text-success" : "text-muted-foreground")}>
          {ready ? "All set. The agent can use this computer." : `${granted} of ${permissions.length} granted`}
        </p>
      </div>
    );
  }
);
PermissionPreflightCard.displayName = "PermissionPreflightCard";
