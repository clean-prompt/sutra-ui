import * as React from "react";
import { HoverCard } from "radix-ui";
import { RiExternalLinkLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { isSafeHref } from "../lib/validate";
import { Favicon, domainOf } from "../primitives/favicon";

/** Drops `javascript:`/`data:` and other unsafe source links. */
export const safeSourceHref = (href: string) => (isSafeHref(href) ? href : undefined);
const safeHref = safeSourceHref;

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
        href={safeHref(href)}
        target="_blank"
        rel="noopener noreferrer"
        className="line-clamp-2 text-sm font-medium leading-5 text-foreground hover:underline"
      >
        {title ?? href}
      </a>
      {snippet && <p className="line-clamp-3 text-xs leading-5 text-muted-foreground">{snippet}</p>}
      <a
        href={safeHref(href)}
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

/** Hover card previewing a source (favicon, domain, title, snippet, link). Renders `children` alone when `disabled`. */
export function CitationHoverCard({
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
      <CitationHoverCard source={{ href, title, snippet }}>
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={safeHref(href)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Source ${index}${title ? `: ${title}` : ""}`}
          className={pill}
          {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {index}
        </a>
      </CitationHoverCard>
    );
  }
);
ChatInlineCitation.displayName = "ChatInlineCitation";
