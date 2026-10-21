import * as React from "react";
import { cn } from "../lib/cn";
import { SutraMark } from "../assets/brand";
import { FeaturedIcon, type FeaturedIconColor, type IconComponent } from "../assets/icons";
import { InlineAlert } from "../primitives/inline-alert";

/* The card shell shared by the auth cards and the Kunji blocks. Internal to the blocks. */

/** Heading level of a card title: `1` by default (a page of its own), `2`..`6` when the card sits inside a page. */
export type AuthHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface AuthFrameProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** `card` is a bordered surface; `plain` only the content. */
  variant?: "card" | "plain";
  icon?: IconComponent;
  iconColor?: FeaturedIconColor;
  /** `true` shows the Sutra mark, a node replaces it, `false` hides it. Default: the mark for `card` unless an icon is set (see `defaultLogo`). */
  logo?: boolean | React.ReactNode;
  /** Whether the mark shows when `logo` is not set (no icon only). Defaults to `variant === "card"`. */
  defaultLogo?: boolean;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Footer strip below the content. `null` hides it. */
  footer?: React.ReactNode;
  /** Element of the title (`h1` by default). */
  headingLevel?: AuthHeadingLevel;
}

export const AuthFrame = React.forwardRef<HTMLDivElement, AuthFrameProps>(
  (
    { variant = "card", logo, defaultLogo, icon, iconColor = "brand", title, description, footer, headingLevel = 1, className, children, ...props },
    ref
  ) => {
    const card = variant === "card";
    const showLogo = logo ?? (icon ? false : defaultLogo ?? card);
    const logoNode = showLogo === true ? <SutraMark size={40} title="Sutra" /> : showLogo || null;
    const Heading = `h${headingLevel}` as const;
    return (
      <div
        ref={ref}
        data-slot="auth-card"
        className={cn(
          "w-full max-w-[400px] text-card-foreground",
          card && "rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8",
          className
        )}
        {...props}
      >
        {logoNode || icon || title || description ? (
          <div className="mb-6 flex flex-col items-center gap-2 text-center sm:mb-8">
            {logoNode ? <div className="mb-2">{logoNode}</div> : null}
            {icon ? <FeaturedIcon icon={icon} color={iconColor} variant="outline-ring" size="lg" className="mb-2" /> : null}
            {title ? <Heading className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</Heading> : null}
            {description ? <div className="text-pretty text-sm text-muted-foreground">{description}</div> : null}
          </div>
        ) : null}
        {children}
        {footer != null && footer !== false ? (
          <div
            className={cn(
              "text-center text-sm text-muted-foreground",
              card
                ? "-mx-6 -mb-6 mt-6 rounded-b-2xl border-t border-border bg-subtle px-6 py-4 sm:-mx-8 sm:-mb-8 sm:mt-8 sm:px-8"
                : "mt-6"
            )}
          >
            {footer}
          </div>
        ) : null}
      </div>
    );
  }
);
AuthFrame.displayName = "AuthFrame";

/** The destructive alert above a form. Renders nothing for an empty message. */
export function FormError({ children }: { children?: React.ReactNode }) {
  if (children == null || children === false || children === "") return null;
  return (
    <InlineAlert variant="destructive" className="mb-5 border border-destructive/20 bg-destructive-soft/50" role="alert">
      {children}
    </InlineAlert>
  );
}
