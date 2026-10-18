import * as React from "react";
import { RiArrowDownSLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { useIsoLayoutEffect } from "../hooks/use-iso-layout-effect";
import { useResizeObserver } from "../hooks/use-resize-observer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { assignRef } from "../lib/refs";

/* ------------------------------------------------------------------ */
/* TabDropdown                                                         */
/* ------------------------------------------------------------------ */

export interface TabDropdownItem {
  value: string;
  label: React.ReactNode;
  /** Plain-text label for the overflow menu / measuring (defaults to `label` when it is a string). */
  textValue?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface TabDropdownProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  items: TabDropdownItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Label of the overflow trigger. Default "More". */
  moreLabel?: string;
  /** Accessible name of the tab list. */
  label?: string;
  size?: "sm" | "md";
}

/** A tab bar that collapses tabs which don't fit into a "More" dropdown (ResizeObserver-driven). */
export const TabDropdown = React.forwardRef<HTMLDivElement, TabDropdownProps>(
  (
    { items, value, defaultValue, onValueChange, moreLabel = "More", label = "Tabs", size = "md", className, ...props },
    forwardedRef
  ) => {
    const [selected, setSelected] = useControllableState<string>({
      value,
      defaultValue: defaultValue ?? items[0]?.value ?? "",
      onChange: onValueChange,
    });
    const rootRef = React.useRef<HTMLDivElement | null>(null);
    const measureRef = React.useRef<HTMLDivElement>(null);
    const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
    const [visibleCount, setVisibleCount] = React.useState(items.length);

    const measure = React.useCallback(() => {
      const root = rootRef.current;
      const m = measureRef.current;
      if (!root || !m) return;
      const available = root.offsetWidth;
      const nodes = Array.from(m.querySelectorAll<HTMLElement>("[data-tab-measure]"));
      const widths = nodes.map((n) => n.offsetWidth);
      const moreWidth = m.querySelector<HTMLElement>("[data-tab-measure-more]")?.offsetWidth ?? 0;
      const gap = 4;
      if (!available || widths.every((w) => !w)) {
        setVisibleCount(items.length);
        return;
      }
      const total = widths.reduce((a, w) => a + w + gap, 0);
      if (total <= available) {
        setVisibleCount(items.length);
        return;
      }
      let used = moreWidth + gap;
      let count = 0;
      for (const w of widths) {
        if (used + w + gap > available) break;
        used += w + gap;
        count++;
      }
      setVisibleCount(Math.max(0, count));
    }, [items.length]);

    useIsoLayoutEffect(() => {
      measure();
    }, [measure, items]);

    useResizeObserver(rootRef, () => measure());

    const text = (it: TabDropdownItem) => it.textValue ?? (typeof it.label === "string" ? it.label : it.value);
    const visible = items.slice(0, visibleCount);
    const overflow = items.slice(visibleCount);
    const activeOverflow = overflow.find((it) => it.value === selected);

    /** Focus and select the first enabled tab after `from` in `direction`, wrapping around. */
    const focusTab = (from: number, direction: 1 | -1) => {
      const n = visible.length;
      for (let k = 1; k <= n; k++) {
        const target = (((from + direction * k) % n) + n) % n;
        if (visible[target]!.disabled) continue;
        tabRefs.current[target]?.focus();
        setSelected(visible[target]!.value);
        return;
      }
    };

    const tabClass = cn(
      "relative inline-flex shrink-0 select-none items-center gap-1.5 whitespace-nowrap rounded-control font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4",
      "data-[state=active]:bg-muted data-[state=active]:text-foreground",
      size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-sm",
      focusRing
    );
    const renderInner = (it: TabDropdownItem) => (
      <>
        {it.icon}
        {it.label}
        {it.badge != null && it.badge !== false && (
          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-background px-1 text-2xs font-semibold tabular-nums">{it.badge}</span>
        )}
      </>
    );

    return (
      <div
        ref={(node) => {
          rootRef.current = node;
          assignRef(forwardedRef, node);
        }}
        data-tab-dropdown-root=""
        className={cn("relative flex min-w-0 items-center", className)}
        {...props}
      >
        <div ref={measureRef} aria-hidden className="pointer-events-none invisible absolute left-0 top-0 flex gap-1 whitespace-nowrap" data-slot="tab-dropdown-measure">
          {items.map((it) => (
            <span key={it.value} data-tab-measure="" className={tabClass}>
              {renderInner(it)}
            </span>
          ))}
          <span data-tab-measure-more="" className={tabClass}>
            {moreLabel}
            <RiArrowDownSLine aria-hidden />
          </span>
        </div>
        <div role="tablist" aria-label={label} aria-orientation="horizontal" className="flex min-w-0 items-center gap-1">
          {visible.map((it, i) => {
            const active = it.value === selected;
            return (
              <button
                key={it.value}
                ref={(node) => {
                  tabRefs.current[i] = node;
                }}
                type="button"
                role="tab"
                aria-selected={active}
                tabIndex={active || (!visible.some((v) => v.value === selected) && i === 0) ? 0 : -1}
                disabled={it.disabled}
                data-state={active ? "active" : "inactive"}
                onClick={() => setSelected(it.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight") focusTab(i, 1);
                  else if (e.key === "ArrowLeft") focusTab(i, -1);
                  else if (e.key === "Home") focusTab(-1, 1);
                  else if (e.key === "End") focusTab(visible.length, -1);
                  else return;
                  e.preventDefault();
                }}
                className={tabClass}
              >
                {renderInner(it)}
              </button>
            );
          })}
        </div>
        {overflow.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                data-state={activeOverflow ? "active" : "inactive"}
                aria-label={activeOverflow ? `${moreLabel} tabs, current: ${text(activeOverflow)}` : `${moreLabel} tabs`}
                className={cn(tabClass, "ml-1")}
              >
                {activeOverflow ? text(activeOverflow) : moreLabel}
                <span className="rounded-full bg-background px-1 text-2xs tabular-nums text-muted-foreground">{overflow.length}</span>
                <RiArrowDownSLine aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup value={selected} onValueChange={setSelected}>
                {overflow.map((it) => (
                  <DropdownMenuRadioItem key={it.value} value={it.value} disabled={it.disabled}>
                    {text(it)}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  }
);
TabDropdown.displayName = "TabDropdown";
