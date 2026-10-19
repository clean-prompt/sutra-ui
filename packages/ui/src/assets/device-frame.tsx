import * as React from "react";
import { RiLockLine } from "@remixicon/react";
import { cn } from "../lib/cn";

/* ------------------------------------------------------------------ */
/* DeviceFrame                                                         */
/* ------------------------------------------------------------------ */

export type DeviceFrameVariant = "browser" | "phone" | "tablet";

export interface DeviceFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Frame style: a `browser` window, a `phone` or a `tablet`.
   * @default "browser"
   */
  variant?: DeviceFrameVariant;
  /** Address bar text (browser). */
  url?: string;
  /** Colored traffic-light buttons (browser). Neutral dots when false. */
  trafficLights?: boolean;
  /** Show a status bar with time and indicators (phone/tablet). */
  statusBar?: boolean;
  /** Extra classes for the screen/content area. */
  screenClassName?: string;
}

function StatusBar({ compact }: { compact?: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between font-semibold text-foreground",
        compact ? "h-6 px-5 text-[10px]" : "h-11 px-7 pt-1 text-xs"
      )}
    >
      <span className="tabular-nums">9:41</span>
      <span className="flex items-center gap-1">
        <svg viewBox="0 0 18 12" className={compact ? "h-2 w-3" : "h-2.5 w-4"} fill="currentColor">
          <rect x="0" y="8" width="3" height="4" rx="1" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
          <rect x="10" y="3" width="3" height="9" rx="1" />
          <rect x="15" y="0" width="3" height="12" rx="1" />
        </svg>
        <svg viewBox="0 0 26 12" className={compact ? "h-2 w-4" : "h-2.5 w-5"} fill="none">
          <rect x="0.5" y="0.5" width="22" height="11" rx="3" stroke="currentColor" opacity="0.4" />
          <rect x="2" y="2" width="16" height="8" rx="1.8" fill="currentColor" />
          <path d="M24 4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
        </svg>
      </span>
    </div>
  );
}

/** Wraps content in browser window chrome or a phone/tablet bezel. */
export const DeviceFrame = React.forwardRef<HTMLDivElement, DeviceFrameProps>(
  (
    {
      variant = "browser",
      url = "sutra.app",
      trafficLights = true,
      statusBar = true,
      screenClassName,
      className,
      children,
      ...props
    },
    ref
  ) => {
    if (variant === "browser") {
      const dots = trafficLights ? ["#ff5f57", "#febc2e", "#28c840"] : [];
      return (
        <div
          ref={ref}
          data-variant="browser"
          className={cn("w-full overflow-hidden rounded-box border border-border bg-card shadow-xl", className)}
          {...props}
        >
          <div className="relative flex h-10 items-center gap-3 border-b border-border bg-subtle px-3.5">
            <div className="flex items-center gap-1.5" aria-hidden>
              {(dots.length ? dots : [null, null, null]).map((color, i) => (
                <span
                  key={i}
                  className={cn("size-3 rounded-full", !color && "bg-border-strong")}
                  style={color ? { backgroundColor: color, boxShadow: "inset 0 0 0 0.5px rgb(0 0 0 / 0.12)" } : undefined}
                />
              ))}
            </div>
            <div className="mx-auto flex h-6 w-full max-w-sm min-w-0 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs text-muted-foreground">
              <RiLockLine aria-hidden className="size-3 shrink-0" />
              <span className="truncate">{url}</span>
            </div>
            <div className="w-[3.25rem]" aria-hidden />
          </div>
          <div className={cn("relative bg-background", screenClassName)}>{children}</div>
        </div>
      );
    }

    const isPhone = variant === "phone";
    return (
      <div
        ref={ref}
        data-variant={variant}
        className={cn(
          "relative mx-auto max-w-full shadow-2xl ring-1 ring-black/10 dark:ring-white/15",
          isPhone ? "w-72 rounded-[3rem] p-2.5" : "w-[36rem] rounded-[2rem] p-3",
          className
        )}
        style={{ backgroundColor: "#0b0b0d" }}
        {...props}
      >
        {isPhone ? (
          <>
            <span aria-hidden className="absolute top-24 -start-[3px] h-8 w-[3px] rounded-s-sm bg-[#27272a]" />
            <span aria-hidden className="absolute top-36 -start-[3px] h-12 w-[3px] rounded-s-sm bg-[#27272a]" />
            <span aria-hidden className="absolute top-32 -end-[3px] h-16 w-[3px] rounded-e-sm bg-[#27272a]" />
          </>
        ) : null}
        <div
          className={cn(
            "relative overflow-hidden bg-background",
            isPhone ? "rounded-[2.4rem]" : "rounded-[1.25rem]",
            screenClassName
          )}
          style={{ aspectRatio: isPhone ? "9 / 19.5" : "4 / 3" }}
        >
          {isPhone ? (
            <span
              aria-hidden
              className="absolute top-2.5 start-1/2 z-20 h-6 w-20 -translate-x-1/2 rtl:translate-x-1/2 rounded-full"
              style={{ backgroundColor: "#0b0b0d" }}
            />
          ) : (
            <span
              aria-hidden
              className="absolute top-1.5 start-1/2 z-20 size-1.5 -translate-x-1/2 rtl:translate-x-1/2 rounded-full"
              style={{ backgroundColor: "#27272a" }}
            />
          )}
          {statusBar ? <StatusBar compact={!isPhone} /> : null}
          <div className={cn("size-full overflow-auto scrollbar-none", statusBar && (isPhone ? "pt-11" : "pt-6"))}>
            {children}
          </div>
        </div>
        {isPhone ? (
          <span aria-hidden className="absolute bottom-4 start-1/2 h-1 w-24 -translate-x-1/2 rtl:translate-x-1/2 rounded-full bg-foreground/30" />
        ) : null}
      </div>
    );
  }
);
DeviceFrame.displayName = "DeviceFrame";
