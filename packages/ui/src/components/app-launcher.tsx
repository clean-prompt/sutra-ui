import * as React from "react";
import { RiAppsLine } from "@remixicon/react";
import { cn, focusRing, normalizeDensity, type Density } from "../lib/cn";
import { formatBadgeCount } from "../lib/format";
import { initials } from "../lib/text";
import { SutraAppIcon, type SutraApp } from "../assets/brand";
import { useControllableState } from "../hooks/use-controllable-state";
import { Button } from "./button";
import { SearchInput } from "./input";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "./context-menu";

export interface AppLauncherItem {
  id: string;
  label: string;
  /** A Sutra suite app: renders its `SutraAppIcon` and themes the tile with `data-app`. */
  app?: SutraApp;
  /** Custom icon (overrides the app icon). */
  icon?: React.ReactNode;
  /** Unread / notification count. */
  badge?: number;
  href?: string;
  onSelect?: () => void;
  disabled?: boolean;
  /** Extra search terms. */
  keywords?: string[];
}

/** Case-insensitive filter over label, app id and keywords. */
export function filterLauncherItems(items: AppLauncherItem[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) =>
    [item.label, item.app ?? "", ...(item.keywords ?? [])].some((s) => s.toLowerCase().includes(q))
  );
}

export type AppLauncherVariant = "grid" | "dock" | "popover";

export interface AppLauncherProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  items: AppLauncherItem[];
  /** `grid` home-screen grid, `dock` single row, `popover` 3×3 waffle menu (see `AppLauncherMenu`). */
  variant?: AppLauncherVariant;
  /** Grid columns (grid variant). Default 4. */
  columns?: number;
  /** Show a search field that filters the tiles. */
  searchable?: boolean;
  query?: string;
  defaultQuery?: string;
  onQueryChange?: (query: string) => void;
  onSelect?: (item: AppLauncherItem) => void;
  /** Right-click / long-press menu for a tile: return `ContextMenuItem`s. */
  renderMenu?: (item: AppLauncherItem) => React.ReactNode;
  /** Icon size in px. */
  iconSize?: number;
  /** Accessible name of the grid. */
  label?: string;
  /** Hide tile labels (dock). */
  hideLabels?: boolean;
  /** Tile padding. Default: `compact` for the dock, `normal` otherwise. */
  density?: Density;
}

interface TileProps {
  item: AppLauncherItem;
  iconSize: number;
  tabIndex: number;
  hideLabel?: boolean;
  compact?: boolean;
  onActivate: (item: AppLauncherItem) => void;
  onFocusTile: () => void;
  tileRef: (el: HTMLElement | null) => void;
}

const AppLauncherTile = ({ item, iconSize, tabIndex, hideLabel, compact, onActivate, onFocusTile, tileRef }: TileProps) => {
  const icon = item.icon ?? (item.app ? <SutraAppIcon app={item.app} size={iconSize} shape="squircle" /> : null);
  const name = item.badge ? `${item.label}, ${item.badge} new` : item.label;
  const className = cn(
    "group/tile relative flex w-full flex-col items-center gap-1.5 rounded-box p-2 text-center",
    "transition-[background-color,transform] duration-150 hover:bg-primary-soft active:scale-95",
    "aria-disabled:pointer-events-none aria-disabled:opacity-50",
    compact && "p-1.5",
    focusRing
  );
  const content = (
    <>
      <span className="relative inline-flex [&>svg]:shadow-sm" style={{ minWidth: iconSize, minHeight: iconSize }}>
        {icon ?? (
          <span
            className="flex items-center justify-center rounded-[30%] bg-gradient-to-br from-brand-400 to-brand-600 font-semibold text-white"
            style={{ width: iconSize, height: iconSize, fontSize: iconSize * 0.4 }}
            aria-hidden
          >
            {initials(item.label, { max: 1 })}
          </span>
        )}
        {item.badge ? (
          <span
            aria-hidden
            className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-2xs font-semibold text-destructive-foreground tabular-nums ring-2 ring-background"
          >
            {formatBadgeCount(item.badge)}
          </span>
        ) : null}
      </span>
      <span className={cn("w-full truncate text-xs font-medium text-foreground", hideLabel && "sr-only")}>{item.label}</span>
    </>
  );
  const common = {
    "data-app": item.app,
    "data-launcher-tile": item.id,
    "aria-label": name,
    "aria-disabled": item.disabled || undefined,
    tabIndex,
    className,
    onFocus: onFocusTile,
  };
  return item.href && !item.disabled ? (
    <a
      {...common}
      ref={tileRef as React.Ref<HTMLAnchorElement>}
      href={item.href}
      onClick={() => onActivate(item)}
    >
      {content}
    </a>
  ) : (
    <button
      {...common}
      ref={tileRef as React.Ref<HTMLButtonElement>}
      type="button"
      onClick={() => !item.disabled && onActivate(item)}
    >
      {content}
    </button>
  );
};

/** Home-screen grid (or dock) of app tiles with arrow-key navigation, search, badges and a context menu slot. */
export const AppLauncher = React.forwardRef<HTMLDivElement, AppLauncherProps>(
  (
    {
      items,
      variant = "grid",
      columns: columnsProp,
      searchable,
      query: queryProp,
      defaultQuery = "",
      onQueryChange,
      onSelect,
      renderMenu,
      iconSize: iconSizeProp,
      label = "Apps",
      hideLabels,
      density,
      className,
      ...props
    },
    ref
  ) => {
    const [query, setQuery] = useControllableState({ value: queryProp, defaultValue: defaultQuery, onChange: onQueryChange });
    const [active, setActive] = React.useState(0);
    const tiles = React.useRef<(HTMLElement | null)[]>([]);
    const visible = React.useMemo(() => filterLauncherItems(items, query), [items, query]);

    if (variant === "popover") {
      return <AppLauncherMenu items={items} onSelect={onSelect} renderMenu={renderMenu} searchable={searchable} label={label} />;
    }

    const isDock = variant === "dock";
    const tileDensity = normalizeDensity(density, isDock ? "compact" : "normal");
    const columns = isDock ? Math.max(visible.length, 1) : (columnsProp ?? 4);
    const iconSize = iconSizeProp ?? (isDock ? 44 : 52);
    const current = Math.min(active, Math.max(visible.length - 1, 0));

    const focusAt = (index: number) => {
      const next = Math.max(0, Math.min(visible.length - 1, index));
      setActive(next);
      tiles.current[next]?.focus();
    };

    const onKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
      // Keys from portaled content (tile context menus) bubble through React; leave them alone.
      if (event.defaultPrevented || !event.currentTarget.contains(event.target as Node)) return;
      const keys: Record<string, number> = {
        ArrowRight: current + 1,
        ArrowLeft: current - 1,
        ArrowDown: isDock ? current : current + columns,
        ArrowUp: isDock ? current : current - columns,
        Home: 0,
        End: visible.length - 1,
      };
      if (!(event.key in keys)) return;
      event.preventDefault();
      const target = keys[event.key]!;
      if (target < 0 || target >= visible.length) return;
      focusAt(target);
    };

    const onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.nativeEvent.isComposing || event.keyCode === 229) return;
      if (event.key === "ArrowDown" && visible.length) {
        event.preventDefault();
        focusAt(0);
      } else if (event.key === "Enter" && visible[0]) {
        event.preventDefault();
        activate(visible[0]);
      }
    };

    const activate = (item: AppLauncherItem) => {
      item.onSelect?.();
      onSelect?.(item);
    };

    return (
      <div ref={ref} className={cn("flex flex-col gap-3", className)} {...props}>
        {searchable ? (
          <SearchInput
            size="sm"
            aria-label={`Search ${label.toLowerCase()}`}
            placeholder="Search apps…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onClear={() => setQuery("")}
            onKeyDown={onSearchKeyDown}
          />
        ) : null}
        {visible.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No apps match “{query}”</p>
        ) : (
          <ul
            aria-label={label}
            onKeyDown={onKeyDown}
            data-variant={variant}
            data-density={tileDensity}
            className={cn(
              "grid gap-1",
              isDock && "glass w-fit rounded-2xl border border-border p-1.5 shadow-lg"
            )}
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {visible.map((item, index) => {
              const tile = (
                <AppLauncherTile
                  item={item}
                  iconSize={iconSize}
                  tabIndex={index === current ? 0 : -1}
                  hideLabel={hideLabels ?? isDock}
                  compact={tileDensity === "compact"}
                  onActivate={activate}
                  onFocusTile={() => setActive(index)}
                  tileRef={(el) => {
                    tiles.current[index] = el;
                  }}
                />
              );
              const menu = renderMenu?.(item);
              return (
                <li key={item.id} data-app={item.app} className="min-w-0">
                  {menu ? (
                    <ContextMenu>
                      <ContextMenuTrigger asChild>
                        <div>{tile}</div>
                      </ContextMenuTrigger>
                      <ContextMenuContent>{menu}</ContextMenuContent>
                    </ContextMenu>
                  ) : (
                    tile
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }
);
AppLauncher.displayName = "AppLauncher";

export interface AppLauncherMenuProps {
  items: AppLauncherItem[];
  onSelect?: (item: AppLauncherItem) => void;
  renderMenu?: (item: AppLauncherItem) => React.ReactNode;
  searchable?: boolean;
  /** Accessible name of the trigger and grid. */
  label?: string;
  /** Custom trigger element (defaults to a waffle icon button). */
  trigger?: React.ReactElement;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Content below the grid, e.g. a "More apps" link. */
  footer?: React.ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
}

/** Waffle-button app switcher: a popover with a 3-column launcher grid. */
export function AppLauncherMenu({
  items,
  onSelect,
  renderMenu,
  searchable,
  label = "Apps",
  trigger,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  footer,
  align = "end",
  className,
}: AppLauncherMenuProps) {
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon" aria-label={label}>
            <RiAppsLine aria-hidden />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align={align} size="auto" className={cn("w-80 p-3", className)} aria-label={label}>
        <AppLauncher
          items={items}
          columns={3}
          iconSize={44}
          searchable={searchable}
          label={label}
          renderMenu={renderMenu}
          onSelect={(item) => {
            onSelect?.(item);
            setOpen(false);
          }}
        />
        {footer ? <div className="mt-2 border-t border-border pt-2">{footer}</div> : null}
      </PopoverContent>
    </Popover>
  );
}
