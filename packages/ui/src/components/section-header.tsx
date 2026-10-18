import * as React from "react";
import { RiArrowLeftLine } from "@remixicon/react";
import { cn, type Size } from "../lib/cn";
import { Heading, Eyebrow } from "./typography";
import { Button } from "./button";

type HeadingLevel = "h1" | "h2" | "h3" | "h4";

const titleSize = { sm: "lg", md: "xl", lg: "display-xs" } as const;
const descriptionSize: Record<Size, string> = { sm: "text-sm", md: "text-sm", lg: "text-base" };

export interface SectionHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Buttons on the right; wrap below the text on mobile. */
  actions?: React.ReactNode;
  /** Tabs or filters rendered under the heading row. `children` render there too. */
  tabs?: React.ReactNode;
  /** Bottom border under the header. */
  divider?: boolean;
  size?: Size;
  align?: "start" | "center";
  /** Heading element. Default h2. */
  as?: HeadingLevel;
  /** Leading element before the text (icon, avatar). */
  leading?: React.ReactNode;
}

/** Section heading with eyebrow, title, description, actions and an optional tabs slot. */
export const SectionHeader = React.forwardRef<HTMLDivElement, SectionHeaderProps>(
  (
    {
      eyebrow,
      title,
      description,
      actions,
      tabs,
      divider,
      size = "md",
      align = "start",
      as = "h2",
      leading,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const centered = align === "center";
    const below = tabs ?? children;
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col",
          size === "lg" ? "gap-5" : "gap-4",
          divider && !below && (size === "sm" ? "border-b border-border pb-4" : "border-b border-border pb-5"),
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "flex flex-wrap gap-x-6 gap-y-4",
            centered ? "flex-col items-center text-center" : "items-start justify-between"
          )}
        >
          <div className={cn("flex min-w-0 gap-3", centered ? "flex-col items-center" : "flex-1 items-start")}>
            {leading && <div className="shrink-0">{leading}</div>}
            <div className={cn("flex min-w-0 flex-col", size === "sm" ? "gap-1" : "gap-1.5", centered && "items-center")}>
              {eyebrow && <Eyebrow className={size === "lg" ? "mb-1" : undefined}>{eyebrow}</Eyebrow>}
              <Heading as={as} size={titleSize[size]}>
                {title}
              </Heading>
              {description && (
                <p
                  className={cn(
                    "text-pretty text-muted-foreground",
                    descriptionSize[size],
                    centered ? "max-w-2xl" : "max-w-3xl"
                  )}
                >
                  {description}
                </p>
              )}
            </div>
          </div>
          {actions && (
            <div className={cn("flex shrink-0 flex-wrap items-center gap-2", centered ? "justify-center" : "max-sm:w-full")}>
              {actions}
            </div>
          )}
        </div>
        {below && (
          <div className={cn(divider && "border-b border-border", centered && "flex justify-center")}>{below}</div>
        )}
      </div>
    );
  }
);
SectionHeader.displayName = "SectionHeader";

export interface PageHeaderProps extends Omit<SectionHeaderProps, "as" | "align"> {
  /** Breadcrumb trail rendered above the title. */
  breadcrumbs?: React.ReactNode;
  /** Show a back button; called on click. */
  onBack?: () => void;
  /** Render the back button as a link. */
  backHref?: string;
  backLabel?: string;
}

/** Page-level header: breadcrumbs, back button, h1 title, actions and tabs. */
export const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ breadcrumbs, onBack, backHref, backLabel = "Back", size = "lg", leading, className, ...props }, ref) => {
    const back =
      onBack || backHref ? (
        backHref ? (
          <Button asChild variant="secondary" size="icon-sm" aria-label={backLabel}>
            <a href={backHref} onClick={onBack}>
              <RiArrowLeftLine aria-hidden />
            </a>
          </Button>
        ) : (
          <Button variant="secondary" size="icon-sm" aria-label={backLabel} onClick={onBack}>
            <RiArrowLeftLine aria-hidden />
          </Button>
        )
      ) : null;
    return (
      <div className={cn("flex flex-col gap-4", className)}>
        {breadcrumbs && <div className="min-w-0">{breadcrumbs}</div>}
        <SectionHeader
          ref={ref}
          as="h1"
          size={size}
          leading={
            back || leading ? (
              <div className="flex items-center gap-3">
                {back}
                {leading}
              </div>
            ) : undefined
          }
          {...props}
        />
      </div>
    );
  }
);
PageHeader.displayName = "PageHeader";
