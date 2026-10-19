import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";
import { Skeleton } from "./progress";
import { ItemListContext } from "./item-internal";

/* A titled tray that holds a panel of rows (`Item`, `SettingsRow`, anything). The panel's corners are the tray's
   minus the padding, so the two curves stay concentric. */

const frameVariants = cva("group/frame flex min-w-0 flex-col", {
  variants: {
    variant: {
      /** A subtle tray with a raised panel inside it. */
      default: "gap-1 rounded-box border border-border bg-subtle p-1",
      /** One card: a tinted header band, flush rows, a tinted footer band. */
      band: "overflow-hidden rounded-box border border-border bg-card",
      /** A soft tray with a roomy, borderless panel. */
      inset: "gap-2 rounded-box bg-subtle p-3",
      /** No tray: the header sits on the page above a bordered panel. */
      plain: "gap-2",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface FrameProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof frameVariants> {}

/** A titled tray around a panel of rows: `FrameHeader` (title, description, action), `FramePanel`, `FrameFooter`. */
export const Frame = React.forwardRef<HTMLDivElement, FrameProps>(({ className, variant, ...props }, ref) => (
  <div ref={ref} data-slot="frame" data-variant={variant ?? "default"} className={cn(frameVariants({ variant }), className)} {...props} />
));
Frame.displayName = "Frame";

/** The top of a frame: title and description on the left, an action on the right; wraps when narrow. */
export const FrameHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="frame-header"
    className={cn(
      "flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-1.5",
      "group-data-[variant=band]/frame:border-b group-data-[variant=band]/frame:border-border group-data-[variant=band]/frame:bg-subtle group-data-[variant=band]/frame:py-2.5",
      "group-data-[variant=plain]/frame:px-0 group-data-[variant=inset]/frame:px-0 group-data-[variant=inset]/frame:pt-0",
      className
    )}
    {...props}
  />
));
FrameHeader.displayName = "FrameHeader";

export interface FrameTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /** The heading element. Default `h3`. */
  as?: "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "div";
}

/** The frame's heading. */
export const FrameTitle = React.forwardRef<HTMLHeadingElement, FrameTitleProps>(({ as: Tag = "h3", className, ...props }, ref) => (
  <Tag ref={ref} data-slot="frame-title" className={cn("min-w-0 flex-1 truncate text-sm font-semibold text-foreground", className)} {...props} />
));
FrameTitle.displayName = "FrameTitle";

/** A line of explanation under or beside the title. */
export const FrameDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
  <p ref={ref} data-slot="frame-description" className={cn("w-full text-xs text-muted-foreground", className)} {...props} />
));
FrameDescription.displayName = "FrameDescription";

/** A control on the right of the header (a button, a link, a menu). */
export const FrameAction = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} data-slot="frame-action" className={cn("flex shrink-0 items-center gap-1.5", className)} {...props} />
));
FrameAction.displayName = "FrameAction";

export interface FramePanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Draw hairlines between the rows. Default true. */
  divided?: boolean;
  /** Show placeholder rows while the rows are not known yet. */
  loading?: boolean;
  /** Number of placeholder rows. Default 3. */
  loadingRows?: number;
  /** Shown when there are no children (and not loading). */
  emptyState?: React.ReactNode;
}

/** The raised surface that holds the rows. Rows are its direct children; a list of `Item`s works as is. */
export const FramePanel = React.forwardRef<HTMLDivElement, FramePanelProps>(
  ({ className, divided = true, loading = false, loadingRows = 3, emptyState, children, ...props }, ref) => {
    const empty = !loading && React.Children.toArray(children).length === 0;
    return (
      <div
        ref={ref}
        role="list"
        data-slot="frame-panel"
        aria-busy={loading || undefined}
        className={cn(
          "flex min-w-0 flex-col overflow-hidden bg-card",
          divided && "divide-y divide-border",
          "group-data-[variant=default]/frame:rounded-[calc(var(--radius-box)-0.25rem)] group-data-[variant=default]/frame:border group-data-[variant=default]/frame:border-border group-data-[variant=default]/frame:shadow-xs",
          "group-data-[variant=inset]/frame:rounded-control",
          "group-data-[variant=plain]/frame:rounded-box group-data-[variant=plain]/frame:border group-data-[variant=plain]/frame:border-border",
          className
        )}
        {...props}
      >
        {loading ? (
          <>
            <span className="sr-only">Loading…</span>
            {Array.from({ length: Math.max(1, loadingRows) }, (_, i) => (
              <div key={i} role="presentation" aria-hidden="true" className="flex items-center gap-3 px-4 py-3">
                <Skeleton shape="rect" className="size-9 shrink-0 rounded-control" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Skeleton shape="text" className="h-3.5 w-1/2" />
                  <Skeleton shape="text" className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </>
        ) : empty && emptyState != null ? (
          <div role="listitem" className="px-4 py-6 text-center text-sm text-muted-foreground">
            {emptyState}
          </div>
        ) : (
          <ItemListContext.Provider value>{children}</ItemListContext.Provider>
        )}
      </div>
    );
  }
);
FramePanel.displayName = "FramePanel";

/** The bottom of a frame: a count, a hint or an action. */
export const FrameFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="frame-footer"
    className={cn(
      "flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-1.5 text-xs text-muted-foreground",
      "group-data-[variant=band]/frame:border-t group-data-[variant=band]/frame:border-border group-data-[variant=band]/frame:bg-subtle group-data-[variant=band]/frame:py-2.5",
      "group-data-[variant=plain]/frame:px-0 group-data-[variant=inset]/frame:px-0 group-data-[variant=inset]/frame:pb-0",
      className
    )}
    {...props}
  />
));
FrameFooter.displayName = "FrameFooter";
