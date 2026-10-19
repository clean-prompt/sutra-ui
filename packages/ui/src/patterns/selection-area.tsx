import * as React from "react";
import { cn, focusRing } from "../lib/cn";
import { accentStyle, type Accent } from "../lib/accent";
import { pluralize } from "../lib/format";
import { clamp } from "../lib/math";
import { useMergedRefs } from "../hooks/use-merged-refs";
import { isEditableTarget } from "../lib/shortcuts";
import {
  MARQUEE_IGNORE_SELECTOR,
  useMarqueeSelection,
  type UseMarqueeSelectionOptions,
} from "../hooks/use-marquee-selection";

const ITEM_SELECTOR = "[data-selection-id]";

export interface SelectionAreaItemProps {
  role: "option";
  "aria-selected": boolean;
  "data-selection-id": string;
  "data-selected": "" | undefined;
  tabIndex: number;
  onClick: React.MouseEventHandler<HTMLElement>;
  onFocus: React.FocusEventHandler<HTMLElement>;
}

export interface SelectionAreaContextValue {
  /** Selected ids. */
  value: string[];
  /** True while a marquee is being dragged. */
  selecting: boolean;
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  /** Replaces the selection. */
  select: (ids: string[]) => void;
  selectAll: () => void;
  clear: () => void;
  /**
   * Props for a selectable item: id, `role="option"`, `aria-selected`, roving `tabIndex` and click selection
   * (plain click selects, Mod-click toggles, Shift-click selects a range). Your own `onClick` / `onFocus` run first;
   * call `event.preventDefault()` in them to skip the built-in behaviour.
   */
  getItemProps: (
    id: string,
    handlers?: { onClick?: React.MouseEventHandler<HTMLElement>; onFocus?: React.FocusEventHandler<HTMLElement> }
  ) => SelectionAreaItemProps;
}

const SelectionAreaContext = React.createContext<SelectionAreaContextValue | null>(null);

/** Selection state and item props from the nearest `SelectionArea`. */
export function useSelectionArea(): SelectionAreaContextValue {
  const ctx = React.useContext(SelectionAreaContext);
  if (!ctx) throw new Error("useSelectionArea must be used inside <SelectionArea>");
  return ctx;
}

export interface SelectionAreaProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "defaultValue" | "onChange">,
    Pick<UseMarqueeSelectionOptions, "mode" | "threshold" | "autoScroll" | "clearOnClick" | "touch" | "disabled"> {
  /** Selected ids (controlled). */
  value?: string[];
  /** Initially selected ids when uncontrolled. */
  defaultValue?: string[];
  /** Called with the selected ids as the selection changes. */
  onValueChange?: (value: string[]) => void;
  /** All item ids in display order: used by select-all and Shift range selection. Default: the DOM order. */
  items?: string[];
  /** Marquee colour. Default: the primary colour. */
  accent?: Accent;
  /** Clicking an item selects it (Mod toggles, Shift selects a range). Default true. */
  selectOnClick?: boolean;
  /** Screen-reader text after the selection count changes. Default "3 items selected" / "No items selected". */
  formatAnnouncement?: (count: number) => string;
  /** The selectable items: a node, or a function that receives the selection API. */
  children?: React.ReactNode | ((api: SelectionAreaContextValue) => React.ReactNode);
}

const defaultAnnouncement = (count: number) =>
  count === 0 ? "No items selected" : `${count} ${pluralize(count, "item")} selected`;

function itemElements(root: HTMLElement | null): HTMLElement[] {
  return root ? Array.from(root.querySelectorAll<HTMLElement>(ITEM_SELECTOR)) : [];
}

function findItem(root: HTMLElement | null, id: string) {
  return itemElements(root).find((el) => el.getAttribute("data-selection-id") === id) ?? null;
}

/** The nearest item in the row above or below `from`, by layout; null when the items have no layout (or none fits). */
function verticalNeighbour(from: HTMLElement, all: HTMLElement[], dir: 1 | -1): HTMLElement | null {
  const cur = from.getBoundingClientRect();
  if (!cur.width && !cur.height) return null;
  const cx = cur.left + cur.width / 2;
  const candidates = all.filter((el) => {
    if (el === from) return false;
    const r = el.getBoundingClientRect();
    return dir === 1 ? r.top >= cur.bottom - 1 : r.bottom <= cur.top + 1;
  });
  if (!candidates.length) return null;
  const rowEdge = (el: HTMLElement) => (dir === 1 ? el.getBoundingClientRect().top : -el.getBoundingClientRect().bottom);
  const nearest = Math.min(...candidates.map(rowEdge));
  const row = candidates.filter((el) => Math.abs(rowEdge(el) - nearest) < Math.max(1, cur.height / 2));
  return row.reduce((best, el) => {
    const r = el.getBoundingClientRect();
    const b = best.getBoundingClientRect();
    return Math.abs(r.left + r.width / 2 - cx) < Math.abs(b.left + b.width / 2 - cx) ? el : best;
  });
}

/**
 * A selectable region: drag on empty space to rubber-band select (Shift adds, Mod toggles), click items to select,
 * Shift-click for ranges, Mod+A selects all, Escape clears, Space toggles the focused item and the arrow keys move
 * focus. Items get their props from `getItemProps(id)` (via `useSelectionArea()` or the render-prop argument).
 */
export const SelectionArea = React.forwardRef<HTMLDivElement, SelectionAreaProps>(
  (
    {
      value: valueProp,
      defaultValue,
      onValueChange,
      items,
      accent,
      mode,
      threshold,
      autoScroll,
      clearOnClick,
      touch,
      disabled = false,
      selectOnClick = true,
      formatAnnouncement = defaultAnnouncement,
      children,
      className,
      style,
      onKeyDown,
      role = "listbox",
      ...props
    },
    forwardedRef
  ) => {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const setRef = useMergedRefs(containerRef, forwardedRef);

    const { value, setValue, box, selecting } = useMarqueeSelection({
      containerRef,
      value: valueProp,
      defaultValue,
      onValueChange,
      mode,
      threshold,
      autoScroll,
      clearOnClick,
      touch,
      disabled,
    });

    const [focusedId, setFocusedId] = React.useState<string | null>(null);
    const anchorRef = React.useRef<string | null>(null);
    const selected = React.useMemo(() => new Set(value), [value]);

    const getOrder = React.useCallback(
      () => items ?? itemElements(containerRef.current).map((el) => el.getAttribute("data-selection-id")!),
      [items]
    );

    const rangeTo = React.useCallback(
      (id: string) => {
        const order = getOrder();
        const anchor = anchorRef.current ?? value[0] ?? id;
        const a = order.indexOf(anchor);
        const b = order.indexOf(id);
        if (a < 0 || b < 0) return [id];
        return order.slice(Math.min(a, b), Math.max(a, b) + 1);
      },
      [getOrder, value]
    );

    const toggle = React.useCallback(
      (id: string) => {
        anchorRef.current = id;
        setValue((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
      },
      [setValue]
    );
    const select = React.useCallback((ids: string[]) => setValue([...new Set(ids)]), [setValue]);
    const selectAll = React.useCallback(() => setValue(getOrder()), [getOrder, setValue]);
    const clear = React.useCallback(() => {
      anchorRef.current = null;
      setValue([]);
    }, [setValue]);

    const focusItem = React.useCallback((id: string) => {
      setFocusedId(id);
      findItem(containerRef.current, id)?.focus();
    }, []);

    const activeId =
      focusedId && (!items || items.includes(focusedId))
        ? focusedId
        : (value.find((id) => !items || items.includes(id)) ?? items?.[0] ?? null);

    const getItemProps = React.useCallback<SelectionAreaContextValue["getItemProps"]>(
      (id, handlers) => ({
        role: "option",
        "aria-selected": selected.has(id),
        "data-selection-id": id,
        "data-selected": selected.has(id) ? "" : undefined,
        tabIndex: id === activeId ? 0 : -1,
        onFocus: (event) => {
          handlers?.onFocus?.(event);
          if (event.target === event.currentTarget) setFocusedId(id);
        },
        onClick: (event) => {
          handlers?.onClick?.(event);
          if (event.defaultPrevented || !selectOnClick || disabled) return;
          // Clicks on a control inside the item (a menu button, a checkbox) are that control's business.
          const control = (event.target as Element).closest(MARQUEE_IGNORE_SELECTOR);
          if (control && control !== event.currentTarget && event.currentTarget.contains(control)) return;
          const mod = event.metaKey || event.ctrlKey;
          setFocusedId(id);
          if (event.shiftKey) {
            const range = rangeTo(id);
            setValue((prev) => (mod ? [...new Set([...prev, ...range])] : range));
          } else if (mod) {
            toggle(id);
          } else {
            anchorRef.current = id;
            setValue([id]);
          }
        },
      }),
      [activeId, disabled, rangeTo, selectOnClick, selected, setValue, toggle]
    );

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented || disabled) return;
      const target = event.target as HTMLElement;
      if (isEditableTarget(target)) return;
      const mod = event.metaKey || event.ctrlKey;
      const item = target.matches(ITEM_SELECTOR) ? target : null;
      const id = item?.getAttribute("data-selection-id") ?? null;

      if (mod && !event.altKey && event.key.toLowerCase() === "a") {
        event.preventDefault();
        selectAll();
        return;
      }
      if (event.key === "Escape") {
        if (value.length) {
          event.preventDefault();
          clear();
        }
        return;
      }
      // Keys below act on the focused item (or, from the container itself, move focus into the items).
      if (!item && target !== containerRef.current) return;
      if (event.key === " " && id) {
        event.preventDefault();
        if (event.shiftKey) setValue(rangeTo(id));
        else toggle(id);
        return;
      }
      const elements = itemElements(containerRef.current);
      if (!elements.length) return;
      const order = getOrder();
      const index = id ? order.indexOf(id) : -1;
      let nextId: string | null = null;
      switch (event.key) {
        case "ArrowRight":
        case "ArrowLeft":
        case "ArrowDown":
        case "ArrowUp": {
          const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
          if (!item) {
            nextId = order[0] ?? null;
            break;
          }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            const neighbour = verticalNeighbour(item, elements, forward ? 1 : -1);
            if (neighbour) {
              nextId = neighbour.getAttribute("data-selection-id");
              break;
            }
          }
          nextId = order[clamp(index + (forward ? 1 : -1), 0, order.length - 1)] ?? null;
          break;
        }
        case "Home":
          nextId = order[0] ?? null;
          break;
        case "End":
          nextId = order[order.length - 1] ?? null;
          break;
        default:
          return;
      }
      event.preventDefault();
      if (!nextId) return;
      if (event.shiftKey && id) {
        if (anchorRef.current == null) anchorRef.current = id;
        setValue(rangeTo(nextId));
      }
      focusItem(nextId);
    };

    // Roving tabindex fallback: when the preferred item isn't rendered, make the first rendered item tabbable; with
    // no items at all, keep the region itself reachable with Tab.
    const [containerTabbable, setContainerTabbable] = React.useState(false);
    React.useEffect(() => {
      const elements = itemElements(containerRef.current).filter((el) => el.hasAttribute("tabindex"));
      if (elements.some((el) => el.getAttribute("tabindex") === "0")) {
        setContainerTabbable(false);
        return;
      }
      const first = elements[0]?.getAttribute("data-selection-id") ?? null;
      if (first != null) setFocusedId(first);
      setContainerTabbable(first == null);
    });

    // Announce selection count changes (not the initial count).
    const count = value.length;
    const prevCountRef = React.useRef(count);
    const [announcement, setAnnouncement] = React.useState("");
    React.useEffect(() => {
      if (prevCountRef.current === count) return;
      prevCountRef.current = count;
      setAnnouncement(formatAnnouncement(count));
    }, [count, formatAnnouncement]);

    const api = React.useMemo<SelectionAreaContextValue>(
      () => ({
        value,
        selecting,
        isSelected: (id) => selected.has(id),
        toggle,
        select,
        selectAll,
        clear,
        getItemProps,
      }),
      [value, selecting, selected, toggle, select, selectAll, clear, getItemProps]
    );

    return (
      <SelectionAreaContext.Provider value={api}>
        <div
          ref={setRef}
          role={role}
          aria-multiselectable={role === "listbox" || role === "grid" || role === "tree" ? true : undefined}
          aria-disabled={disabled || undefined}
          tabIndex={containerTabbable ? 0 : -1}
          data-selecting={selecting ? "" : undefined}
          className={cn("relative", focusRing, selecting && "select-none", className)}
          style={accentStyle(accent, style)}
          onKeyDown={handleKeyDown}
          {...props}
        >
          {typeof children === "function" ? children(api) : children}
          {box && (
            <div
              aria-hidden="true"
              data-slot="selection-area-marquee"
              className="pointer-events-none absolute z-10 rounded-xs border border-[var(--sutra-accent,var(--primary))] bg-[color-mix(in_oklab,var(--sutra-accent,var(--primary))_12%,transparent)]"
              style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
            />
          )}
        </div>
        <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {announcement}
        </span>
      </SelectionAreaContext.Provider>
    );
  }
);
SelectionArea.displayName = "SelectionArea";
