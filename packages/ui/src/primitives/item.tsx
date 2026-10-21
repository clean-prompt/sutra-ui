import * as React from "react";
import { Slot } from "radix-ui";
import { RiArrowRightSLine } from "@remixicon/react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn, focusRing } from "../lib/cn";
import { Skeleton } from "./progress";
import { ItemListContext } from "./item-internal";

/* A row is media, then a title with a description, then actions. `Item` is that row once, so a list, a settings
   page or a menu of results does not re-draw the padding, the gap and the truncation rule each time. */

const groupVariants = cva("flex min-w-0 flex-col", {
  variants: {
    /**
     * Surface of the group: plain, an outlined card, or a muted tinted panel.
     * @default "plain"
     */
    variant: {
      plain: "",
      outline: "overflow-hidden rounded-box border border-border bg-card",
      muted: "overflow-hidden rounded-box bg-muted/50",
    },
    /**
     * Draws a divider between rows.
     * @default false
     */
    divided: { true: "divide-y divide-border", false: "" },
  },
  defaultVariants: { variant: "plain", divided: false },
});

export interface ItemGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "role">, VariantProps<typeof groupVariants> {
  /** Show placeholder rows in the real row layout while the rows are not known yet. */
  loading?: boolean;
  /** Number of placeholder rows. Default 3. */
  loadingRows?: number;
  /** Shown when there are no children (and not loading). */
  emptyState?: React.ReactNode;
}

/** A list of `Item` rows: plain, an outlined box or a muted tray, with hairlines between rows when `divided`. */
export const ItemGroup = React.forwardRef<HTMLDivElement, ItemGroupProps>(
  ({ className, variant, divided, loading = false, loadingRows = 3, emptyState, children, ...props }, ref) => {
    const empty = !loading && React.Children.toArray(children).length === 0;
    return (
      <div
        ref={ref}
        role="list"
        data-slot="item-group"
        data-variant={variant ?? "plain"}
        aria-busy={loading || undefined}
        className={cn(groupVariants({ variant, divided }), className)}
        {...props}
      >
        <ItemListContext.Provider value>
          {loading ? (
            <>
              <span className="sr-only">Loading…</span>
              {Array.from({ length: Math.max(1, loadingRows) }, (_, i) => (
                <div key={i} role="presentation" aria-hidden="true">
                  <Item>
                    <ItemMedia variant="icon">
                      <Skeleton shape="rect" className="size-full" />
                    </ItemMedia>
                    <ItemContent>
                      <Skeleton shape="text" className="h-3.5 w-1/2" />
                      <Skeleton shape="text" className="h-3 w-3/4" />
                    </ItemContent>
                  </Item>
                </div>
              ))}
            </>
          ) : empty && emptyState != null ? (
            <div role="listitem" className="px-4 py-6 text-center text-sm text-muted-foreground">
              {emptyState}
            </div>
          ) : (
            children
          )}
        </ItemListContext.Provider>
      </div>
    );
  }
);
ItemGroup.displayName = "ItemGroup";

/** A hairline between rows of a group that is not `divided`. */
export const ItemSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} role="presentation" data-slot="item-separator" className={cn("h-px w-full shrink-0 bg-border", className)} {...props} />
));
ItemSeparator.displayName = "ItemSeparator";

const itemVariants = cva("group/item flex w-full min-w-0 text-start text-sm text-foreground", {
  variants: {
    /**
     * Surface of the row: plain, outlined card or muted panel.
     * @default "plain"
     */
    variant: {
      plain: "",
      outline: "rounded-box border border-border bg-card",
      muted: "rounded-box bg-muted/50",
    },
    /**
     * Row padding and gap: `md`, `sm` or `xs`.
     * @default "md"
     */
    size: {
      md: "gap-3 px-4 py-3",
      sm: "gap-2.5 px-3 py-2",
      xs: "gap-2 px-2.5 py-1.5",
    },
    /**
     * Lays the media, content and actions out in a row or stacks them.
     * @default "horizontal"
     */
    orientation: {
      horizontal: "flex-row items-center",
      vertical: "flex-col items-start",
    },
  },
  defaultVariants: { variant: "plain", size: "md", orientation: "horizontal" },
});

export interface ItemProps extends Omit<React.HTMLAttributes<HTMLElement>, "role">, Omit<VariantProps<typeof itemVariants>, "size"> {
  /**
   * Row padding and gap: `md`, `sm` or `xs`. `"default"` is a deprecated alias of `"md"` (same classes); use `"md"`.
   * @default "md"
   */
  size?: "md" | "sm" | "xs" | "default";
  /** Make the row one link. Put no buttons inside it (a link cannot hold interactive content). */
  href?: string;
  /** Make the row one button. Put no buttons inside it. */
  onClick?: React.MouseEventHandler<HTMLElement>;
  /** Render the child element as the row (a router link, say) instead of a `div`. */
  asChild?: boolean;
  /** Show a trailing chevron on a link, button or `asChild` row (added after the child's own content). */
  chevron?: boolean;
  /** A link or button row that cannot be used (`aria-disabled`, dimmed). */
  disabled?: boolean;
  /** Link `target` when `href` is set. */
  target?: string;
  /** Link `rel` when `href` is set. Defaults to `noreferrer noopener` for `target="_blank"`. */
  rel?: string;
}

/** One row: `ItemMedia`, `ItemContent` (`ItemTitle` and `ItemDescription`) and `ItemActions`. Static, or a link or button. */
export const Item = React.forwardRef<HTMLElement, ItemProps>(
  ({ className, variant, size: sizeProp, orientation, href, onClick, asChild, chevron, disabled, children, target, rel, ...props }, ref) => {
    const inGroup = React.useContext(ItemListContext);
    // `"default"` is the deprecated spelling of `"md"`.
    const size = sizeProp === undefined || sizeProp === "default" ? "md" : sizeProp;
    const interactive = Boolean(href || onClick || asChild);
    const classes = cn(
      itemVariants({ variant, size, orientation }),
      interactive && ["relative cursor-pointer transition-colors hover:bg-accent", focusRing, "focus-visible:ring-inset"],
      interactive && disabled && "pointer-events-none opacity-50",
      className
    );
    const chevronIcon =
      chevron && interactive ? (
        <RiArrowRightSLine
          aria-hidden
          className="size-4 shrink-0 self-center text-muted-foreground transition-transform group-hover/item:translate-x-0.5 rtl:group-hover/item:-translate-x-0.5 rtl:-scale-x-100"
        />
      ) : null;
    const content = (
      <>
        {children}
        {chevronIcon}
      </>
    );
    const common = { "data-slot": "item", "data-size": size, "data-disabled": disabled || undefined, className: classes };
    let row: React.ReactElement;
    if (asChild) {
      row = (
        <Slot.Root ref={ref as React.Ref<HTMLElement>} aria-disabled={disabled || undefined} {...common} {...props}>
          <Slot.Slottable>{children as React.ReactElement}</Slot.Slottable>
          {chevronIcon}
        </Slot.Root>
      );
    } else if (href) {
      row = (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={disabled ? undefined : href}
          target={target}
          rel={rel ?? (target === "_blank" ? "noreferrer noopener" : undefined)}
          onClick={onClick as React.MouseEventHandler<HTMLAnchorElement> | undefined}
          aria-disabled={disabled || undefined}
          {...common}
          {...props}
        >
          {content}
        </a>
      );
    } else if (onClick) {
      row = (
        <button
          ref={ref as React.Ref<HTMLButtonElement>}
          type="button"
          onClick={onClick as React.MouseEventHandler<HTMLButtonElement>}
          disabled={disabled}
          {...common}
          {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        >
          {content}
        </button>
      );
    } else {
      row = (
        <div ref={ref as React.Ref<HTMLDivElement>} role={inGroup ? "listitem" : undefined} {...common} {...props}>
          {content}
        </div>
      );
    }
    // A link or button keeps its own role, so a listitem wrapper (a real box, so dividers still work) carries the list semantics.
    return inGroup && interactive ? <div role="listitem">{row}</div> : row;
  }
);
Item.displayName = "Item";

const mediaVariants = cva("flex shrink-0 items-center justify-center overflow-hidden text-muted-foreground [&_svg]:size-4", {
  variants: {
    /**
     * Shape of the media slot: plain, a tinted icon tile, a rounded image or a round avatar.
     * @default "plain"
     */
    variant: {
      plain: "",
      icon: "size-9 rounded-control border border-border bg-muted",
      image: "size-10 rounded-control bg-muted [&_img]:size-full [&_img]:object-cover",
      avatar: "size-10 rounded-full bg-muted [&_img]:size-full [&_img]:object-cover",
    },
  },
  defaultVariants: { variant: "plain" },
});

export interface ItemMediaProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof mediaVariants> {}

/** The leading visual of a row: a bare icon or glyph, an icon tile, an image or an avatar. */
export const ItemMedia = React.forwardRef<HTMLDivElement, ItemMediaProps>(({ className, variant, ...props }, ref) => (
  <div ref={ref} data-slot="item-media" data-variant={variant ?? "plain"} className={cn(mediaVariants({ variant }), className)} {...props} />
));
ItemMedia.displayName = "ItemMedia";

/** The text column of a row: stacks `ItemTitle` and `ItemDescription` and takes the free width. */
export const ItemContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} data-slot="item-content" className={cn("flex min-w-0 flex-1 flex-col gap-0.5", className)} {...props} />
));
ItemContent.displayName = "ItemContent";

/** The plain text of children that are only strings and numbers (`Row {n}` is two text nodes), else undefined: used for the `title` of truncated text. */
function plainText(children: React.ReactNode): string | undefined {
  const parts = React.Children.toArray(children);
  return parts.length > 0 && parts.every((p) => typeof p === "string" || typeof p === "number") ? parts.join("") : undefined;
}

/** The row's title: one truncated line (compose a flex row inside it for badges). */
export const ItemTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, children, title, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="item-title"
    title={title ?? plainText(children)}
    className={cn("min-w-0 truncate font-medium leading-snug text-foreground", className)}
    {...props}
  >
    {children}
  </div>
));
ItemTitle.displayName = "ItemTitle";

export interface ItemDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  /** Lines before truncating: 1 (default), 2, or `"none"` to wrap freely. */
  lines?: 1 | 2 | "none";
}

/** The row's secondary text. */
export const ItemDescription = React.forwardRef<HTMLParagraphElement, ItemDescriptionProps>(
  ({ className, lines = 1, children, title, ...props }, ref) => (
    <p
      ref={ref}
      data-slot="item-description"
      title={title ?? (lines !== "none" ? plainText(children) : undefined)}
      className={cn("min-w-0 text-xs leading-snug text-muted-foreground", lines === 1 ? "truncate" : lines === 2 ? "line-clamp-2" : "", className)}
      {...props}
    >
      {children}
    </p>
  )
);
ItemDescription.displayName = "ItemDescription";

/** Trailing controls of a row (badges, buttons, a switch); never shrinks and wraps nothing. */
export const ItemActions = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} data-slot="item-actions" className={cn("flex shrink-0 items-center gap-1.5", className)} {...props} />
));
ItemActions.displayName = "ItemActions";
