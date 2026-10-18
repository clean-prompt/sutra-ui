import * as React from "react";
import {
  RiCheckLine,
  RiClipboardLine,
  RiCloseLine,
  RiErrorWarningLine,
  RiExternalLinkLine,
  RiLinkUnlinkM,
  RiPlugLine,
  RiRefreshLine,
} from "@remixicon/react";
import { cn, focusRing, invalidRing } from "../lib/cn";
import { CopyButton } from "./copy-button";
import { Button } from "./button";
import { Spinner } from "./spinner";

/* ------------------------------------------------------------------ */
/* OnboardingChecklist                                                 */
/* ------------------------------------------------------------------ */

export interface OnboardingMilestone {
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  completed?: boolean;
  /** Action label. Default "Show me". */
  actionLabel?: string;
}

export interface OnboardingChecklistProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  items: OnboardingMilestone[];
  /** Default "Get started". */
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Highlighted item. Defaults to the first incomplete milestone. */
  nextId?: string;
  onShowMe?: (id: string) => void;
  onDismiss?: () => void;
}

/** Milestone checklist with completed / next / upcoming states, "Show me" actions, progress and dismiss. */
export const OnboardingChecklist = React.forwardRef<HTMLDivElement, OnboardingChecklistProps>(
  ({ items, title = "Get started", description, nextId, onShowMe, onDismiss, className, ...props }, ref) => {
    const titleId = React.useId();
    const done = items.filter((i) => i.completed).length;
    const next = nextId ?? items.find((i) => !i.completed)?.id;
    const pct = items.length ? Math.round((done / items.length) * 100) : 0;
    return (
      <div
        ref={ref}
        role="region"
        aria-labelledby={titleId}
        className={cn("w-full rounded-box border border-border bg-card p-4 shadow-xs", className)}
        {...props}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3 id={titleId} className="text-sm font-semibold text-foreground">
              {title}
            </h3>
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {done} of {items.length}
          </span>
          {onDismiss && (
            <Button variant="ghost" size="icon-xs" aria-label="Dismiss checklist" onClick={onDismiss} className="-mr-1 -mt-1">
              <RiCloseLine />
            </Button>
          )}
        </div>
        <div
          role="progressbar"
          aria-labelledby={titleId}
          aria-valuenow={done}
          aria-valuemin={0}
          aria-valuemax={items.length}
          aria-valuetext={`${done} of ${items.length} complete`}
          className="mt-3 h-1 overflow-hidden rounded-full bg-muted"
        >
          <span className="block h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${pct}%` }} />
        </div>
        <ol className="mt-3 flex flex-col gap-1">
          {items.map((item, i) => {
            const state = item.completed ? "completed" : item.id === next ? "next" : "upcoming";
            return (
              <li
                key={item.id}
                data-state={state}
                aria-current={state === "next" ? "step" : undefined}
                className={cn(
                  "flex items-start gap-3 rounded-control px-2 py-2",
                  state === "next" && "bg-primary-soft/60 ring-1 ring-primary/20"
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-2xs font-semibold",
                    state === "completed" && "bg-success text-success-foreground",
                    state === "next" && "bg-primary text-primary-foreground",
                    state === "upcoming" && "border border-border-strong text-muted-foreground"
                  )}
                >
                  {state === "completed" ? <RiCheckLine className="size-3.5" /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm", state === "completed" ? "text-muted-foreground line-through" : "font-medium text-foreground")}>
                    {item.title}
                    <span className="sr-only">
                      {state === "completed" ? " (completed)" : state === "next" ? " (next)" : ""}
                    </span>
                  </p>
                  {item.description && state !== "completed" && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                  )}
                </div>
                {onShowMe && !item.completed && (
                  <Button
                    variant={state === "next" ? "primary" : "ghost"}
                    size="xs"
                    onClick={() => onShowMe(item.id)}
                    aria-label={`${item.actionLabel ?? "Show me"}: ${typeof item.title === "string" ? item.title : `step ${i + 1}`}`}
                  >
                    {item.actionLabel ?? "Show me"}
                  </Button>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    );
  }
);
OnboardingChecklist.displayName = "OnboardingChecklist";

/* ------------------------------------------------------------------ */
/* ConnectionState                                                     */
/* ------------------------------------------------------------------ */

export type ConnectionStateKind = "unresponsive" | "disconnected" | "error";

const connectionDefaults: Record<ConnectionStateKind, { title: string; description: string }> = {
  unresponsive: { title: "Host isn't responding", description: "The agent host stopped answering. It may be busy or asleep." },
  disconnected: { title: "Disconnected", description: "Lost the connection to the agent host." },
  error: { title: "Couldn't load", description: "Something went wrong while loading this view." },
};

export interface ConnectionStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  state: ConnectionStateKind;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Shows a spinner in place of the reconnect link. */
  reconnecting?: boolean;
  onReconnect?: () => void;
  onRetry?: () => void;
  /** Error details shown in a mono block (error state). */
  details?: string;
  /** Fill the parent panel and center the content. Default true. */
  fullPanel?: boolean;
}

/** Full-panel host states: unresponsive / disconnected (reconnect link + spinner) and load error (retry). */
export const ConnectionState = React.forwardRef<HTMLDivElement, ConnectionStateProps>(
  (
    { state, title, description, reconnecting, onReconnect, onRetry, details, fullPanel = true, className, ...props },
    ref
  ) => {
    const d = connectionDefaults[state];
    const isError = state === "error";
    const Icon = isError ? RiErrorWarningLine : state === "disconnected" ? RiLinkUnlinkM : RiPlugLine;
    return (
      <div
        ref={ref}
        role={isError ? "alert" : "status"}
        data-state={state}
        className={cn(
          "flex flex-col items-center justify-center gap-3 p-6 text-center",
          fullPanel && "h-full min-h-60 w-full",
          className
        )}
        {...props}
      >
        <span
          aria-hidden
          className={cn(
            "flex size-10 items-center justify-center rounded-full",
            isError ? "bg-destructive-soft text-destructive-soft-foreground" : "bg-muted text-muted-foreground"
          )}
        >
          <Icon className="size-5" />
        </span>
        <div className="max-w-xs space-y-1">
          <p className="text-sm font-semibold text-foreground">{title ?? d.title}</p>
          <p className="text-xs text-muted-foreground">{description ?? d.description}</p>
        </div>
        {details && (
          <pre className="max-w-sm overflow-x-auto whitespace-pre-wrap rounded-xs bg-muted px-2 py-1 text-left font-mono text-2xs text-muted-foreground">
            {details}
          </pre>
        )}
        {!isError &&
          (reconnecting ? (
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Spinner size="xs" label="Reconnecting" />
              Reconnecting…
            </span>
          ) : (
            onReconnect && (
              <Button variant="link" size="sm" onClick={onReconnect}>
                Reconnect
              </Button>
            )
          ))}
        {isError && onRetry && (
          <Button variant="outline" size="sm" leadingIcon={<RiRefreshLine />} onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    );
  }
);
ConnectionState.displayName = "ConnectionState";

/* ------------------------------------------------------------------ */
/* PasteCodeAuth                                                       */
/* ------------------------------------------------------------------ */

export type PasteCodeAuthStatus = "idle" | "submitting" | "success" | "error";

export interface PasteCodeAuthProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSubmit" | "title"> {
  /** Sign-in URL to open in a browser. */
  url: string;
  title?: React.ReactNode;
  /** Called instead of following the link. */
  onOpenUrl?: (url: string) => void;
  /** Resolve to finish, reject (or throw) to show the error. */
  onSubmit?: (code: string) => void | Promise<void>;
  /** Return an error message for invalid codes. */
  validate?: (code: string) => string | null | undefined;
  /** Controlled status (otherwise tracked from `onSubmit`). */
  status?: PasteCodeAuthStatus;
  /** Controlled error message. */
  error?: string | null;
  submitLabel?: string;
  successText?: React.ReactNode;
}

/** Sign-in fallback: open the URL, paste the code back, submit. */
export const PasteCodeAuth = React.forwardRef<HTMLDivElement, PasteCodeAuthProps>(
  (
    {
      url,
      title = "Sign in with a code",
      onOpenUrl,
      onSubmit,
      validate,
      status: statusProp,
      error: errorProp,
      submitLabel = "Sign in",
      successText = "Signed in. You can close the browser tab.",
      className,
      ...props
    },
    ref
  ) => {
    const [code, setCode] = React.useState("");
    const [localError, setLocalError] = React.useState<string | null>(null);
    const [localStatus, setLocalStatus] = React.useState<PasteCodeAuthStatus>("idle");
    const inputId = React.useId();
    const errorId = React.useId();
    const status = statusProp ?? localStatus;
    const error = errorProp ?? localError;

    const submit = async (e?: React.FormEvent) => {
      e?.preventDefault();
      const value = code.trim();
      const message = !value ? "Enter the code from your browser" : (validate?.(value) ?? null);
      if (message) {
        setLocalError(message);
        return;
      }
      setLocalError(null);
      if (!onSubmit) return;
      try {
        setLocalStatus("submitting");
        await onSubmit(value);
        setLocalStatus("success");
      } catch (err) {
        setLocalStatus("error");
        setLocalError(err instanceof Error ? err.message : "Sign-in failed. Try again.");
      }
    };

    const paste = async () => {
      try {
        const text = await navigator.clipboard.readText();
        setCode(text.trim());
        setLocalError(null);
      } catch {
        /* clipboard read denied */
      }
    };

    if (status === "success") {
      return (
        <div ref={ref} role="status" className={cn("flex w-full items-center gap-2 rounded-box border border-border bg-card p-4 text-sm", className)} {...props}>
          <span aria-hidden className="flex size-6 items-center justify-center rounded-full bg-success text-success-foreground">
            <RiCheckLine className="size-4" />
          </span>
          {successText}
        </div>
      );
    }

    const busy = status === "submitting";
    return (
      <div ref={ref} className={cn("w-full space-y-4 rounded-box border border-border bg-card p-4 shadow-xs", className)} {...props}>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <ol className="space-y-4">
          <li className="flex gap-3">
            <span aria-hidden className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-2xs font-semibold text-primary-soft-foreground">
              1
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm text-foreground">Open this link in your browser and sign in</p>
              <div className="flex items-center gap-1.5">
                <code className="min-w-0 flex-1 truncate rounded-control border border-border bg-subtle px-2 py-1.5 font-mono text-xs text-muted-foreground" title={url}>
                  {url}
                </code>
                <CopyButton value={url} size="md" label="Copy link" copiedLabel="Link copied" />
                {onOpenUrl ? (
                  <Button variant="secondary" size="sm" trailingIcon={<RiExternalLinkLine />} onClick={() => onOpenUrl(url)}>
                    Open
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" asChild>
                    <a href={url} target="_blank" rel="noreferrer noopener">
                      Open
                      <RiExternalLinkLine aria-hidden />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </li>
          <li className="flex gap-3">
            <span aria-hidden className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-2xs font-semibold text-primary-soft-foreground">
              2
            </span>
            <form className="min-w-0 flex-1 space-y-2" onSubmit={submit} noValidate>
              <label htmlFor={inputId} className="block text-sm text-foreground">
                Paste the code shown after signing in
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  id={inputId}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    if (localError) setLocalError(null);
                  }}
                  autoComplete="one-time-code"
                  spellCheck={false}
                  placeholder="Paste code"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? errorId : undefined}
                  disabled={busy}
                  className={cn(
                    "h-8 min-w-0 flex-1 rounded-control border border-input bg-background px-2.5 font-mono text-sm shadow-xs placeholder:font-sans placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
                    focusRing,
                    invalidRing
                  )}
                />
                <Button type="button" variant="outline" size="sm" leadingIcon={<RiClipboardLine />} onClick={paste} disabled={busy}>
                  Paste
                </Button>
              </div>
              {error && (
                <p id={errorId} role="alert" className="text-xs text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" size="sm" loading={busy} className="w-full">
                {submitLabel}
              </Button>
            </form>
          </li>
        </ol>
      </div>
    );
  }
);
PasteCodeAuth.displayName = "PasteCodeAuth";
