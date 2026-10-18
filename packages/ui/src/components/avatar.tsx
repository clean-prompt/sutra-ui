import * as React from "react";
import { Avatar as AvatarPrimitive } from "radix-ui";
import { cva } from "class-variance-authority";
import { RiUserLine, RiVerifiedBadgeFill } from "@remixicon/react";
import { cn } from "../lib/cn";
import { toneClasses, type Tone } from "../lib/tone";
import { colorForSeed } from "../lib/hash";
import { initials, type InitialsOptions } from "../lib/text";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
export type AvatarShape = "circle" | "square";
export type AvatarStatus = "online" | "offline" | "busy" | "away";
/** `soft`: tinted background with coloured initials (default) · `solid`: full colour with white initials. */
export type AvatarVariant = "soft" | "solid";

/** Inline style for a seed colour: a soft tint or a solid fill. Shared by `Avatar` and `Monogram`. */
export function seedColorStyle(color: string, variant: AvatarVariant = "soft"): React.CSSProperties {
  return variant === "solid"
    ? { backgroundColor: color, color: "#ffffff" }
    : {
        backgroundColor: `color-mix(in oklab, ${color} 16%, var(--background))`,
        color: `color-mix(in oklab, ${color} 78%, var(--foreground))`,
      };
}

export const avatarVariants = cva(
  "relative flex shrink-0 select-none items-center justify-center overflow-hidden bg-muted font-medium text-muted-foreground",
  {
    variants: {
      size: {
        xs: "size-6 text-2xs [&_svg]:size-3.5",
        sm: "size-8 text-xs [&_svg]:size-4",
        md: "size-10 text-sm [&_svg]:size-5",
        lg: "size-12 text-base [&_svg]:size-6",
        xl: "size-14 text-lg [&_svg]:size-7",
        "2xl": "size-16 text-xl [&_svg]:size-8",
      },
      shape: {
        circle: "rounded-full",
        square: "rounded-md",
      },
      ring: {
        true: "ring-2 ring-background",
        false: "",
      },
    },
    defaultVariants: { size: "md", shape: "circle", ring: false },
  }
);

const statusDotSize: Record<AvatarSize, string> = {
  xs: "size-1.5 ring-1",
  sm: "size-2 ring-[1.5px]",
  md: "size-2.5 ring-2",
  lg: "size-3 ring-2",
  xl: "size-3.5 ring-2",
  "2xl": "size-4 ring-[2.5px]",
};

const verifiedSize: Record<AvatarSize, string> = {
  xs: "size-2.5",
  sm: "size-3",
  md: "size-3.5",
  lg: "size-4",
  xl: "size-[18px]",
  "2xl": "size-5",
};

const statusTone: Record<AvatarStatus, Tone> = { online: "success", offline: "neutral", busy: "destructive", away: "warning" };
const statusColor: Record<AvatarStatus, string> = {
  online: toneClasses.dot[statusTone.online],
  offline: toneClasses.dot[statusTone.offline],
  busy: toneClasses.dot[statusTone.busy],
  away: toneClasses.dot[statusTone.away],
};

/** Context used by `AvatarGroup` to pass size, shape and ring to its avatars. */
export const AvatarContext = React.createContext<{
  size?: AvatarSize;
  shape?: AvatarShape;
  ring?: boolean;
}>({});

export interface AvatarProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "color"> {
  size?: AvatarSize;
  shape?: AvatarShape;
  src?: string;
  alt?: string;
  /** Used to derive initials, the fallback color and the default alt text. */
  name?: string;
  /** Custom fallback content (overrides auto initials). */
  fallback?: React.ReactNode;
  /** Colorize the initials fallback deterministically from `name` (via `colorForSeed`). Default true. */
  colorful?: boolean;
  /** Explicit fallback colour (any CSS colour); overrides the colour derived from `name`. */
  color?: string;
  /** How the colour is applied to the fallback. Default `soft`. */
  variant?: AvatarVariant;
  /** Options for the auto initials (e.g. `{ singleWord: 2 }` → "Ma" for "Maya"). */
  initialsOptions?: InitialsOptions;
  status?: AvatarStatus;
  verified?: boolean;
  /** Adds a ring in the background color (useful when overlapping). */
  ring?: boolean;
  /** Extra classes for the inner image/fallback frame. */
  frameClassName?: string;
  /** Extra classes for the fallback (initials / icon) layer. */
  fallbackClassName?: string;
}

/**
 * User avatar with image, initials fallback, status dot and verified badge.
 * The fallback is labelled with `alt` or `name`. For square tiles that stand for apps, providers or tools, use `Monogram`.
 */
export const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  (
    {
      className,
      frameClassName,
      fallbackClassName,
      size: sizeProp,
      shape: shapeProp,
      ring: ringProp,
      src,
      alt,
      name,
      fallback,
      colorful = true,
      color,
      variant = "soft",
      initialsOptions,
      status,
      verified,
      children,
      ...props
    },
    ref
  ) => {
    const ctx = React.useContext(AvatarContext);
    const size = sizeProp ?? ctx.size ?? "md";
    const shape = shapeProp ?? ctx.shape ?? "circle";
    const ring = ringProp ?? ctx.ring ?? false;
    const monogram = initials(name, initialsOptions);
    const tint = color ?? (name && colorful && !fallback ? colorForSeed(name) : undefined);
    const label = alt || name || undefined;
    const square = shape === "square";

    return (
      <span
        ref={ref}
        className={cn("relative inline-flex shrink-0 align-middle", className)}
        {...props}
      >
        <AvatarPrimitive.Root className={cn(avatarVariants({ size, shape, ring }), frameClassName)}>
          {children ?? (
            <>
              {src ? <AvatarImage src={src} alt={alt ?? name ?? ""} /> : null}
              <AvatarFallback
                delayMs={src ? 500 : undefined}
                className={fallbackClassName}
                style={tint ? seedColorStyle(tint, variant) : undefined}
                role={label ? "img" : undefined}
                aria-label={label}
              >
                {fallback ?? (monogram || <RiUserLine aria-hidden />)}
              </AvatarFallback>
            </>
          )}
        </AvatarPrimitive.Root>
        {status ? (
          <span
            className={cn(
              "absolute block rounded-full ring-background",
              square ? "-bottom-0.5 -right-0.5" : "bottom-0 right-0",
              statusDotSize[size],
              statusColor[status]
            )}
            role="img"
            aria-label={status}
          />
        ) : null}
        {verified ? (
          <span
            className={cn(
              "absolute flex items-center justify-center rounded-full bg-background text-primary",
              status
                ? square
                  ? "-right-1 -top-1"
                  : "-right-0.5 -top-0.5"
                : square
                  ? "-bottom-1 -right-1"
                  : "-bottom-0.5 -right-0.5"
            )}
          >
            <RiVerifiedBadgeFill className={verifiedSize[size]} aria-hidden />
            <span className="sr-only">Verified</span>
          </span>
        ) : null}
      </span>
    );
  }
);
Avatar.displayName = "Avatar";

export type AvatarImageProps = React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>;

/** Avatar image; hidden until loaded. */
export const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, ...props }, ref) => (
    <AvatarPrimitive.Image
      ref={ref}
      className={cn("aspect-square size-full object-cover", className)}
      {...props}
    />
  )
);
AvatarImage.displayName = "AvatarImage";

export type AvatarFallbackProps = React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>;

/** Shown while the image loads or when it fails. */
export const AvatarFallback = React.forwardRef<HTMLSpanElement, AvatarFallbackProps>(
  ({ className, ...props }, ref) => (
    <AvatarPrimitive.Fallback
      ref={ref}
      className={cn(
        "flex size-full items-center justify-center bg-muted font-medium uppercase text-muted-foreground",
        className
      )}
      {...props}
    />
  )
);
AvatarFallback.displayName = "AvatarFallback";

const labelGroupSizes = {
  sm: { avatar: "sm", name: "text-sm", support: "text-xs", gap: "gap-2" },
  md: { avatar: "md", name: "text-sm", support: "text-sm", gap: "gap-3" },
  lg: { avatar: "lg", name: "text-base", support: "text-sm", gap: "gap-3" },
  xl: { avatar: "xl", name: "text-lg", support: "text-base", gap: "gap-4" },
} as const;

export interface AvatarLabelGroupProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "color"> {
  size?: "sm" | "md" | "lg" | "xl";
  name: React.ReactNode;
  supportingText?: React.ReactNode;
  src?: string;
  status?: AvatarStatus;
  verified?: boolean;
  shape?: AvatarShape;
  /** Pass a custom avatar element instead of the generated one. */
  avatar?: React.ReactNode;
  avatarProps?: Omit<AvatarProps, "size">;
}

/** Avatar with a name and a line of supporting text. */
export const AvatarLabelGroup = React.forwardRef<HTMLDivElement, AvatarLabelGroupProps>(
  (
    { className, size = "md", name, supportingText, src, status, verified, shape, avatar, avatarProps, ...props },
    ref
  ) => {
    const s = labelGroupSizes[size];
    return (
      <div ref={ref} className={cn("flex min-w-0 items-center", s.gap, className)} {...props}>
        {avatar ?? (
          <Avatar
            size={s.avatar}
            src={src}
            name={typeof name === "string" ? name : undefined}
            status={status}
            verified={verified}
            shape={shape}
            {...avatarProps}
          />
        )}
        <div className="min-w-0 leading-tight">
          <div className={cn("truncate font-semibold text-foreground", s.name)}>{name}</div>
          {supportingText ? (
            <div className={cn("mt-0.5 truncate text-muted-foreground", s.support)}>{supportingText}</div>
          ) : null}
        </div>
      </div>
    );
  }
);
AvatarLabelGroup.displayName = "AvatarLabelGroup";
