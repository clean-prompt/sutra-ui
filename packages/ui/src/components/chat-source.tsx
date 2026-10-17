import * as React from "react";
import { Collapsible, HoverCard } from "radix-ui";
import { RiArrowDownSLine, RiExternalLinkLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { Favicon, domainOf } from "./favicon";

export interface ChatSourceData {
  href: string;
  title?: string;
  snippet?: string;
  /** Icon URL for this source. Without it (and without a FaviconProvider) a local monogram is shown. */
  favicon?: string;
}

const hoverContentClass = cn(
  "z-50 w-80 rounded-box border border-border bg-popover p-3.5 text-popover-foreground shadow-lg outline-none",
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
  "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
);

function SourcePreview({ href, title, snippet, favicon }: ChatSourceData) {
  const domain = domainOf(href);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Favicon domain={domain} src={favicon} className="size-4" />
        <span className="truncate">{domain}</span>
      </div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="line-clamp-2 text-sm font-medium leading-5 text-foreground hover:underline"
      >
        {title ?? href}
      </a>
      {snippet && <p className="line-clamp-3 text-xs leading-5 text-muted-foreground">{snippet}</p>}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-w-0 items-center gap-1 text-xs text-primary hover:underline"
      >
        <span className="truncate">{href}</span>
        <RiExternalLinkLine aria-hidden className="size-3 shrink-0" />
      </a>
    </div>
  );
}

function SourceHoverCard({
  source,
  children,
  disabled,
}: {
  source: ChatSourceData;
  children: React.ReactElement;
  disabled?: boolean;
}) {
  if (disabled) return children;
  return (
    <HoverCard.Root openDelay={250} closeDelay={120}>
      <HoverCard.Trigger asChild>{children}</HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content sideOffset={6} align="start" collisionPadding={8} className={hoverContentClass}>
          <SourcePreview {...source} />
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}

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
          href={href}
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
          <span>{label ?? `${sources.length} ${sources.length === 1 ? "source" : "sources"}`}</span>
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
                  href={source.href}
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

export interface ChatInlineCitationProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title">,
    Partial<ChatSourceData> {
  index: number;
}

/** Superscript [n] citation pill; shows a preview card on hover when `href` is set. */
export const ChatInlineCitation = React.forwardRef<HTMLElement, ChatInlineCitationProps>(
  ({ index, href, title, snippet, className, ...props }, ref) => {
    const pill = cn(
      "mx-0.5 inline-flex h-4 min-w-4 -translate-y-px items-center justify-center rounded-full bg-muted px-1 align-super text-[10px] font-medium leading-none tabular-nums text-muted-foreground no-underline transition-colors hover:bg-primary-soft hover:text-primary-soft-foreground",
      focusRing,
      className
    );
    if (!href) {
      return (
        <sup ref={ref} className={pill} {...props}>
          {index}
        </sup>
      );
    }
    return (
      <SourceHoverCard source={{ href, title, snippet }}>
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Source ${index}${title ? `: ${title}` : ""}`}
          className={pill}
          {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {index}
        </a>
      </SourceHoverCard>
    );
  }
);
ChatInlineCitation.displayName = "ChatInlineCitation";
