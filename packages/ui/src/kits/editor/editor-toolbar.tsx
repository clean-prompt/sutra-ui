import * as React from "react";
import { RiArrowDownSLine, RiMoreLine } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { logicalArrow } from "../../lib/direction";
import { useIsoLayoutEffect } from "../../hooks/use-iso-layout-effect";
import { useResizeObserver } from "../../hooks/use-resize-observer";
import { Button } from "../../primitives/button";
import { SimpleTooltip } from "../../primitives/tooltip";
import type { ShortcutPlatform } from "../../lib/shortcuts";
import { formatShortcut, isShortcutKeys, useShortcutPlatform } from "../../patterns/shortcuts";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../../primitives/dropdown-menu";

/* ------------------------------------------------------------------ */
/* Types & context                                                     */
/* ------------------------------------------------------------------ */

export interface EditorToolbarMenuItem {
  /** Stable key (defaults to the label). */
  id?: string;
  /** `separator` draws a divider; `label` a section heading. */
  type?: "item" | "separator" | "label";
  label?: React.ReactNode;
  icon?: React.ReactNode;
  description?: React.ReactNode;
  /** Keys spec ("mod+shift+m") or literal hint ("[@…]"). */
  shortcut?: string;
  disabled?: boolean;
  onSelect?: () => void;
}

type ItemMeta =
  | {
      kind: "button";
      label: string;
      icon?: React.ReactNode;
      shortcut?: string;
      pressed?: boolean;
      disabled?: boolean;
      onSelect?: () => void;
    }
  | { kind: "menu"; label: string; icon?: React.ReactNode; items: EditorToolbarMenuItem[]; disabled?: boolean }
  | { kind: "separator" };

interface ToolbarContextValue {
  register: (id: string, meta: ItemMeta | null) => void;
  hidden: ReadonlySet<string>;
  size: "sm" | "md";
}

const ToolbarContext = React.createContext<ToolbarContextValue | null>(null);

function useToolbarItem(meta: ItemMeta) {
  const ctx = React.useContext(ToolbarContext);
  const id = React.useId();
  useIsoLayoutEffect(() => {
    ctx?.register(id, meta);
  });
  useIsoLayoutEffect(() => () => ctx?.register(id, null), [ctx, id]);
  return { id, hidden: ctx?.hidden.has(id) ?? false, size: ctx?.size ?? "sm" };
}

function shortcutText(shortcut: string | undefined, platform: ShortcutPlatform) {
  if (!shortcut) return undefined;
  return isShortcutKeys(shortcut) && /^[\w+\- ]+$/.test(shortcut) && !/^\[/.test(shortcut) ? formatShortcut(shortcut, { platform }) : shortcut;
}

const ITEM_SELECTOR = "[data-toolbar-item]";

/* ------------------------------------------------------------------ */
/* EditorToolbar                                                       */
/* ------------------------------------------------------------------ */

export interface EditorToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Collapse items that don't fit into a "More" menu. Default true. */
  overflow?: boolean;
  /** Label of the overflow button. Default "More tools". */
  moreLabel?: string;
  /** Control size of the tools. Default "sm". */
  size?: "sm" | "md";
  /** Content pinned to the end that never collapses (e.g. an AI button). */
  end?: React.ReactNode;
}

/**
 * Formatting toolbar (`role="toolbar"`) with roving tabindex (arrow keys, Home/End) and
 * overflow collapsing into a "More" menu when the container is too narrow.
 */
export const EditorToolbar = React.forwardRef<HTMLDivElement, EditorToolbarProps>(
  (
    {
      overflow = true,
      moreLabel = "More tools",
      size = "sm",
      end,
      className,
      children,
      onKeyDown,
      onFocus,
      "aria-label": ariaLabel = "Formatting",
      ...props
    },
    forwardedRef
  ) => {
    const rootRef = React.useRef<HTMLDivElement>(null);
    const listRef = React.useRef<HTMLDivElement>(null);
    const moreRef = React.useRef<HTMLDivElement>(null);
    const metas = React.useRef(new Map<string, ItemMeta>());
    const widths = React.useRef(new Map<string, number>());
    const [hidden, setHidden] = React.useState<ReadonlySet<string>>(() => new Set());
    const [moreOpen, setMoreOpen] = React.useState(false);
    const platform = useShortcutPlatform();
    const active = React.useRef(0);
    React.useImperativeHandle(forwardedRef, () => rootRef.current as HTMLDivElement);

    const register = React.useCallback((id: string, meta: ItemMeta | null) => {
      if (meta) metas.current.set(id, meta);
      else metas.current.delete(id);
    }, []);

    const items = React.useCallback(
      () => Array.from(rootRef.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? []).filter((el) => !el.closest("[hidden]")),
      []
    );

    const syncTabIndex = React.useCallback(() => {
      const list = items();
      if (!list.length) return;
      const focusable = list.map((el) => !(el as HTMLButtonElement).disabled);
      let idx = Math.min(active.current, list.length - 1);
      if (!focusable[idx]) idx = focusable.findIndex(Boolean);
      if (idx < 0) idx = 0;
      active.current = idx;
      list.forEach((el, i) => (el.tabIndex = i === idx ? 0 : -1));
    }, [items]);

    const measure = React.useCallback(() => {
      const root = rootRef.current;
      const list = listRef.current;
      if (!root || !list) return;
      const slots = Array.from(list.querySelectorAll<HTMLElement>(":scope > [data-toolbar-slot]"));
      for (const el of slots) {
        const id = el.dataset.toolbarSlot!;
        if (!el.hidden && el.offsetWidth > 0) widths.current.set(id, el.offsetWidth);
      }
      const rootGap = parseFloat(getComputedStyle(root).columnGap) || 0;
      const moreEl = moreRef.current;
      // Width the list would have without the More button.
      const available = list.clientWidth + (moreEl ? moreEl.offsetWidth + rootGap : 0);
      let next = new Set<string>();
      if (overflow && list.clientWidth > 0) {
        const gap = parseFloat(getComputedStyle(list).columnGap) || 0;
        const w = (el: HTMLElement) => widths.current.get(el.dataset.toolbarSlot!) ?? 0;
        const total = slots.reduce((sum, el, i) => sum + w(el) + (i ? gap : 0), 0);
        if (total > available + 0.5) {
          const moreWidth = (moreEl?.offsetWidth || 32) + rootGap;
          let used = 0;
          let cut = slots.length;
          for (let i = 0; i < slots.length; i++) {
            const add = w(slots[i]!) + (i ? gap : 0);
            if (used + add + moreWidth > available) {
              cut = i;
              break;
            }
            used += add;
          }
          // Never end the visible row on a separator.
          while (cut > 0 && slots[cut - 1]!.dataset.toolbarKind === "separator") cut--;
          next = new Set(slots.slice(cut).map((el) => el.dataset.toolbarSlot!));
        }
      }
      setHidden((prev) => (prev.size === next.size && [...next].every((id) => prev.has(id)) ? prev : next));
    }, [overflow]);

    useIsoLayoutEffect(() => {
      measure();
      syncTabIndex();
    });

    useResizeObserver(overflow ? listRef : null, () => measure());

    const move = (e: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(e);
      if (e.defaultPrevented) return;
      const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
      if (!keys.includes(e.key)) return;
      const list = items().filter((el) => !(el as HTMLButtonElement).disabled);
      const current = list.indexOf(document.activeElement as HTMLElement);
      if (current < 0) return;
      e.preventDefault();
      let next = current;
      if (logicalArrow(e) === "ArrowRight") next = (current + 1) % list.length;
      else if (logicalArrow(e) === "ArrowLeft") next = (current - 1 + list.length) % list.length;
      else if (e.key === "Home") next = 0;
      else next = list.length - 1;
      const el = list[next]!;
      active.current = items().indexOf(el);
      syncTabIndex();
      el.focus();
    };

    const trackFocus = (e: React.FocusEvent<HTMLDivElement>) => {
      onFocus?.(e);
      const all = items();
      const idx = all.indexOf((e.target as HTMLElement).closest(ITEM_SELECTOR) as HTMLElement);
      if (idx >= 0 && idx !== active.current) {
        active.current = idx;
        syncTabIndex();
      }
    };

    const ctx = React.useMemo<ToolbarContextValue>(() => ({ register, hidden, size }), [register, hidden, size]);

    const overflowItems = () => {
      const slots = Array.from(listRef.current?.querySelectorAll<HTMLElement>(":scope > [data-toolbar-slot]") ?? []);
      const out: ItemMeta[] = [];
      for (const el of slots) {
        const id = el.dataset.toolbarSlot!;
        const meta = metas.current.get(id);
        if (!hidden.has(id) || !meta) continue;
        if (meta.kind === "separator" && (!out.length || out[out.length - 1]!.kind === "separator")) continue;
        out.push(meta);
      }
      while (out.length && out[out.length - 1]!.kind === "separator") out.pop();
      return out;
    };

    return (
      <ToolbarContext.Provider value={ctx}>
        <div
          ref={rootRef}
          role="toolbar"
          aria-label={ariaLabel}
          aria-orientation="horizontal"
          data-slot="editor-toolbar"
          onKeyDown={move}
          onFocus={trackFocus}
          className={cn("flex min-w-0 items-center gap-1 border-b border-border bg-background px-2 py-1", className)}
          {...props}
        >
          <div ref={listRef} className="flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden">
            {children}
          </div>
          {overflow && hidden.size > 0 && (
            <div ref={moreRef} className="shrink-0">
              <DropdownMenu open={moreOpen} onOpenChange={setMoreOpen}>
                <SimpleTooltip content={moreLabel} disabled={moreOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      data-toolbar-item=""
                      data-toolbar-more=""
                      variant="ghost"
                      size={size === "sm" ? "icon-sm" : "icon"}
                      aria-label={moreLabel}
                    >
                      <RiMoreLine aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                </SimpleTooltip>
                <DropdownMenuContent align="end" className="min-w-56">
                  {overflowItems().map((meta, i) => renderOverflowMeta(meta, i, platform))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          {end != null && <div className="flex shrink-0 items-center gap-1">{end}</div>}
        </div>
      </ToolbarContext.Provider>
    );
  }
);
EditorToolbar.displayName = "EditorToolbar";

function renderMenuItems(items: EditorToolbarMenuItem[], platform: ShortcutPlatform) {
  return items.map((item, i) => {
    const key = item.id ?? (typeof item.label === "string" ? item.label : String(i));
    if (item.type === "separator") return <DropdownMenuSeparator key={`sep-${i}`} />;
    if (item.type === "label") return <DropdownMenuLabel key={key}>{item.label}</DropdownMenuLabel>;
    return (
      <DropdownMenuItem
        key={key}
        icon={item.icon}
        description={item.description}
        shortcut={shortcutText(item.shortcut, platform)}
        disabled={item.disabled}
        onSelect={() => item.onSelect?.()}
      >
        {item.label}
      </DropdownMenuItem>
    );
  });
}

function renderOverflowMeta(meta: ItemMeta, i: number, platform: ShortcutPlatform) {
  if (meta.kind === "separator") return <DropdownMenuSeparator key={`sep-${i}`} />;
  if (meta.kind === "menu")
    return (
      <DropdownMenuSub key={`${meta.label}-${i}`}>
        <DropdownMenuSubTrigger icon={meta.icon} disabled={meta.disabled}>
          {meta.label}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="min-w-56">{renderMenuItems(meta.items, platform)}</DropdownMenuSubContent>
      </DropdownMenuSub>
    );
  if (meta.pressed != null)
    return (
      <DropdownMenuCheckboxItem
        key={`${meta.label}-${i}`}
        checked={meta.pressed}
        disabled={meta.disabled}
        shortcut={shortcutText(meta.shortcut, platform)}
        onSelect={() => meta.onSelect?.()}
      >
        {meta.label}
      </DropdownMenuCheckboxItem>
    );
  return (
    <DropdownMenuItem
      key={`${meta.label}-${i}`}
      icon={meta.icon}
      disabled={meta.disabled}
      shortcut={shortcutText(meta.shortcut, platform)}
      onSelect={() => meta.onSelect?.()}
    >
      {meta.label}
    </DropdownMenuItem>
  );
}

/* ------------------------------------------------------------------ */
/* EditorToolbarButton                                                 */
/* ------------------------------------------------------------------ */

export interface EditorToolbarButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Accessible name, tooltip text and overflow-menu label. */
  label: string;
  /** Icon of the button. */
  icon?: React.ReactNode;
  /** Keys spec for the tooltip ("mod+b"). */
  shortcut?: string;
  /** Toggle state (sets `aria-pressed`). */
  pressed?: boolean;
  /** Show the label next to the icon. */
  showLabel?: boolean;
  /** Tooltip side. Default "bottom". */
  tooltipSide?: "top" | "bottom" | "left" | "right";
}

/** Toolbar tool: icon button with a tooltip (label + shortcut keys) and optional pressed state. */
export const EditorToolbarButton = React.forwardRef<HTMLButtonElement, EditorToolbarButtonProps>(
  ({ label, icon, shortcut, pressed, showLabel, tooltipSide = "bottom", className, onClick, disabled, ...props }, ref) => {
    const innerRef = React.useRef<HTMLButtonElement>(null);
    React.useImperativeHandle(ref, () => innerRef.current as HTMLButtonElement);
    const { id, hidden, size } = useToolbarItem({
      kind: "button",
      label,
      icon,
      shortcut,
      pressed,
      disabled,
      // The real (hidden) button is clicked so handlers get a genuine event.
      onSelect: () => innerRef.current?.click(),
    });
    const iconOnly = !showLabel && icon != null;
    return (
      <span data-toolbar-slot={id} data-toolbar-kind="button" hidden={hidden || undefined} className="inline-flex shrink-0">
        <SimpleTooltip content={label} shortcut={shortcut} side={tooltipSide} disabled={!iconOnly && !shortcut}>
          <Button
            ref={innerRef}
            type="button"
            data-toolbar-item=""
            variant="ghost"
            size={iconOnly ? (size === "sm" ? "icon-sm" : "icon") : size === "sm" ? "sm" : "md"}
            aria-label={iconOnly ? label : undefined}
            aria-pressed={pressed}
            data-state={pressed == null ? undefined : pressed ? "on" : "off"}
            disabled={disabled}
            onClick={onClick}
            className={cn(
              "text-muted-foreground hover:text-foreground aria-pressed:bg-accent aria-pressed:text-foreground",
              !iconOnly && "px-2.5",
              className
            )}
            {...props}
          >
            {icon}
            {!iconOnly && <span>{label}</span>}
          </Button>
        </SimpleTooltip>
      </span>
    );
  }
);
EditorToolbarButton.displayName = "EditorToolbarButton";

/* ------------------------------------------------------------------ */
/* EditorToolbarSeparator                                              */
/* ------------------------------------------------------------------ */

/** Vertical divider between tool groups. */
export const EditorToolbarSeparator = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => {
    const { id, hidden } = useToolbarItem({ kind: "separator" });
    return (
      <span
        ref={ref}
        role="separator"
        aria-orientation="vertical"
        data-toolbar-slot={id}
        data-toolbar-kind="separator"
        hidden={hidden || undefined}
        className={cn("mx-1 h-5 w-px shrink-0 bg-border", className)}
        {...props}
      />
    );
  }
);
EditorToolbarSeparator.displayName = "EditorToolbarSeparator";

/* ------------------------------------------------------------------ */
/* EditorToolbarMenu                                                   */
/* ------------------------------------------------------------------ */

export interface EditorToolbarMenuProps {
  /** Accessible name and menu label of the trigger. */
  label: string;
  /** Icon of the trigger. */
  icon?: React.ReactNode;
  /** Menu entries, each with a label, optional icon, shortcut and handler. */
  items: EditorToolbarMenuItem[];
  /** Show the label text (default true); icon-only otherwise. */
  showLabel?: boolean;
  /** Disables the trigger. */
  disabled?: boolean;
  /** Extra content under the items (e.g. a hint). */
  footer?: React.ReactNode;
  /** Alignment of the menu against the trigger. */
  align?: "start" | "center" | "end";
  /** Extra classes for the trigger. */
  className?: string;
  /** Extra classes for the menu content. */
  contentClassName?: string;
}

/** Dropdown tool (e.g. Insert ▸ Math, Mermaid, Callout) whose items carry icon, description and shortcut. */
export const EditorToolbarMenu = React.forwardRef<HTMLButtonElement, EditorToolbarMenuProps>(
  ({ label, icon, items, showLabel = true, disabled, footer, align = "start", className, contentClassName }, ref) => {
    const { id, hidden, size } = useToolbarItem({ kind: "menu", label, icon, items, disabled });
    const [open, setOpen] = React.useState(false);
    const platform = useShortcutPlatform();
    const iconOnly = !showLabel && icon != null;
    return (
      <span data-toolbar-slot={id} data-toolbar-kind="menu" hidden={hidden || undefined} className="inline-flex shrink-0">
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <SimpleTooltip content={label} side="bottom" disabled={!iconOnly || open}>
            <DropdownMenuTrigger asChild disabled={disabled}>
              <Button
                ref={ref}
                data-toolbar-item=""
                variant="ghost"
                size={size === "sm" ? "sm" : "md"}
                aria-label={iconOnly ? label : undefined}
                className={cn("gap-1 px-2 text-muted-foreground hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground", className)}
              >
                {icon}
                {!iconOnly && <span>{label}</span>}
                <RiArrowDownSLine aria-hidden className="size-3.5! opacity-70" />
              </Button>
            </DropdownMenuTrigger>
          </SimpleTooltip>
          <DropdownMenuContent align={align} className={cn("min-w-60", contentClassName)}>
            {renderMenuItems(items, platform)}
            {footer != null && (
              <>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-xs text-muted-foreground">{footer}</div>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </span>
    );
  }
);
EditorToolbarMenu.displayName = "EditorToolbarMenu";
