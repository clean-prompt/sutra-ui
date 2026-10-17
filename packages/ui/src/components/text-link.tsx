import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { RiArrowRightUpLine } from "@remixicon/react";
import { cn } from "../lib/cn";

export const textLinkVariants = cva(
  [
    "inline-flex items-center gap-0.5 rounded-xs font-medium underline-offset-4 decoration-1",
    "transition-[color,text-decoration-color] duration-150",
    "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35",
    "aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "[&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        default: "text-primary decoration-primary/40 hover:text-primary-hover hover:decoration-primary-hover",
        muted:
          "text-muted-foreground decoration-muted-foreground/40 hover:text-foreground hover:decoration-foreground/60",
        subtle: "text-foreground decoration-border-strong hover:decoration-foreground",
      },
      underline: {
        always: "underline",
        hover: "no-underline hover:underline",
        none: "no-underline",
      },
      size: {
        inherit: "[&_svg]:size-[1em]",
        sm: "text-sm [&_svg]:size-3.5",
        md: "text-base [&_svg]:size-4",
        lg: "text-lg [&_svg]:size-[18px]",
      },
    },
    defaultVariants: { variant: "default", underline: "hover", size: "inherit" },
  }
);

export interface TextLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
    VariantProps<typeof textLinkVariants> {
  /** Render as the child element (e.g. a router Link). */
  asChild?: boolean;
  /** Opens in a new tab with safe `rel` and shows an arrow-up-right icon. */
  external?: boolean;
}

/** Inline text link with underline styles and optional external indicator. */
export const TextLink = React.forwardRef<HTMLAnchorElement, TextLinkProps>(
  ({ className, variant, underline, size, asChild, external, target, rel, children, ...props }, ref) => {
    const classes = cn(textLinkVariants({ variant, underline, size }), className);
    const externalProps = external
      ? { target: target ?? "_blank", rel: rel ?? "noopener noreferrer" }
      : { target, rel };
    const icon = external ? (
      <RiArrowRightUpLine
        aria-hidden
        className="transition-transform duration-150 group-hover/text-link:-translate-y-px group-hover/text-link:translate-x-px"
      />
    ) : null;

    if (asChild) {
      return (
        <Slot.Root ref={ref} className={cn("group/text-link", classes)} {...externalProps} {...props}>
          <Slot.Slottable>{children}</Slot.Slottable>
          {icon}
        </Slot.Root>
      );
    }
    return (
      <a ref={ref} className={cn("group/text-link", classes)} {...externalProps} {...props}>
        {children}
        {icon}
        {external && <span className="sr-only"> (opens in a new tab)</span>}
      </a>
    );
  }
);
TextLink.displayName = "TextLink";
