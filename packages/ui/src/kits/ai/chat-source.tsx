import * as React from "react";
import { Collapsible } from "radix-ui";
import { RiArrowDownSLine } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { pluralize } from "../../lib/format";
import { Favicon, domainOf } from "../../primitives/favicon";
import { CitationHoverCard as SourceHoverCard, safeSourceHref as safeHref, type ChatSourceData } from "../../patterns/inline-citation";

/* The source data shape, hover card and inline [n] pill live in ./inline-citation so Markdown can use them. */
export { ChatInlineCitation, type ChatInlineCitationProps, type ChatSourceData } from "../../patterns/inline-citation";

export interface ChatSourceProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "title" | "href">,
    ChatSourceData {
  /** Show this number instead of the favicon. */
  index?: number;
  /** Disable the hover preview card. */
  disablePreview?: boolean;
}

/** Citation chip (favicon or number + domain) with a hover preview card. */
export const ChatSource = React.forwardRef<HTMLAnchorElement, ChatSourceProps>(
  ({ href, title, snippet, favicon, index, disablePreview, className, children, ...props }, ref) => {
    const domain = domainOf(href);
    return (
      <SourceHoverCard source={{ href, title, snippet, favicon }} disabled={disablePreview}>
        <a
          ref={ref}
          href={safeHref(href)}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex h-7 max-w-60 items-center gap-1.5 rounded-control border border-border bg-background pl-1.5 pr-2.5 text-xs text-muted-foreground shadow-xs transition-colors hover:bg-accent hover:text-foreground",
            focusRing,
            className
          )}
          {...props}
        >
          {index != null ? (
            <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-2xs font-medium tabular-nums text-foreground">
              {index}
            </span>
          ) : (
            <Favicon domain={domain} src={favicon} className="size-4" />
          )}
          <span className="truncate font-medium">{children ?? title ?? domain}</span>
        </a>
      </SourceHoverCard>
    );
  }
);
ChatSource.displayName = "ChatSource";

export interface ChatSourceListProps
  extends Omit<React.ComponentPropsWithoutRef<typeof Collapsible.Root>, "children"> {
  sources: ChatSourceData[];
  /** Max favicons in the collapsed stack. */
  maxIcons?: number;
  /** Custom trigger label; defaults to "N sources". */
  label?: React.ReactNode;
}

/** Collapsed "N sources" favicon stack that expands into a full list. */
export const ChatSourceList = React.forwardRef<HTMLDivElement, ChatSourceListProps>(
  ({ sources, maxIcons = 4, label, className, ...props }, ref) => {
    if (sources.length === 0) return null;
    const domains = sources.map((s) => domainOf(s.href));
    const stack = Array.from(new Set(domains)).slice(0, maxIcons);
    return (
      <Collapsible.Root ref={ref} className={cn("w-full", className)} {...props}>
        <Collapsible.Trigger
          className={cn(
            "group/sources inline-flex h-8 items-center gap-2 rounded-control border border-border bg-background pl-1.5 pr-2.5 text-xs font-medium text-muted-foreground shadow-xs transition-colors hover:bg-accent hover:text-foreground",
            focusRing
          )}
        >
          <span className="flex items-center -space-x-1.5">
            {stack.map((d) => (
              <Favicon key={d} domain={d} src={sources.find((s) => domainOf(s.href) === d)?.favicon} className="size-5 ring-2 ring-background" />
            ))}
          </span>
          <span>{label ?? `${sources.length} ${pluralize(sources.length, "source")}`}</span>
          <RiArrowDownSLine
            aria-hidden
            className="size-4 transition-transform duration-200 group-data-[state=open]/sources:rotate-180"
          />
        </Collapsible.Trigger>
        <Collapsible.Content className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
          <ol className="mt-2 flex flex-col gap-0.5 rounded-box border border-border bg-card p-1 shadow-xs">
            {sources.map((source, i) => (
              <li key={`${source.href}-${i}`}>
                <a
                  href={safeHref(source.href)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex items-center gap-3 rounded-md px-2.5 py-2 transition-colors hover:bg-accent",
                    focusRing
                  )}
                >
                  <span className="w-4 shrink-0 text-center text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                  <Favicon domain={domains[i]} src={source.favicon} className="size-4" />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-foreground">{source.title ?? domains[i]}</span>
                    <span className="truncate text-xs text-muted-foreground">{domains[i]}</span>
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </Collapsible.Content>
      </Collapsible.Root>
    );
  }
);
ChatSourceList.displayName = "ChatSourceList";
