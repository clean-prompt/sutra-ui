import * as React from "react";
import { cn, focusRing, type Size } from "../lib/cn";
import { useActiveIndicator } from "../hooks/use-active-indicator";
import { useControllableState } from "../hooks/use-controllable-state";
import { useScrollEdges } from "../hooks/use-scroll-edges";

export interface TabMenuItem {
  value: string;
  label: React.ReactNode;
  href?: string;
  icon?: React.ReactNode;
  count?: React.ReactNode;
  disabled?: boolean;
}

export interface TabMenuLinkProps {
  href: string;
  className: string;
  children: React.ReactNode;
  "aria-current"?: "page";
  "data-active"?: true;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
  ref: (node: HTMLElement | null) => void;
}

export interface TabMenuProps extends Omit<React.HTMLAttributes<HTMLElement>, "onChange" | "defaultValue"> {
  items: TabMenuItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  size?: Size;
  /** Render items with an `href` through your router's Link. Spread the given props onto it. */
  renderLink?: (props: TabMenuLinkProps, item: TabMenuItem) => React.ReactElement;
  /** Draw the bottom border across the full width. Default true. */
  bordered?: boolean;
}

const itemSize: Record<Size, string> = {
  sm: "h-9 text-xs",
  md: "h-11 text-sm",
  lg: "h-12 text-sm",
};

/** Link-style tab bar for page sections, with an animated underline and scroll fades. */
export const TabMenu = React.forwardRef<HTMLElement, TabMenuProps>(
  (
    {
      items,
      value: valueProp,
      defaultValue,
      onValueChange,
      size = "md",
      renderLink,
      bordered = true,
      className,
      "aria-label": ariaLabel = "Sections",
      ...props
    },
    ref
  ) => {
    const [value, setValue] = useControllableState<string>({
      value: valueProp,
      defaultValue: defaultValue ?? items[0]?.value ?? "",
      onChange: onValueChange,
    });

    const scrollerRef = React.useRef<HTMLDivElement | null>(null);
    const itemRefs = React.useRef(new Map<string, HTMLElement>());
    const { rect: indicator, animate } = useActiveIndicator(scrollerRef, () => itemRefs.current.get(value), [value, items]);
    const edges = useScrollEdges(scrollerRef);
    const fade = { start: edges.left, end: edges.right };

    React.useEffect(() => {
      // Scroll only the tab strip (scrollIntoView would also scroll the page).
      const el = itemRefs.current.get(value);
      const scroller = scrollerRef.current;
      if (!el || !scroller) return;
      const left = el.offsetLeft;
      const right = left + el.offsetWidth;
      let target: number | null = null;
      if (left < scroller.scrollLeft) target = left - 16;
      else if (right > scroller.scrollLeft + scroller.clientWidth) target = right - scroller.clientWidth + 16;
      if (target != null) scroller.scrollTo({ left: Math.max(0, target), behavior: animate ? "smooth" : "auto" });
    }, [value]);

    const setItemRef = (key: string) => (node: HTMLElement | null) => {
      if (node) itemRefs.current.set(key, node);
      else itemRefs.current.delete(key);
    };

    return (
      <nav
        ref={ref}
        aria-label={ariaLabel}
        className={cn("relative min-w-0", bordered && "border-b border-border", className)}
        {...props}
      >
        <div
          ref={scrollerRef}
          className="relative overflow-x-auto overflow-y-hidden scrollbar-none"
        >
          <ul className="relative flex w-max min-w-full items-stretch gap-6 px-px">
            {items.map((item) => {
              const active = item.value === value;
              const className = cn(
                "group/tab-menu relative inline-flex select-none items-center gap-2 whitespace-nowrap rounded-xs font-medium transition-colors duration-150",
                "[&_svg]:size-4 [&_svg]:shrink-0",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                item.disabled && "pointer-events-none opacity-50",
                itemSize[size],
                focusRing,
                "focus-visible:ring-inset"
              );
              const children = (
                <>
                  {item.icon}
                  <span>{item.label}</span>
                  {item.count != null && (
                    <span
                      className={cn(
                        "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-2xs font-semibold tabular-nums transition-colors",
                        active ? "bg-primary-soft text-primary-soft-foreground" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {item.count}
                    </span>
                  )}
                </>
              );
              const onClick = (event: React.MouseEvent<HTMLElement>) => {
                if (item.disabled) {
                  event.preventDefault();
                  return;
                }
                setValue(item.value);
              };

              let node: React.ReactNode;
              if (item.href && renderLink) {
                node = renderLink(
                  {
                    href: item.href,
                    className,
                    children,
                    "aria-current": active ? "page" : undefined,
                    "data-active": active ? true : undefined,
                    onClick,
                    ref: setItemRef(item.value),
                  },
                  item
                );
              } else if (item.href) {
                node = (
                  <a
                    ref={setItemRef(item.value)}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    aria-disabled={item.disabled || undefined}
                    data-active={active || undefined}
                    className={className}
                    onClick={onClick}
                  >
                    {children}
                  </a>
                );
              } else {
                node = (
                  <button
                    ref={setItemRef(item.value)}
                    type="button"
                    aria-current={active ? "page" : undefined}
                    data-active={active || undefined}
                    disabled={item.disabled}
                    className={className}
                    onClick={onClick}
                  >
                    {children}
                  </button>
                );
              }
              return (
                <li key={item.value} className="flex">
                  {node}
                </li>
              );
            })}
          </ul>
          {indicator && (
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute bottom-0 h-0.5 rounded-full bg-foreground",
                animate && "transition-[left,width] duration-300 ease-out-quart motion-reduce:transition-none"
              )}
              style={{ left: indicator.left, width: indicator.width }}
            />
          )}
        </div>
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 w-8 bg-linear-to-r from-background to-transparent transition-opacity duration-200",
            fade.start ? "opacity-100" : "opacity-0"
          )}
        />
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 w-8 bg-linear-to-l from-background to-transparent transition-opacity duration-200",
            fade.end ? "opacity-100" : "opacity-0"
          )}
        />
      </nav>
    );
  }
);
TabMenu.displayName = "TabMenu";
