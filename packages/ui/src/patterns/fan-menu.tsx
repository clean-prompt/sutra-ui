import * as React from "react";
import { cn, focusRing } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { usePrefersReducedMotion } from "../hooks/use-media-query";
import { useMergedRefs } from "../hooks/use-merged-refs";

/* ------------------------------------------------------------------ */
/* FanMenu                                                             */
/* ------------------------------------------------------------------ */

export interface FanMenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  /** Marks the item as the current choice (e.g. the active voice mode). */
  active?: boolean;
  onSelect?: () => void;
}

export type FanMenuDirection = "up" | "down" | "left" | "right";

export interface FanMenuProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  /** Actions that fan out from the hub button; each has an `id`, a `label` and an `icon`. */
  items: FanMenuItem[];
  /** Hub button icon. */
  icon: React.ReactNode;
  /** Accessible name of the hub button. */
  label: string;
  /** Controlled open state. Use with `onOpenChange`. */
  open?: boolean;
  /** Initial open state when uncontrolled. */
  defaultOpen?: boolean;
  /** Called when the menu opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** Fired with the selected item id (after the item's own `onSelect`). */
  onSelect?: (id: string) => void;
  /** Direction the fan opens towards. Default "up". */
  direction?: FanMenuDirection;
  /** Distance from the hub centre to each disc, px. Default 76. */
  radius?: number;
  /** Total arc covered by the discs, degrees. Default 120. */
  spread?: number;
  /** Disc diameter, px. Default 44. */
  discSize?: number;
  /** Hub diameter, px. Default 48. */
  hubSize?: number;
  /** Show item labels as tooltips next to the discs. Default true. */
  showLabels?: boolean;
}

const fanAngle: Record<FanMenuDirection, number> = { up: -90, down: 90, left: 180, right: 0 };

/** A hub button that fans out circular action discs along an arc (e.g. voice modes). Keyboard accessible as a menu. */
export const FanMenu = React.forwardRef<HTMLDivElement, FanMenuProps>(
  (
    {
      items,
      icon,
      label,
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      onSelect,
      direction = "up",
      radius = 76,
      spread = 120,
      discSize = 44,
      hubSize = 48,
      showLabels = true,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const [open, setOpen] = useControllableState<boolean>({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
    const reduced = usePrefersReducedMotion();
    const rootRef = React.useRef<HTMLDivElement | null>(null);
    const setRefs = useMergedRefs(rootRef, ref);
    const hubRef = React.useRef<HTMLButtonElement>(null);
    const itemRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
    const [focusIndex, setFocusIndex] = React.useState(0);
    const pendingFocus = React.useRef<number | null>(null);
    const menuId = React.useId();

    const enabled = items.map((it, i) => (it.disabled ? -1 : i)).filter((i) => i >= 0);

    const openAt = (index: number) => {
      pendingFocus.current = index;
      setFocusIndex(index);
      setOpen(true);
    };
    const close = (refocus = true) => {
      setOpen(false);
      if (refocus) hubRef.current?.focus();
    };

    React.useEffect(() => {
      if (!open || pendingFocus.current == null) return;
      itemRefs.current[pendingFocus.current]?.focus();
      pendingFocus.current = null;
    }, [open]);

    React.useEffect(() => {
      if (!open) return;
      const onDown = (e: PointerEvent) => {
        if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
      };
      document.addEventListener("pointerdown", onDown);
      return () => document.removeEventListener("pointerdown", onDown);
    }, [open, setOpen]);

    const moveFocus = (delta: number | "first" | "last") => {
      if (enabled.length === 0) return;
      const pos = enabled.indexOf(focusIndex);
      const next =
        delta === "first"
          ? enabled[0]
          : delta === "last"
            ? enabled[enabled.length - 1]
            : enabled[(pos + delta + enabled.length) % enabled.length];
      setFocusIndex(next);
      itemRefs.current[next]?.focus();
    };

    const base = fanAngle[direction];
    const n = items.length;
    const positions = items.map((_, i) => {
      const angle = n === 1 ? base : base - spread / 2 + (spread * i) / (n - 1);
      const rad = (angle * Math.PI) / 180;
      return { x: Math.round(Math.cos(rad) * radius), y: Math.round(Math.sin(rad) * radius) };
    });

    return (
      <div
        ref={setRefs}
        data-state={open ? "open" : "closed"}
        className={cn("relative inline-flex shrink-0", className)}
        style={{ width: hubSize, height: hubSize, ...style }}
        {...props}
      >
        <button
          ref={hubRef}
          type="button"
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          onClick={() => (open ? close(false) : openAt(enabled[0] ?? 0))}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
              e.preventDefault();
              openAt(e.key === "ArrowDown" || e.key === "ArrowRight" ? (enabled[0] ?? 0) : (enabled[enabled.length - 1] ?? 0));
            } else if (e.key === "Escape" && open) {
              e.preventDefault();
              close();
            }
          }}
          className={cn(
            "relative z-10 inline-flex size-full items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md shadow-inner-highlight transition-[transform,translate,scale,rotate,background-color] duration-200 hover:bg-primary-hover motion-reduce:transition-none [&_svg]:size-5",
            open && "scale-95",
            focusRing
          )}
        >
          {icon}
        </button>
        {open && (
          <div
            id={menuId}
            role="menu"
            aria-label={label}
            aria-orientation={direction === "up" || direction === "down" ? "horizontal" : "vertical"}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                moveFocus(1);
              } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                moveFocus(-1);
              } else if (e.key === "Home") {
                e.preventDefault();
                moveFocus("first");
              } else if (e.key === "End") {
                e.preventDefault();
                moveFocus("last");
              } else if (e.key === "Escape") {
                e.preventDefault();
                close();
              } else if (e.key === "Tab") {
                close(false);
              }
            }}
            className="pointer-events-none absolute inset-0"
          >
            {items.map((item, i) => {
              const { x, y } = positions[i];
              return (
                <button
                  key={item.id}
                  ref={(node) => {
                    itemRefs.current[i] = node;
                  }}
                  type="button"
                  role="menuitem"
                  aria-label={item.label}
                  aria-current={item.active || undefined}
                  disabled={item.disabled}
                  tabIndex={i === focusIndex ? 0 : -1}
                  data-active={item.active ? "" : undefined}
                  onFocus={() => setFocusIndex(i)}
                  onClick={() => {
                    item.onSelect?.();
                    onSelect?.(item.id);
                    close();
                  }}
                  className={cn(
                    "group/fan pointer-events-auto absolute start-1/2 top-1/2 inline-flex items-center justify-center rounded-full border border-border bg-popover text-foreground shadow-lg transition-colors hover:bg-accent disabled:opacity-50 [&_svg]:size-[18px]",
                    "data-[active]:border-primary data-[active]:bg-primary-soft data-[active]:text-primary-soft-foreground",
                    !reduced && "animate-in fade-in-0 zoom-in-50 duration-200 ease-out-quart",
                    focusRing
                  )}
                  style={
                    {
                      width: discSize,
                      height: discSize,
                      marginLeft: x - discSize / 2,
                      marginTop: y - discSize / 2,
                      animationDelay: reduced ? undefined : `${i * 25}ms`,
                      animationFillMode: "backwards",
                      "--tw-enter-translate-x": `${-x}px`,
                      "--tw-enter-translate-y": `${-y}px`,
                    } as React.CSSProperties
                  }
                >
                  <span aria-hidden className="inline-flex">
                    {item.icon}
                  </span>
                  {showLabels && (
                    <span
                      aria-hidden
                      className={cn(
                        "pointer-events-none absolute whitespace-nowrap rounded-xs bg-inverse px-1.5 py-0.5 text-2xs font-medium text-inverse-foreground opacity-0 transition-opacity group-hover/fan:opacity-100 group-focus-visible/fan:opacity-100",
                        // rtl-physical x1: the fan direction names a physical side
                        direction === "down" ? "top-full mt-1.5" : direction === "left" ? "right-full mr-1.5" : direction === "right" ? "left-full ml-1.5" : "bottom-full mb-1.5"
                      )}
                    >
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }
);
FanMenu.displayName = "FanMenu";
