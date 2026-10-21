/** Channel platform icon: the PlatformIcon glyphs. */
import * as React from "react";
import { cn } from "../../lib/cn";
import { type ChannelPlatform, channelPlatforms } from "./channels-model";

function Glyph({ platform }: { platform: ChannelPlatform }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  switch (platform) {
    case "telegram":
      return <path {...common} d="M5 11.5 18.5 6l-2.5 12-4.5-3.5L9 17v-4l6-5" />;
    case "whatsapp":
      return (
        <>
          <path {...common} d="M6.2 17.8 7 15a6.5 6.5 0 1 1 2.4 2.3Z" />
          <path {...common} d="M10 10.5c.4 1.5 1.6 2.7 3.2 3.2" />
        </>
      );
    case "slack":
      return <path {...common} d="M9.5 5v14M14.5 5v14M5 9.5h14M5 14.5h14" />;
    case "discord":
      return (
        <>
          <path {...common} d="M6 8.5c4-2.5 8-2.5 12 0l1 7c-1.2 1.3-2.7 2-4.5 2l-.8-1.5h-3.4l-.8 1.5c-1.8 0-3.3-.7-4.5-2Z" />
          <circle cx="9.8" cy="12.5" r="1.1" fill="currentColor" />
          <circle cx="14.2" cy="12.5" r="1.1" fill="currentColor" />
        </>
      );
    case "signal":
      return (
        <>
          <circle {...common} cx="12" cy="12" r="6.5" strokeDasharray="2.6 2" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        </>
      );
    case "matrix":
      return (
        <>
          <path {...common} d="M7.5 5.5h-2v13h2M16.5 5.5h2v13h-2" />
          <path {...common} d="M9 15v-5m0 1.5c0-1 .7-1.5 1.5-1.5S12 10.5 12 11.5V15m0-3.5c0-1 .7-1.5 1.5-1.5s1.5.5 1.5 1.5V15" strokeWidth={1.5} />
        </>
      );
    case "email":
      return (
        <>
          <rect {...common} x="4.5" y="6.5" width="15" height="11" rx="2" />
          <path {...common} d="m5 7.5 7 5.5 7-5.5" />
        </>
      );
    case "sms":
      return (
        <>
          <path {...common} d="M5 7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-6l-4 3v-3H7a2 2 0 0 1-2-2Z" />
          <path {...common} d="M9 10.5h.01M12 10.5h.01M15 10.5h.01" strokeWidth={2.4} />
        </>
      );
    case "imessage":
      return (
        <>
          <ellipse {...common} cx="12" cy="11.5" rx="7" ry="5.5" />
          <path {...common} d="M7.5 15.5 6 19l4-2" />
        </>
      );
    case "webhook":
      return (
        <>
          <circle {...common} cx="12" cy="6.5" r="2" />
          <circle {...common} cx="6.5" cy="16.5" r="2" />
          <circle {...common} cx="17.5" cy="16.5" r="2" />
          <path {...common} d="M11 8.3 7.5 14.6M13 8.3l3.5 6.3M8.5 16.5h7" />
        </>
      );
  }
}

const iconSizes = { sm: "size-6 rounded-md [&_svg]:size-4", md: "size-8 rounded-lg [&_svg]:size-5", lg: "size-10 rounded-xl [&_svg]:size-6" };

export interface PlatformIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Messaging platform whose logo to draw. */
  platform: ChannelPlatform;
  /** Icon box size: `sm`, `md` or `lg`. */
  size?: "sm" | "md" | "lg";
  /** Accessible name. Defaults to the platform name. */
  label?: string;
  /** Hide from assistive tech when the name is already next to it. */
  decorative?: boolean;
}

/** Monochrome glyph tile for a messaging platform (original shapes, not brand logos). */
export const PlatformIcon = React.forwardRef<HTMLSpanElement, PlatformIconProps>(
  ({ platform, size = "md", label, decorative, className, ...props }, ref) => (
    <span
      ref={ref}
      data-platform={platform}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : (label ?? channelPlatforms[platform].label)}
      aria-hidden={decorative || undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center border border-border bg-muted text-foreground",
        iconSizes[size],
        className
      )}
      {...props}
    >
      <svg viewBox="0 0 24 24" aria-hidden>
        <Glyph platform={platform} />
      </svg>
    </span>
  )
);
PlatformIcon.displayName = "PlatformIcon";
