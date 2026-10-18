import * as React from "react";
import { RiInboxLine } from "@remixicon/react";
import { cn, type Size } from "../lib/cn";
import { normalizeTone } from "../lib/tone";
import { FeaturedIcon } from "../assets/icons";
import { EmptyStateIllustration, type EmptyStateIllustrationVariant } from "../assets/misc";
import { Spinner } from "./spinner";

/* ------------------------------------------------------------------ */
/* EmptyState                                                          */
/* ------------------------------------------------------------------ */

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** Icon shown in a ringed featured circle (default: inbox). Ignored when `illustration` is set. */
  icon?: React.ReactNode;
  /** An `EmptyStateIllustration` variant name, or any custom node. */
  illustration?: EmptyStateIllustrationVariant | React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Buttons or links under the text. */
  actions?: React.ReactNode;
  size?: Size;
  /** `dashed` draws a dashed bordered drop-area style box. */
  variant?: "default" | "dashed";
}

const illustrationVariants = new Set<string>(["search", "inbox", "files", "error", "success", "cloud"]);

const sizes: Record<Size, { root: string; title: string; desc: string; icon: "md" | "lg" | "xl"; art: number }> = {
  sm: { root: "gap-2 px-4 py-6", title: "text-sm", desc: "text-xs", icon: "md", art: 112 },
  md: { root: "gap-3 px-6 py-10", title: "text-base", desc: "text-sm", icon: "lg", art: 144 },
  lg: { root: "gap-4 px-8 py-14", title: "text-lg", desc: "text-sm", icon: "xl", art: 176 },
};

/** Placeholder for an empty list, search or first-run screen. */
export const EmptyState = React.forwardRef<HTMLElement, EmptyStateProps>(
  ({ icon, illustration, title, description, actions, size = "md", variant = "default", className, children, ...props }, ref) => {
    const id = React.useId();
    const s = sizes[size];
    let art: React.ReactNode;
    if (typeof illustration === "string" && illustrationVariants.has(illustration)) {
      art = <EmptyStateIllustration variant={illustration as EmptyStateIllustrationVariant} size={s.art} aria-hidden />;
    } else if (illustration != null && illustration !== false) {
      art = illustration;
    } else {
      art = (
        <FeaturedIcon variant="outline-ring" color="neutral" size={s.icon}>
          {icon ?? <RiInboxLine aria-hidden />}
        </FeaturedIcon>
      );
    }
    return (
      <section
        ref={ref}
        aria-labelledby={id}
        data-slot="empty-state"
        className={cn(
          "flex w-full flex-col items-center text-center",
          s.root,
          variant === "dashed" && "rounded-box border-2 border-dashed border-border bg-subtle/50",
          className
        )}
        {...props}
      >
        <div className="mb-1">{art}</div>
        <div className="flex max-w-sm flex-col gap-1">
          <h3 id={id} className={cn("font-semibold tracking-tight text-foreground", s.title)}>
            {title}
          </h3>
          {description != null && <p className={cn("text-balance text-muted-foreground", s.desc)}>{description}</p>}
        </div>
        {actions != null && <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{actions}</div>}
        {children}
      </section>
    );
  }
);
EmptyState.displayName = "EmptyState";

/* ------------------------------------------------------------------ */
/* Note                                                                */
/* ------------------------------------------------------------------ */

/** Canonical tones: `neutral` and `destructive`. `default`, `error` and `busy` are deprecated aliases. */
export type NoteTone = "neutral" | "destructive" | "default" | "error" | "busy";

export interface NoteProps extends React.HTMLAttributes<HTMLDivElement> {
  /** `neutral` (default) or `destructive`. Legacy `default` / `error` are accepted; `busy` is the same as `loading`. */
  tone?: NoteTone;
  /** Shows a spinner and marks the note `aria-busy`. */
  loading?: boolean;
  /** @deprecated Use `loading`. */
  busy?: boolean;
  align?: "center" | "start";
  icon?: React.ReactNode;
}

/** The quiet line a screen says while working or when there is nothing here: small, grey, unalarming. */
export const Note = React.forwardRef<HTMLDivElement, NoteProps>(
  ({ tone: toneProp, loading: loadingProp, busy, align = "center", icon, className, children, ...props }, ref) => {
    const loading = Boolean(loadingProp ?? busy) || toneProp === "busy";
    const destructive = !loading && normalizeTone(toneProp) === "destructive";
    return (
      <div
        ref={ref}
        role={destructive ? "alert" : "status"}
        aria-busy={loading || undefined}
        data-slot="note"
        data-tone={destructive ? "destructive" : "neutral"}
        data-loading={loading || undefined}
        className={cn(
          "flex items-center gap-2 py-3 text-sm",
          align === "center" ? "justify-center text-center" : "justify-start text-left",
          destructive ? "text-destructive" : "text-muted-foreground",
          className
        )}
        {...props}
      >
        {loading ? <Spinner size="xs" variant="ring" role="none" aria-hidden className="text-current" /> : icon}
        <span className={cn(loading && "animate-pulse [animation-duration:2.4s] motion-reduce:animate-none")}>
          {children}
        </span>
      </div>
    );
  }
);
Note.displayName = "Note";
