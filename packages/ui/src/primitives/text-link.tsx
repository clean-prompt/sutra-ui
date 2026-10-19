import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { RiArrowRightUpLine } from "@remixicon/react";
import { cn, hitArea } from "../lib/cn";

export const textLinkVariants = cva(
  [
    hitArea,
    "inline-flex items-center gap-0.5 rounded-xs font-medium underline-offset-4 decoration-1",
    "transition-[color,text-decoration-color] duration-150",
    "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35",
    "aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "[&_svg]:shrink-0",
  ],
  {
    variants: {
      /**
       * Colour: `default` (primary), `muted`, `subtle` (text colour) or `destructive`.
       * @default "default"
       */
      variant: {
        default: "text-primary decoration-primary/40 hover:text-primary-hover hover:decoration-primary-hover",
        muted:
          "text-muted-foreground decoration-muted-foreground/40 hover:text-foreground hover:decoration-foreground/60",
        subtle: "text-foreground decoration-border-strong hover:decoration-foreground",
        destructive: "text-destructive decoration-destructive/50 hover:decoration-destructive",
      },
      /**
       * When the underline shows: `always`, on `hover` or `none`.
       * @default "hover"
       */
      underline: {
        always: "underline",
        hover: "no-underline hover:underline",
        none: "no-underline",
      },
      /**
       * Text size: `inherit` keeps the surrounding size, or `sm`, `md`, `lg`.
       * @default "inherit"
       */
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
  /**
   * `button` renders a `<button type="button">` styled as a link, for an inline action inside a sentence.
   * Default: `button` when there is an `onClick` but no `href`, otherwise `a`.
   */
  as?: "a" | "button";
  /** Disables the button, or in link mode renders an `aria-disabled` link without `href` that ignores clicks. */
  disabled?: boolean;
}

/**
 * Inline text link with underline styles and optional external indicator.
 * With `onClick` and no `href` (or `as="button"`) it renders a button that reads as part of the sentence.
 * For a standalone action use `Button variant="link"`.
 */
export const TextLink = React.forwardRef<HTMLAnchorElement, TextLinkProps>(
  ({ className, variant, underline, size, asChild, external, as, disabled, target, rel, children, ...props }, ref) => {
    const classes = cn(textLinkVariants({ variant, underline, size }), className);
    const asButton = !asChild && (as === "button" || (as === undefined && props.href === undefined && props.onClick !== undefined));
    if (asButton) {
      const { href: _href, type, ...buttonProps } = props;
      return (
        <button
          ref={ref as unknown as React.Ref<HTMLButtonElement>}
          type={(type as "button" | "submit" | "reset" | undefined) ?? "button"}
          disabled={disabled}
          className={cn(
            "group/text-link cursor-pointer text-start disabled:pointer-events-none disabled:opacity-50",
            classes
          )}
          {...(buttonProps as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        >
          {children}
        </button>
      );
    }
    const externalProps = external
      ? { target: target ?? "_blank", rel: rel ?? "noopener noreferrer" }
      : { target, rel: rel ?? (target === "_blank" ? "noopener noreferrer" : undefined) };
    const icon = external ? (
      <RiArrowRightUpLine
        aria-hidden
        className="transition-transform duration-150 group-hover/text-link:-translate-y-px group-hover/text-link:translate-x-px rtl:group-hover/text-link:-translate-x-px"
      />
    ) : null;

    // A link can't be disabled natively: drop the href (so Enter does nothing), mark it aria-disabled and
    // swallow clicks in the capture phase, before the child's own handler (e.g. a router Link) runs.
    const disabledProps = disabled
      ? {
          "aria-disabled": true as const,
          tabIndex: -1,
          onClickCapture: (e: React.MouseEvent<HTMLAnchorElement>) => {
            e.preventDefault();
            e.stopPropagation();
          },
        }
      : {};

    if (asChild) {
      return (
        <Slot.Root ref={ref} className={cn("group/text-link", classes)} {...externalProps} {...props} {...disabledProps}>
          <Slot.Slottable>{children}</Slot.Slottable>
          {icon}
        </Slot.Root>
      );
    }
    return (
      <a
        ref={ref}
        className={cn("group/text-link", classes)}
        {...externalProps}
        {...props}
        {...(disabled ? { ...disabledProps, href: undefined, role: props.role ?? "link" } : null)}
      >
        {children}
        {icon}
        {external && <span className="sr-only"> (opens in a new tab)</span>}
      </a>
    );
  }
);
TextLink.displayName = "TextLink";
