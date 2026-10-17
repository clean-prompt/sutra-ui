import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

/* ------------------------------------------------------------------ */
/* Icon                                                                */
/* ------------------------------------------------------------------ */

export type IconSize = "xs" | "sm" | "md" | "lg" | "xl";
export type IconTone = "default" | "muted" | "primary" | "success" | "warning" | "destructive" | "info";

/** Pixel sizes for each icon size token. */
export const iconSizes: Record<IconSize, number> = { xs: 12, sm: 16, md: 20, lg: 24, xl: 32 };

const iconSizeClass: Record<IconSize, string> = {
  xs: "size-3",
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
  xl: "size-8",
};

const iconToneClass: Record<IconTone, string> = {
  default: "",
  muted: "text-muted-foreground",
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  info: "text-info",
};

/** Any SVG icon component (Remix Icon, or any component accepting `className` and `size`). */
export type IconComponent = React.ElementType;

export interface IconProps extends Omit<React.ComponentPropsWithoutRef<"svg">, "children"> {
  /** The icon component to render, e.g. `RiHomeLine`. */
  as: IconComponent;
  size?: IconSize;
  tone?: IconTone;
  /** Accessible label. When omitted the icon is decorative (`aria-hidden`). */
  label?: string;
}

/** Sized, toned wrapper around any icon component. */
export const Icon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ as: Comp, size = "sm", tone = "default", label, className, ...props }, ref) => (
    <Comp
      ref={ref}
      size={iconSizes[size]}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      focusable="false"
      className={cn("shrink-0", iconSizeClass[size], iconToneClass[tone], className)}
      {...props}
    />
  )
);
Icon.displayName = "Icon";

/* ------------------------------------------------------------------ */
/* FeaturedIcon                                                        */
/* ------------------------------------------------------------------ */

export type FeaturedIconColor = "brand" | "neutral" | "success" | "warning" | "destructive" | "info";
export type FeaturedIconVariant = "soft" | "solid" | "outline-ring" | "glass";

const strongText: Record<FeaturedIconColor, string> = {
  brand: "text-primary",
  neutral: "text-muted-foreground",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  info: "text-info",
};

export const featuredIconVariants = cva(
  "relative inline-flex shrink-0 select-none items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        soft: "",
        solid: "shadow-xs shadow-inner-highlight",
        "outline-ring": "",
        glass:
          "border border-white/50 bg-gradient-to-b from-white/70 to-white/30 shadow-sm shadow-inner-highlight backdrop-blur-md dark:border-white/10 dark:from-white/10 dark:to-white/[0.03]",
      },
      color: {
        brand: "",
        neutral: "",
        success: "",
        warning: "",
        destructive: "",
        info: "",
      },
      size: {
        sm: "size-8 [&_svg]:size-4",
        md: "size-10 [&_svg]:size-5",
        lg: "size-12 [&_svg]:size-6",
        xl: "size-14 [&_svg]:size-7",
      },
      shape: {
        circle: "rounded-full",
        square: "",
      },
    },
    compoundVariants: [
      { variant: "soft", color: "brand", className: "bg-primary-soft text-primary-soft-foreground" },
      { variant: "soft", color: "neutral", className: "bg-muted text-foreground" },
      { variant: "soft", color: "success", className: "bg-success-soft text-success-soft-foreground" },
      { variant: "soft", color: "warning", className: "bg-warning-soft text-warning-soft-foreground" },
      { variant: "soft", color: "destructive", className: "bg-destructive-soft text-destructive-soft-foreground" },
      { variant: "soft", color: "info", className: "bg-info-soft text-info-soft-foreground" },

      { variant: "solid", color: "brand", className: "bg-primary text-primary-foreground" },
      { variant: "solid", color: "neutral", className: "bg-inverse text-inverse-foreground" },
      { variant: "solid", color: "success", className: "bg-success text-success-foreground" },
      { variant: "solid", color: "warning", className: "bg-warning text-warning-foreground" },
      { variant: "solid", color: "destructive", className: "bg-destructive text-destructive-foreground" },
      { variant: "solid", color: "info", className: "bg-info text-info-foreground" },

      { variant: ["outline-ring", "glass"], color: "brand", className: strongText.brand },
      { variant: ["outline-ring", "glass"], color: "neutral", className: strongText.neutral },
      { variant: ["outline-ring", "glass"], color: "success", className: strongText.success },
      { variant: ["outline-ring", "glass"], color: "warning", className: strongText.warning },
      { variant: ["outline-ring", "glass"], color: "destructive", className: strongText.destructive },
      { variant: ["outline-ring", "glass"], color: "info", className: strongText.info },

      { variant: "outline-ring", size: "sm", className: "size-10" },
      { variant: "outline-ring", size: "md", className: "size-12" },
      { variant: "outline-ring", size: "lg", className: "size-14" },
      { variant: "outline-ring", size: "xl", className: "size-[4.25rem]" },

      { shape: "square", size: ["sm", "md"], className: "rounded-lg" },
      { shape: "square", size: ["lg", "xl"], className: "rounded-xl" },
    ],
    defaultVariants: { variant: "soft", color: "brand", size: "md", shape: "circle" },
  }
);

export interface FeaturedIconProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "color">,
    VariantProps<typeof featuredIconVariants> {
  /** Icon component to render inside the tile. Alternatively pass the icon as children. */
  icon?: IconComponent;
  /** Accessible label; decorative when omitted. */
  label?: string;
}

/** An icon presented in a tinted tile, with soft, solid, ring-halo and glass styles. */
export const FeaturedIcon = React.forwardRef<HTMLSpanElement, FeaturedIconProps>(
  ({ icon: IconComp, variant, color, size, shape, label, className, children, ...props }, ref) => {
    const v = variant ?? "soft";
    return (
      <span
        ref={ref}
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        data-variant={v}
        className={cn(featuredIconVariants({ variant: v, color, size, shape }), className)}
        {...props}
      >
        {v === "outline-ring" ? (
          <>
            <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] border-2 border-current opacity-10" />
            <span aria-hidden className="pointer-events-none absolute inset-[16%] rounded-[inherit] border-2 border-current opacity-30" />
          </>
        ) : null}
        {IconComp ? <IconComp aria-hidden focusable="false" /> : children}
      </span>
    );
  }
);
FeaturedIcon.displayName = "FeaturedIcon";
