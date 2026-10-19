import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { RiAppleFill } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";

export type AppStore = "apple" | "google-play" | "microsoft" | "galaxy";

function GooglePlayMark(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...props}>
      <path fill="#00A0FF" d="M3.6 1.8c-.3.3-.4.7-.4 1.2v18c0 .5.1.9.4 1.2L13.6 12 3.6 1.8Z" />
      <path fill="#00D25B" d="M3.6 1.8 13.6 12l3.3-3.3L5 1.9c-.5-.3-1-.3-1.4-.1Z" />
      <path fill="#FF3A44" d="M3.6 22.2c.4.2.9.2 1.4-.1l11.9-6.8-3.3-3.3-10 10.2Z" />
      <path fill="#FFC900" d="m16.9 8.7-3.3 3.3 3.3 3.3 3.4-1.9c1-.6 1-2.2 0-2.8l-3.4-1.9Z" />
    </svg>
  );
}

function MicrosoftMark(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 23 23" aria-hidden {...props}>
      <path fill="#F25022" d="M1 1h10v10H1z" />
      <path fill="#7FBA00" d="M12 1h10v10H12z" />
      <path fill="#00A4EF" d="M1 12h10v10H1z" />
      <path fill="#FFB900" d="M12 12h10v10H12z" />
    </svg>
  );
}

function GalaxyStoreMark(props: React.SVGProps<SVGSVGElement>) {
  const id = React.useId();
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...props}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF4F8B" />
          <stop offset="1" stopColor="#8E3BFF" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="21" height="21" rx="6" fill={`url(#${id})`} />
      <path
        fill="none"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.5 9h11l-.9 8.2a1.5 1.5 0 0 1-1.5 1.3H8.9a1.5 1.5 0 0 1-1.5-1.3L6.5 9Z M9.3 9V7.8a2.7 2.7 0 0 1 5.4 0V9"
      />
    </svg>
  );
}

const storeMeta: Record<AppStore, { eyebrow: string; name: string; Mark: React.ComponentType<{ className?: string }> }> = {
  apple: { eyebrow: "Download on the", name: "App Store", Mark: RiAppleFill },
  "google-play": { eyebrow: "GET IT ON", name: "Google Play", Mark: GooglePlayMark },
  microsoft: { eyebrow: "Get it from", name: "Microsoft", Mark: MicrosoftMark },
  galaxy: { eyebrow: "Available on", name: "Galaxy Store", Mark: GalaxyStoreMark },
};

export const appStoreBadgeVariants = cva(
  [
    "inline-flex shrink-0 select-none items-center rounded-lg border font-sans no-underline",
    "transition-[transform,translate,scale,rotate,box-shadow,background-color] duration-150 hover:-translate-y-px hover:shadow-md active:translate-y-0 active:scale-[0.98]",
    focusRing,
  ],
  {
    variants: {
      /** Badge colours: `dark` (black badge, for light backgrounds) or `light` (white badge). */
      theme: {
        dark: "border-[#A6A6A6] bg-black text-white hover:bg-[#111]",
        light: "border-black/80 bg-white text-black hover:bg-zinc-50",
      },
      /**
       * Badge height: `sm` 40px, `md` 48px or `lg` 56px.
       * @default "md"
       */
      size: {
        sm: "h-10 gap-1.5 px-2.5 [&_[data-slot=mark]]:size-5 [&_[data-slot=eyebrow]]:text-[8px] [&_[data-slot=name]]:text-sm",
        md: "h-12 gap-2 px-3 [&_[data-slot=mark]]:size-6 [&_[data-slot=eyebrow]]:text-[9px] [&_[data-slot=name]]:text-[17px]",
        lg: "h-14 gap-2.5 px-3.5 [&_[data-slot=mark]]:size-7 [&_[data-slot=eyebrow]]:text-[10px] [&_[data-slot=name]]:text-xl",
      },
    },
    defaultVariants: { theme: "dark", size: "md" },
  }
);

export interface AppStoreBadgeProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
    VariantProps<typeof appStoreBadgeVariants> {
  /** Store the badge links to, which picks its logo and "Download on" or "Get it on" text. */
  store: AppStore;
}

/** Official-style "Download on the App Store / Get it on Google Play" link badge. */
export const AppStoreBadge = React.forwardRef<HTMLAnchorElement, AppStoreBadgeProps>(
  ({ className, store, theme, size, "aria-label": ariaLabel, ...props }, ref) => {
    const { eyebrow, name, Mark } = storeMeta[store];
    return (
      <a
        ref={ref}
        aria-label={ariaLabel ?? `${eyebrow} ${name}`}
        className={cn(appStoreBadgeVariants({ theme, size }), className)}
        {...props}
      >
        <span data-slot="mark" className="inline-flex shrink-0 items-center justify-center [&>svg]:size-full">
          <Mark className="size-full" />
        </span>
        <span className="flex flex-col items-start leading-none" aria-hidden>
          <span
            data-slot="eyebrow"
            className={cn("font-medium tracking-wide", store === "google-play" && "uppercase")}
          >
            {eyebrow}
          </span>
          <span data-slot="name" className="mt-0.5 font-semibold tracking-tight">
            {name}
          </span>
        </span>
      </a>
    );
  }
);
AppStoreBadge.displayName = "AppStoreBadge";
