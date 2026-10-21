/* Agent browser, one module per family: `-model` (types and URL helpers), `-console`, `-annotations` and `-consent`; the pane itself stays here.
   This path re-exports every public name; inside the package import the per-part modules. */

import * as React from "react";
import { RiArrowLeftLine, RiArrowRightLine, RiCloseLine, RiComputerLine, RiGlobalLine, RiHand, RiLockLine, RiLockUnlockLine, RiRefreshLine, RiRobot2Line } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { Progress } from "../../primitives/progress";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Button } from "../../primitives/button";
import { type BrowserSecurity, type BrowserController, inferBrowserSecurity, normalizeBrowserInput } from "./agent-browser-model";

const securityMeta: Record<BrowserSecurity, { label: string; icon: React.ReactNode; className: string }> = {
  secure: { label: "Secure connection", icon: <RiLockLine aria-hidden />, className: "text-success" },
  insecure: { label: "Not secure", icon: <RiLockUnlockLine aria-hidden />, className: "text-destructive" },
  local: { label: "Local page", icon: <RiComputerLine aria-hidden />, className: "text-info" },
  unknown: { label: "Page", icon: <RiGlobalLine aria-hidden />, className: "text-muted-foreground" },
};

/* ------------------------------------------------------------------ */
/* AgentBrowserPane                                                    */
/* ------------------------------------------------------------------ */

export interface AgentBrowserPaneProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Current URL. Display state only: the pane never loads it. */
  url?: string;
  /** Page title, shown as a tooltip on the URL field. */
  pageTitle?: string;
  /** Override the inferred security indicator. */
  security?: BrowserSecurity;
  /** Shows the page as loading: the reload button becomes Stop and the progress bar appears. */
  loading?: boolean;
  /** 0–100. Indeterminate while `loading` and unset. */
  progress?: number;
  /** Enables the back button. */
  canGoBack?: boolean;
  /** Enables the forward button. */
  canGoForward?: boolean;
  /** Called when the user presses Back. */
  onBack?: () => void;
  /** Called when the user presses Forward. */
  onForward?: () => void;
  /** Called when the user presses Reload. */
  onReload?: () => void;
  /** Called when the user presses Stop while `loading`. */
  onStop?: () => void;
  /** Called with the normalized URL when the user submits the address bar. */
  onNavigate?: (url: string) => void;
  /** Who holds the control lease. */
  controller?: BrowserController;
  /** Initial controlling party (`agent` or `user`) when `controller` is not controlled. */
  defaultController?: BrowserController;
  /** Called with the new controller when the user takes over or hands control back. */
  onControllerChange?: (controller: BrowserController) => void;
  /** Name used in the control banner ("<name> is driving"). Default "The agent". */
  agentName?: string;
  /** What the agent is doing right now, e.g. "Clicking “Sign in”". */
  agentActivity?: React.ReactNode;
  /** Extra toolbar content after the URL field. */
  toolbarExtra?: React.ReactNode;
  /** Rendered under the viewport, e.g. a `BrowserConsole`. */
  footer?: React.ReactNode;
  /** Extra classes for the viewport that wraps `children`. */
  viewportClassName?: string;
  /** The viewport (iframe, screenshot, canvas…) supplied by the app. */
  children?: React.ReactNode;
}

/** Agent-driven browser surface: address bar, lease banner, loading bar and an app-provided viewport. */
export const AgentBrowserPane = React.forwardRef<HTMLDivElement, AgentBrowserPaneProps>(
  (
    {
      url = "",
      pageTitle,
      security: securityProp,
      loading = false,
      progress,
      canGoBack = false,
      canGoForward = false,
      onBack,
      onForward,
      onReload,
      onStop,
      onNavigate,
      controller: controllerProp,
      defaultController = "user",
      onControllerChange,
      agentName = "Agent",
      agentActivity,
      toolbarExtra,
      footer,
      viewportClassName,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const [controller, setController] = useControllableState<BrowserController>({
      value: controllerProp,
      defaultValue: defaultController,
      onChange: onControllerChange,
    });
    const agentDriving = controller === "agent";
    const [draft, setDraft] = React.useState(url);
    const [editing, setEditing] = React.useState(false);
    React.useEffect(() => {
      if (!editing) setDraft(url);
    }, [url, editing]);
    const security = securityProp ?? inferBrowserSecurity(url);
    const sec = securityMeta[security];
    const lockedTitle = agentDriving ? `${agentName} is driving. Take over to browse.` : undefined;

    const submit = (e: React.FormEvent) => {
      e.preventDefault();
      if (agentDriving) return;
      const next = normalizeBrowserInput(draft);
      if (!next) return;
      setEditing(false);
      onNavigate?.(next);
    };

    return (
      <div
        ref={ref}
        data-slot="agent-browser"
        data-controller={controller}
        className={cn(
          "@container flex min-h-0 flex-col overflow-hidden rounded-box border border-border bg-card shadow-xs",
          agentDriving && "border-primary/50",
          className
        )}
        {...props}
      >
        <div className="relative flex flex-wrap items-center gap-1 border-b border-border bg-subtle px-2 py-1.5 @lg:flex-nowrap">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Back"
            title={lockedTitle ?? "Back"}
            disabled={!canGoBack || agentDriving}
            onClick={onBack}
          >
            <RiArrowLeftLine className="rtl:-scale-x-100" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Forward"
            title={lockedTitle ?? "Forward"}
            disabled={!canGoForward || agentDriving}
            onClick={onForward}
          >
            <RiArrowRightLine className="rtl:-scale-x-100" aria-hidden />
          </Button>
          {loading ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Stop loading"
              title={lockedTitle ?? "Stop loading"}
              disabled={agentDriving}
              onClick={onStop}
            >
              <RiCloseLine aria-hidden />
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Reload"
              title={lockedTitle ?? "Reload"}
              disabled={agentDriving}
              onClick={onReload}
            >
              <RiRefreshLine aria-hidden />
            </Button>
          )}
          <form role="search" aria-label="Address bar" onSubmit={submit} className="order-last min-w-0 basis-full @lg:order-none @lg:basis-0 @lg:flex-1">
            <div
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-control border border-input bg-background px-2 text-sm shadow-xs",
                "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/20",
                agentDriving && "opacity-80"
              )}
              title={pageTitle}
            >
              <span
                role="img"
                aria-label={sec.label}
                title={sec.label}
                data-security={security}
                className={cn("flex shrink-0 [&_svg]:size-3.5", sec.className)}
              >
                {sec.icon}
              </span>
              <input
                type="text"
                inputMode="url"
                spellCheck={false}
                autoComplete="off"
                aria-label="Address"
                value={draft}
                readOnly={agentDriving}
                title={lockedTitle}
                placeholder="Search or enter address"
                onFocus={() => setEditing(true)}
                onBlur={() => setEditing(false)}
                onChange={(e) => {
                  setEditing(true);
                  setDraft(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setDraft(url);
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                className="h-6 min-w-0 flex-1 truncate bg-transparent font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
          </form>
          {agentDriving && (
            <span
              data-slot="agent-driving-pill"
              className="ms-auto inline-flex h-6 max-w-full shrink-0 items-center gap-1.5 rounded-control bg-primary-soft px-2 text-xs @lg:ms-0 font-medium text-primary-soft-foreground [&_svg]:size-3.5"
            >
              <span className="relative flex size-1.5" aria-hidden>
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
              </span>
              <RiRobot2Line aria-hidden />
              {agentName} is driving
            </span>
          )}
          {toolbarExtra}
          {loading && (
            <Progress
              size="2xs"
              value={progress != null ? Math.round(progress) : null}
              aria-label="Page loading"
              className="absolute inset-x-0 bottom-0 rounded-none bg-transparent"
              indicatorClassName="rounded-none duration-300"
            />
          )}
        </div>

        <div
          role="status"
          data-slot="browser-lease"
          className={cn(
            "flex items-center gap-2 border-b border-border px-3 py-1.5 text-xs",
            agentDriving ? "bg-primary-soft/60 text-primary-soft-foreground" : "bg-background text-muted-foreground"
          )}
        >
          {agentDriving ? <RiRobot2Line className="size-3.5 shrink-0" aria-hidden /> : <RiHand className="size-3.5 shrink-0" aria-hidden />}
          <span className="min-w-0 flex-1 truncate">
            {agentDriving ? (
              <>
                <span className="font-medium">{agentName} is browsing</span>
                {agentActivity && <span className="opacity-80"> · {agentActivity}</span>}
              </>
            ) : (
              <>You’re in control. {agentName} is paused.</>
            )}
          </span>
          <Button
            type="button"
            size="xs"
            variant={agentDriving ? "secondary" : "soft"}
            onClick={() => setController(agentDriving ? "user" : "agent")}
          >
            {agentDriving ? "Take over" : "Hand back"}
          </Button>
        </div>

        <div
          data-slot="browser-viewport"
          className={cn("relative min-h-48 flex-1 overflow-hidden bg-background", viewportClassName)}
        >
          {children}
          {agentDriving && (
            <div
              aria-hidden
              data-slot="browser-agent-shield"
              className="pointer-events-auto absolute inset-0 cursor-not-allowed ring-2 ring-inset ring-primary/40"
            />
          )}
        </div>
        {footer}
      </div>
    );
  }
);
AgentBrowserPane.displayName = "AgentBrowserPane";

export * from "./agent-browser-model";
export * from "./agent-browser-console";
export * from "./agent-browser-annotations";
export * from "./agent-browser-consent";
