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
import { cn, focusRing, invalidRing } from "../../lib/cn";
import { CopyButton } from "../../primitives/copy-button";
import { Button } from "../../primitives/button";
import { Spinner } from "../../primitives/spinner";
import { Progress } from "../../primitives/progress";
import { Steps } from "../../primitives/step-indicator";

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
  /** Milestones in order, each with a title, description and completed state. */
  items: OnboardingMilestone[];
  /** Default "Get started". */
  title?: React.ReactNode;
  /** Helper text under the title. */
  description?: React.ReactNode;
  /** Highlighted item. Defaults to the first incomplete milestone. */
  nextId?: string;
  /** Called with the milestone id when the user presses the action of the next milestone ("Show me"). */
  onShowMe?: (id: string) => void;
  /** Called when the user dismisses the checklist; the close button is hidden when unset. */
  onDismiss?: () => void;
}

/** Milestone checklist with completed / next / upcoming states, "Show me" actions, progress and dismiss. Built on `Steps` and `Progress`. */
export const OnboardingChecklist = React.forwardRef<HTMLDivElement, OnboardingChecklistProps>(
  ({ items, title = "Get started", description, nextId, onShowMe, onDismiss, className, ...props }, ref) => {
    const titleId = React.useId();
    const done = items.filter((i) => i.completed).length;
    const next = nextId ?? items.find((i) => !i.completed)?.id;
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
            <Button variant="ghost" size="icon-xs" aria-label="Dismiss checklist" onClick={onDismiss} className="-me-1 -mt-1">
              <RiCloseLine aria-hidden />
            </Button>
          )}
        </div>
        <Progress
          size="xs"
          value={done}
          max={Math.max(1, items.length)}
          getValueLabel={() => `${done} of ${items.length} complete`}
          aria-labelledby={titleId}
          className="mt-3"
        />
        <Steps
          aria-labelledby={titleId}
          orientation="vertical"
          size="sm"
          connector={false}
          current={next ? items.findIndex((i) => i.id === next) : items.length}
          className="mt-3 gap-1"
          steps={items.map((item, i) => {
            const state = item.completed ? "completed" : item.id === next ? "next" : "upcoming";
            return {
              id: item.id,
              status: state === "completed" ? "complete" : state === "next" ? "current" : "upcoming",
              title:
                state === "completed" ? <span className="font-normal text-muted-foreground line-through">{item.title}</span> : item.title,
              description: state === "completed" ? undefined : item.description,
              itemProps: {
                "data-state": state,
                className: cn("rounded-control px-2 py-2", state === "next" && "bg-primary-soft/60 ring-1 ring-primary/20"),
              },
              action:
                onShowMe && !item.completed ? (
                  <Button
                    variant={state === "next" ? "primary" : "ghost"}
                    size="xs"
                    onClick={() => onShowMe(item.id)}
                    aria-label={`${item.actionLabel ?? "Show me"}: ${typeof item.title === "string" ? item.title : `step ${i + 1}`}`}
                  >
                    {item.actionLabel ?? "Show me"}
                  </Button>
                ) : undefined,
            };
          })}
        />
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
  /**
   * Why the connection is shown: `unresponsive`, `disconnected` or `error`; picks the default title and description.
   */
  state: ConnectionStateKind;
  /** Replaces the default title of the state. */
  title?: React.ReactNode;
  /** Replaces the default description of the state. */
  description?: React.ReactNode;
  /** Shows a spinner in place of the reconnect link. */
  reconnecting?: boolean;
  /** Called when the user presses Reconnect; the link is hidden when unset. */
  onReconnect?: () => void;
  /** Called when the user presses Retry in the error state; the button is hidden when unset. */
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
          <pre className="max-w-sm overflow-x-auto whitespace-pre-wrap rounded-xs bg-muted px-2 py-1 text-start font-mono text-2xs text-muted-foreground">
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
          <Button variant="outline" size="sm" leadingIcon={<RiRefreshLine aria-hidden />} onClick={onRetry}>
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
  /** Heading of the card. Default "Sign in with a code". */
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
  /** Label of the submit button. Default "Sign in". */
  submitLabel?: string;
  /** Message shown once the code is accepted. Default "Signed in. You can close the browser tab.". */
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
            <RiCheckLine aria-hidden className="size-4" />
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
                  <Button variant="secondary" size="sm" trailingIcon={<RiExternalLinkLine aria-hidden />} onClick={() => onOpenUrl(url)}>
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
                <Button type="button" variant="outline" size="sm" leadingIcon={<RiClipboardLine aria-hidden />} onClick={paste} disabled={busy}>
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
