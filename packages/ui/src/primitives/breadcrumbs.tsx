import * as React from "react";
import { Slot } from "radix-ui";
import { RiArrowRightSLine, RiMoreLine } from "@remixicon/react";
import { cn, focusRing, hitArea } from "../lib/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

export type BreadcrumbSeparatorVariant = "chevron" | "slash" | "dot";

const BreadcrumbContext = React.createContext<{ separator: BreadcrumbSeparatorVariant; size: "sm" | "md" }>({
  separator: "chevron",
  size: "md",
});

export interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  /** Default separator for every `BreadcrumbSeparator` inside. */
  separator?: BreadcrumbSeparatorVariant;
  size?: "sm" | "md";
}

/** Breadcrumb navigation landmark. */
export const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(
  ({ separator = "chevron", size = "md", "aria-label": ariaLabel = "Breadcrumb", ...props }, ref) => {
    const ctx = React.useMemo(() => ({ separator, size }), [separator, size]);
    return (
      <BreadcrumbContext.Provider value={ctx}>
        <nav ref={ref} aria-label={ariaLabel} {...props} />
      </BreadcrumbContext.Provider>
    );
  }
);
Breadcrumb.displayName = "Breadcrumb";

/** Ordered list of crumbs. */
export const BreadcrumbList = React.forwardRef<HTMLOListElement, React.OlHTMLAttributes<HTMLOListElement>>(
  ({ className, ...props }, ref) => {
    const { size } = React.useContext(BreadcrumbContext);
    return (
      <ol
        ref={ref}
        className={cn(
          "flex flex-wrap items-center gap-1 break-words text-muted-foreground sm:gap-1.5",
          size === "sm" ? "text-xs" : "text-sm",
          className
        )}
        {...props}
      />
    );
  }
);
BreadcrumbList.displayName = "BreadcrumbList";

/** A single crumb. */
export const BreadcrumbItem = React.forwardRef<HTMLLIElement, React.LiHTMLAttributes<HTMLLIElement>>(
  ({ className, ...props }, ref) => (
    <li ref={ref} className={cn("inline-flex min-w-0 items-center gap-1.5", className)} {...props} />
  )
);
BreadcrumbItem.displayName = "BreadcrumbItem";

const crumbInner = "inline-flex min-w-0 items-center gap-1.5 [&_svg]:size-4 [&_svg]:shrink-0";

export interface BreadcrumbLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Render your router's link as the child. */
  asChild?: boolean;
}

/** Navigable crumb. */
export const BreadcrumbLink = React.forwardRef<HTMLAnchorElement, BreadcrumbLinkProps>(
  ({ asChild, className, ...props }, ref) => {
    const Comp: React.ElementType = asChild ? Slot.Root : "a";
    return (
      <Comp
        ref={ref}
        className={cn(
          hitArea,
          crumbInner,
          "rounded-xs transition-colors hover:text-foreground",
          focusRing,
          className
        )}
        {...props}
      />
    );
  }
);
BreadcrumbLink.displayName = "BreadcrumbLink";

/** The current page (last crumb). */
export const BreadcrumbPage = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      aria-current="page"
      className={cn(crumbInner, "truncate font-medium text-foreground", className)}
      {...props}
    />
  )
);
BreadcrumbPage.displayName = "BreadcrumbPage";

export interface BreadcrumbSeparatorProps extends React.LiHTMLAttributes<HTMLLIElement> {
  variant?: BreadcrumbSeparatorVariant;
}

/** Decorative divider between crumbs. Pass children to use a custom glyph. */
export const BreadcrumbSeparator = React.forwardRef<HTMLLIElement, BreadcrumbSeparatorProps>(
  ({ variant, className, children, ...props }, ref) => {
    const ctx = React.useContext(BreadcrumbContext);
    const v = variant ?? ctx.separator;
    return (
      <li
        ref={ref}
        role="presentation"
        aria-hidden="true"
        className={cn("inline-flex select-none items-center text-muted-foreground/60", className)}
        {...props}
      >
        {children ??
          (v === "slash" ? (
            <span className="px-0.5 text-[1.1em] font-light">/</span>
          ) : v === "dot" ? (
            <span className="mx-0.5 size-1 rounded-full bg-current" />
          ) : (
            <RiArrowRightSLine aria-hidden className="size-4 rtl:-scale-x-100" />
          ))}
      </li>
    );
  }
);
BreadcrumbSeparator.displayName = "BreadcrumbSeparator";

export interface BreadcrumbCrumb {
  label: React.ReactNode;
  href?: string;
  icon?: React.ReactNode;
}

export type BreadcrumbRenderLink = (props: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) => React.ReactElement;

export interface BreadcrumbEllipsisProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Hidden crumbs shown in a dropdown. Without items, renders a plain ellipsis. */
  items?: BreadcrumbCrumb[];
  renderLink?: BreadcrumbRenderLink;
}

/** Collapsed middle crumbs, revealed in a dropdown menu. */
export const BreadcrumbEllipsis = React.forwardRef<HTMLButtonElement, BreadcrumbEllipsisProps>(
  ({ items, renderLink, className, ...props }, ref) => {
    if (!items || items.length === 0) {
      return (
        <span role="presentation" aria-hidden="true" className={cn("inline-flex size-6 items-center justify-center", className)}>
          <RiMoreLine aria-hidden className="size-4" />
          <span className="sr-only">More</span>
        </span>
      );
    }
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            ref={ref}
            type="button"
            aria-label={`Show ${items.length} more`}
            className={cn(
              "inline-flex size-6 items-center justify-center rounded-xs transition-colors hover:bg-accent hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground",
              focusRing,
              className
            )}
            {...props}
          >
            <RiMoreLine aria-hidden className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-40">
          {items.map((item, i) =>
            item.href ? (
              <DropdownMenuItem key={i} asChild>
                {renderLink ? (
                  renderLink({
                    href: item.href,
                    children: (
                      <>
                        {item.icon}
                        <span className="truncate">{item.label}</span>
                      </>
                    ),
                  })
                ) : (
                  <a href={item.href}>
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </a>
                )}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem key={i} icon={item.icon} disabled>
                {item.label}
              </DropdownMenuItem>
            )
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
);
BreadcrumbEllipsis.displayName = "BreadcrumbEllipsis";

export interface BreadcrumbsProps extends Omit<BreadcrumbProps, "children"> {
  items: BreadcrumbCrumb[];
  /** Collapse middle crumbs into an ellipsis menu when there are more than this many. */
  maxItems?: number;
  /** Crumbs kept before the ellipsis. Default 1. */
  itemsBeforeCollapse?: number;
  /** Crumbs kept after the ellipsis. Default 1 (or maxItems - itemsBeforeCollapse - 1 when larger). */
  itemsAfterCollapse?: number;
  /** Render links through your router (receives href, className, children). */
  renderLink?: BreadcrumbRenderLink;
}

/** Data-driven breadcrumb trail with optional collapsing. The last item is the current page. */
export const Breadcrumbs = React.forwardRef<HTMLElement, BreadcrumbsProps>(
  ({ items, maxItems, itemsBeforeCollapse = 1, itemsAfterCollapse, renderLink, ...props }, ref) => {
    const shouldCollapse = maxItems != null && items.length > maxItems && maxItems >= 2;
    const after = Math.max(1, itemsAfterCollapse ?? (maxItems != null ? maxItems - itemsBeforeCollapse - 1 : 1));
    const before = Math.max(0, itemsBeforeCollapse);

    type Entry = { kind: "crumb"; item: BreadcrumbCrumb; index: number } | { kind: "ellipsis"; hidden: BreadcrumbCrumb[] };
    let entries: Entry[] = items.map((item, index) => ({ kind: "crumb" as const, item, index }));
    if (shouldCollapse && before + after < items.length) {
      entries = [
        ...items.slice(0, before).map((item, index) => ({ kind: "crumb" as const, item, index })),
        { kind: "ellipsis" as const, hidden: items.slice(before, items.length - after) },
        ...items
          .slice(items.length - after)
          .map((item, i) => ({ kind: "crumb" as const, item, index: items.length - after + i })),
      ];
    }

    const renderCrumb = (item: BreadcrumbCrumb, index: number) => {
      const isLast = index === items.length - 1;
      const content = (
        <>
          {item.icon}
          <span className="truncate">{item.label}</span>
        </>
      );
      if (isLast || !item.href) {
        return (
          <BreadcrumbPage
            aria-current={isLast ? "page" : undefined}
            className={isLast ? undefined : "font-normal text-muted-foreground"}
          >
            {content}
          </BreadcrumbPage>
        );
      }
      if (renderLink) {
        return <BreadcrumbLink asChild>{renderLink({ href: item.href, children: content })}</BreadcrumbLink>;
      }
      return <BreadcrumbLink href={item.href}>{content}</BreadcrumbLink>;
    };

    return (
      <Breadcrumb ref={ref} {...props}>
        <BreadcrumbList>
          {entries.map((entry, i) => (
            <React.Fragment key={entry.kind === "crumb" ? `c${entry.index}` : "ellipsis"}>
              {i > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {entry.kind === "crumb" ? (
                  renderCrumb(entry.item, entry.index)
                ) : (
                  <BreadcrumbEllipsis items={entry.hidden} renderLink={renderLink} />
                )}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    );
  }
);
Breadcrumbs.displayName = "Breadcrumbs";
