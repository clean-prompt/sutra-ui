import * as React from "react";
import { cn } from "../lib/cn";
import { useSafeId } from "../hooks/use-safe-id";

/* ------------------------------------------------------------------ */
/* EmptyStateIllustration                                              */
/* ------------------------------------------------------------------ */

export type EmptyStateIllustrationVariant = "search" | "inbox" | "files" | "error" | "success" | "cloud";

export interface EmptyStateIllustrationProps extends Omit<React.ComponentPropsWithoutRef<"svg">, "children"> {
  variant?: EmptyStateIllustrationVariant;
  /** Width in pixels (height follows the 4:3 ratio). */
  size?: number;
  title?: string;
}

const line = "stroke-border-strong";
const sheet = "fill-background stroke-border-strong";

const illustrations: Record<EmptyStateIllustrationVariant, React.ReactNode> = {
  search: (
    <>
      <rect x="44" y="28" width="62" height="70" rx="8" className={sheet} />
      <path d="M56 46h30M56 56h38M56 66h22" className={line} strokeLinecap="round" />
      <circle cx="104" cy="74" r="17" className="fill-primary-soft stroke-primary" strokeWidth="3" />
      <path d="m116.5 86.5 12 12" className="stroke-primary" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M98 70a7 7 0 0 1 7-5" className="stroke-primary" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    </>
  ),
  inbox: (
    <>
      <rect x="58" y="22" width="44" height="34" rx="5" className={sheet} />
      <path d="m60 25 20 15 20-15" className={line} strokeLinejoin="round" />
      <path
        d="M38 70 50 52h60l12 18v22a6 6 0 0 1-6 6H44a6 6 0 0 1-6-6V70Z"
        className={sheet}
        strokeLinejoin="round"
      />
      <path
        d="M38 70h24a4 4 0 0 1 4 4 6 6 0 0 0 6 6h16a6 6 0 0 0 6-6 4 4 0 0 1 4-4h24"
        className="fill-none stroke-primary"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </>
  ),
  files: (
    <>
      <rect x="64" y="20" width="50" height="62" rx="6" className={sheet} transform="rotate(10 89 51)" />
      <rect x="46" y="24" width="50" height="62" rx="6" className={sheet} transform="rotate(-8 71 55)" />
      <path
        d="M52 46a5 5 0 0 1 5-5h12l5 5h24a5 5 0 0 1 5 5v36a5 5 0 0 1-5 5H57a5 5 0 0 1-5-5V46Z"
        className="fill-primary-soft stroke-primary"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M52 56h51" className="stroke-primary" strokeWidth="2" opacity="0.5" />
    </>
  ),
  error: (
    <>
      <rect x="40" y="26" width="80" height="62" rx="8" className={sheet} />
      <path d="M40 40h80" className={line} />
      <circle cx="49" cy="33" r="2" className="fill-border-strong" />
      <circle cx="56" cy="33" r="2" className="fill-border-strong" />
      <circle cx="80" cy="64" r="14" className="fill-destructive-soft stroke-destructive" strokeWidth="2.5" />
      <path d="m75 59 10 10m0-10-10 10" className="stroke-destructive" strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  success: (
    <>
      <rect x="40" y="26" width="80" height="62" rx="8" className={sheet} />
      <path d="M52 76h28M52 84h18" className={line} strokeLinecap="round" />
      <circle cx="80" cy="54" r="16" className="fill-success-soft stroke-success" strokeWidth="2.5" />
      <path d="m73 54 5 5 9-10" className="stroke-success" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  cloud: (
    <>
      <path
        d="M54 90a20 20 0 0 1-2.4-39.9A28 28 0 0 1 106.6 46 22 22 0 0 1 106 90H54Z"
        className={sheet}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M80 82V58m0 0-10 10m10-10 10 10" className="stroke-primary" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
};

/** Simple line illustrations for empty, error and success states. */
export const EmptyStateIllustration = React.forwardRef<SVGSVGElement, EmptyStateIllustrationProps>(
  ({ variant = "search", size = 160, title, className, ...props }, ref) => {
    const titleId = useSafeId("empty-illustration");
    return (
      <svg
        ref={ref}
        viewBox="0 0 160 120"
        width={size}
        height={(size * 3) / 4}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("shrink-0", className)}
        {...(title ? { role: "img", "aria-labelledby": titleId } : { "aria-hidden": true, focusable: "false" as const })}
        {...props}
      >
        {title ? <title id={titleId}>{title}</title> : null}
        <circle cx="80" cy="60" r="54" className="fill-muted" opacity="0.7" />
        <circle cx="80" cy="60" r="54" className="stroke-border" strokeDasharray="2 5" strokeLinecap="round" />
        <circle cx="22" cy="34" r="3" className="fill-primary" opacity="0.35" />
        <circle cx="140" cy="88" r="4" className="fill-primary" opacity="0.25" />
        <path d="M136 22v8M132 26h8" className="stroke-primary" strokeWidth="1.75" strokeLinecap="round" opacity="0.55" />
        <path d="M24 92v6M21 95h6" className={line} strokeWidth="1.5" strokeLinecap="round" />
        {illustrations[variant]}
      </svg>
    );
  }
);
EmptyStateIllustration.displayName = "EmptyStateIllustration";
