import * as React from "react";
import { Collapsible as CollapsiblePrimitive } from "radix-ui";
import { RiArrowRightSLine, RiLinksLine } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { escapeRegExp } from "../../lib/text";
import { SutraAppIcon, sutraAppMeta, sutraApps, type SutraApp } from "../../assets/brand";
import { EntityChip, entityTypeLabel, type EntityRef, type EntityType } from "./entity-mention";

export interface BacklinkItem {
  id: string;
  /** The item that links here. */
  source: EntityRef;
  /** Text around the link. */
  snippet?: string;
  /** Terms to highlight in this snippet (falls back to the panel's `highlight`). */
  match?: string | string[];
}

export interface BacklinksProps extends Omit<React.HTMLAttributes<HTMLElement>, "title" | "onSelect"> {
  /** Items that link here, each with a title, app, snippet and optional date. */
  items: BacklinkItem[];
  /** Term(s) highlighted in every snippet, usually the current item's title. */
  highlight?: string | string[];
  /** Heading. Default "Linked from N items". */
  title?: React.ReactNode;
  /** Controlled expanded state of the list. */
  open?: boolean;
  /** Initial expanded state when `open` is not controlled. */
  defaultOpen?: boolean;
  /** Called with the new state when the user expands or collapses the list. */
  onOpenChange?: (open: boolean) => void;
  /** Group rows under app headings. Default true. */
  groupByApp?: boolean;
  /** Called with the item when the user opens a backlink. */
  onSelect?: (item: BacklinkItem) => void;
  /** Shown when there are no backlinks. */
  emptyState?: React.ReactNode;
}

export interface BacklinkSnippetProps extends React.HTMLAttributes<HTMLParagraphElement> {
  /** Excerpt of the linking item. */
  text: string;
  /** Term or terms marked inside the excerpt. */
  highlight?: string | string[];
}

/** Snippet with case-insensitive matches wrapped in <mark>. */
export const BacklinkSnippet = React.forwardRef<HTMLParagraphElement, BacklinkSnippetProps>(
  ({ text, highlight, className, ...props }, ref) => {
    const terms = (Array.isArray(highlight) ? highlight : highlight ? [highlight] : []).filter((t) => t.trim());
    let parts: React.ReactNode[] = [text];
    if (terms.length) {
      const re = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi");
      parts = text.split(re).map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded-xs bg-primary-soft px-0.5 text-primary-soft-foreground">
            {part}
          </mark>
        ) : (
          part
        )
      );
    }
    return (
      <p ref={ref} className={cn("line-clamp-2 text-sm text-muted-foreground", className)} data-slot="backlink-snippet" {...props}>
        {parts}
      </p>
    );
  }
);
BacklinkSnippet.displayName = "BacklinkSnippet";

const typeOrder = (t: EntityType) => {
  const i = (sutraApps as readonly string[]).indexOf(t);
  return i < 0 ? 99 : i;
};

/** "Linked from N items" panel: backlinks grouped by app with highlighted context snippets. */
export const Backlinks = React.forwardRef<HTMLElement, BacklinksProps>(
  (
    {
      items,
      highlight,
      title,
      open: openProp,
      defaultOpen = true,
      onOpenChange,
      groupByApp = true,
      onSelect,
      emptyState,
      className,
      ...props
    },
    ref
  ) => {
    const [openState, setOpenState] = React.useState(defaultOpen);
    const open = openProp ?? openState;
    const setOpen = (next: boolean) => {
      if (openProp === undefined) setOpenState(next);
      onOpenChange?.(next);
    };
    const headingId = React.useId();
    const count = items.length;
    const heading = title ?? `Linked from ${count} ${count === 1 ? "item" : "items"}`;

    const groups = React.useMemo(() => {
      if (!groupByApp) return [{ type: null as EntityType | null, items }];
      const map = new Map<EntityType, BacklinkItem[]>();
      for (const item of items) {
        if (!map.has(item.source.type)) map.set(item.source.type, []);
        map.get(item.source.type)!.push(item);
      }
      return [...map.entries()]
        .sort((a, b) => typeOrder(a[0]) - typeOrder(b[0]))
        .map(([type, list]) => ({ type: type as EntityType | null, items: list }));
    }, [items, groupByApp]);

    return (
      <CollapsiblePrimitive.Root asChild open={open} onOpenChange={setOpen}>
        <section ref={ref} aria-labelledby={headingId} className={cn("rounded-box border border-border bg-card", className)} data-slot="backlinks" {...props}>
          <h2 id={headingId} className="m-0">
            <CollapsiblePrimitive.Trigger
              className={cn(
                "group/backlinks flex w-full items-center gap-2 rounded-box px-4 py-3 text-start text-sm font-medium text-foreground hover:bg-accent/60",
                focusRing
              )}
            >
              <RiLinksLine aria-hidden className="size-4 text-muted-foreground" />
              <span className="flex-1">{heading}</span>
              <RiArrowRightSLine
                aria-hidden
                className="size-4 text-muted-foreground chevron-turn group-data-[state=open]/backlinks:rotate-90 rtl:group-data-[state=open]/backlinks:-rotate-90 rtl:-scale-x-100"
              />
            </CollapsiblePrimitive.Trigger>
          </h2>
          <CollapsiblePrimitive.Content className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
            <div className="border-t border-border px-4 pb-4 pt-3">
              {count === 0 ? (
                emptyState ?? (
                  <div className="flex flex-col items-center gap-1 py-6 text-center">
                    <RiLinksLine aria-hidden className="size-6 text-muted-foreground/60" />
                    <p className="text-sm font-medium text-foreground">No backlinks yet</p>
                    <p className="text-xs text-muted-foreground">Mention this item elsewhere with @ or # to link it here.</p>
                  </div>
                )
              ) : (
                <div className="flex flex-col gap-4">
                  {groups.map((group) => (
                    <div key={group.type ?? "all"} data-app={group.type && group.type in sutraAppMeta ? group.type : undefined}>
                      {group.type && (
                        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {group.type in sutraAppMeta && <SutraAppIcon app={group.type as SutraApp} size={14} shape="squircle" />}
                          {entityTypeLabel(group.type)}
                          <span className="font-normal normal-case tracking-normal">({group.items.length})</span>
                        </h3>
                      )}
                      <ul className="flex flex-col gap-1">
                        {group.items.map((item) => (
                          <li key={item.id} className="flex flex-col items-start gap-1 rounded-md p-2 hover:bg-accent/40">
                            <EntityChip {...item.source} size="sm" onClick={onSelect ? () => onSelect(item) : undefined} />
                            {item.snippet && <BacklinkSnippet text={item.snippet} highlight={item.match ?? highlight} />}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CollapsiblePrimitive.Content>
        </section>
      </CollapsiblePrimitive.Root>
    );
  }
);
Backlinks.displayName = "Backlinks";
