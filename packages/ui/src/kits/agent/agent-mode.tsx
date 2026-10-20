import * as React from "react";
import {
  RiArrowDownSLine,
  RiFlashlightLine,
  RiHand,
  RiMap2Line,
  RiPencilLine,
  RiAlarmWarningLine,
} from "@remixicon/react";
import { cn, focusRing, normalizeDensity, type Density, hitArea } from "../../lib/cn";
import { logicalArrow } from "../../lib/direction";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useMergedRefs } from "../../hooks/use-merged-refs";
import { clamp } from "../../lib/math";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuSeparator,
  menuItemClass,
} from "../../primitives/dropdown-menu";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { ConfirmDialog } from "../../primitives/dialog";
import { ShortcutKeys, useShortcut } from "../../patterns/shortcuts";
import { SimpleTooltip } from "../../primitives/tooltip";

/* ------------------------------------------------------------------ */
/* PermissionModeSwitcher                                              */
/* ------------------------------------------------------------------ */

export type PermissionMode = "manual" | "acceptEdits" | "plan" | "auto" | "bypass";

export interface PermissionModeOption {
  value: string;
  label: React.ReactNode;
  /** Short label for the pill; defaults to `label`. */
  shortLabel?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "default" | "primary" | "warning" | "destructive";
  /** Ask for confirmation before switching to this mode. */
  confirm?: boolean | { title?: React.ReactNode; description?: React.ReactNode; confirmLabel?: React.ReactNode };
  /** Included in the keyboard cycle. Default true unless `confirm` is set. */
  cycle?: boolean;
  disabled?: boolean;
}

export const defaultPermissionModes: PermissionModeOption[] = [
  { value: "manual", label: "Ask before edits", icon: <RiHand aria-hidden />, description: "The agent asks for approval before each edit or command." },
  { value: "acceptEdits", label: "Edit automatically", icon: <RiPencilLine aria-hidden />, tone: "primary", description: "File edits are applied without asking; commands still need approval." },
  { value: "plan", label: "Plan mode", icon: <RiMap2Line aria-hidden />, tone: "primary", description: "The agent explores read-only and proposes a plan before changing anything." },
  { value: "auto", label: "Auto", icon: <RiFlashlightLine aria-hidden />, tone: "warning", description: "Safe actions run automatically; anything risky pauses for approval." },
  {
    value: "bypass",
    label: "Bypass permissions",
    icon: <RiAlarmWarningLine aria-hidden />,
    tone: "destructive",
    description: "Nothing asks for approval, including potentially destructive commands.",
    confirm: {
      title: "Bypass all permission checks?",
      description: "The agent will run commands and edit files without asking. Only use this in an isolated environment you can throw away.",
      confirmLabel: "Enable bypass",
    },
  },
];

const modeToneClass: Record<NonNullable<PermissionModeOption["tone"]>, string> = {
  default: "border-border bg-background text-foreground hover:bg-subtle",
  primary: "border-primary/30 bg-primary-soft text-primary-soft-foreground hover:border-primary/50",
  warning: "border-warning/40 bg-warning-soft text-warning-soft-foreground hover:border-warning/60",
  destructive: "border-destructive/40 bg-destructive-soft text-destructive-soft-foreground hover:border-destructive/60",
};

export interface PermissionModeSwitcherProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "value" | "defaultValue" | "onChange"> {
  /** Controlled id of the active mode. */
  value?: string;
  /** Initially active mode id when `value` is not controlled. */
  defaultValue?: string;
  /** Called with the mode id when the user picks a mode or cycles with the shortcut. */
  onValueChange?: (mode: string) => void;
  /** Modes to offer, each with an id, label and description; defaults to the built-in set. */
  modes?: PermissionModeOption[];
  /** Keys that cycle through the modes (fires from inputs too). `null` disables. Default "shift+tab". */
  cycleShortcut?: string | null;
  /** Extra guard for the cycle shortcut. */
  cycleWhen?: () => boolean;
  /**
   * Where the cycle shortcut listens. "composer" (default) only fires while focus is inside the
   * closest `form` / `[data-composer]` around the switcher (or on the switcher itself), so
   * Shift+Tab keeps its normal reverse-tab behaviour elsewhere on the page. "global" fires anywhere.
   */
  cycleScope?: "composer" | "global";
  /** Hide the label and show only the icon. */
  iconOnly?: boolean;
  /** Trigger size. */
  size?: "sm" | "md";
}

/** Composer-footer pill showing the agent's permission mode; opens a menu and cycles with Shift+Tab. */
export const PermissionModeSwitcher = React.forwardRef<HTMLButtonElement, PermissionModeSwitcherProps>(
  (
    {
      value: valueProp,
      defaultValue,
      onValueChange,
      modes = defaultPermissionModes,
      cycleShortcut = "shift+tab",
      cycleWhen,
      cycleScope = "composer",
      iconOnly = false,
      size = "sm",
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    const [value, setValue] = useControllableState({
      value: valueProp,
      defaultValue: defaultValue ?? modes[0]?.value ?? "",
      onChange: onValueChange,
    });
    const [open, setOpen] = React.useState(false);
    const [pending, setPending] = React.useState<PermissionModeOption | null>(null);
    const current = modes.find((m) => m.value === value) ?? modes[0];

    const request = (next: string) => {
      const mode = modes.find((m) => m.value === next);
      if (!mode || mode.disabled || next === value) return;
      if (mode.confirm) setPending(mode);
      else setValue(next);
    };

    const cycle = () => {
      const pool = modes.filter((m) => !m.disabled && (m.cycle ?? !m.confirm));
      if (!pool.length) return;
      const idx = pool.findIndex((m) => m.value === value);
      request(pool[(idx + 1) % pool.length].value);
    };

    const triggerRef = React.useRef<HTMLButtonElement | null>(null);
    const setTriggerRef = useMergedRefs(triggerRef, ref);

    const inScope = () => {
      if (cycleScope === "global") return true;
      const trigger = triggerRef.current;
      const active = typeof document !== "undefined" ? document.activeElement : null;
      if (!trigger || !active) return false;
      const composer = trigger.closest("form, [data-composer]");
      return composer ? composer.contains(active) : trigger === active;
    };

    useShortcut(cycleShortcut, cycle, {
      allowInInputs: true,
      label: "Switch permission mode",
      group: "Agent",
      enabled: !disabled,
      when: () => inScope() && (cycleWhen ? cycleWhen() : true),
    });

    const confirmCfg = pending && typeof pending.confirm === "object" ? pending.confirm : {};
    const tone = current?.tone ?? "default";

    return (
      <>
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuPrimitive.Trigger
            ref={setTriggerRef}
            disabled={disabled}
            aria-label={iconOnly ? `Permission mode: ${typeof current?.label === "string" ? current.label : current?.value}` : undefined}
            data-slot="permission-mode-switcher"
            data-mode={current?.value}
            data-tone={tone}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-control border font-medium shadow-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:shrink-0",
              size === "sm" ? "h-7 px-2 text-xs [&_svg]:size-3.5" : "h-8 px-2.5 text-sm [&_svg]:size-4",
              modeToneClass[tone],
              focusRing,
              className
            )}
            {...props}
          >
            <span aria-hidden className="inline-flex">{current?.icon}</span>
            {!iconOnly && <span className="truncate">{current?.shortLabel ?? current?.label}</span>}
            <RiArrowDownSLine aria-hidden className="opacity-60" />
          </DropdownMenuPrimitive.Trigger>
          <DropdownMenuContent side="top" className="w-80">
            <DropdownMenuLabel>Permission mode</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={value} onValueChange={request}>
              {modes.map((m) => (
                <DropdownMenuPrimitive.RadioItem
                  key={m.value}
                  value={m.value}
                  disabled={m.disabled}
                  data-tone={m.tone ?? "default"}
                  className={cn(
                    menuItemClass,
                    "items-start gap-2.5 py-2 data-[state=checked]:bg-subtle",
                    m.tone === "destructive" && "[&_svg]:text-destructive!"
                  )}
                >
                  <span aria-hidden className="mt-0.5 inline-flex">{m.icon}</span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className={cn("font-medium", m.tone === "destructive" && "text-destructive")}>{m.label}</span>
                    {m.description != null && <span className="text-xs leading-snug text-muted-foreground">{m.description}</span>}
                  </span>
                  <DropdownMenuPrimitive.ItemIndicator className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                </DropdownMenuPrimitive.RadioItem>
              ))}
            </DropdownMenuRadioGroup>
            {cycleShortcut && (
              <>
                <DropdownMenuSeparator />
                <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground">
                  <ShortcutKeys keys={cycleShortcut} />
                  <span>to switch modes</span>
                </div>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <ConfirmDialog
          open={pending != null}
          onOpenChange={(o) => {
            if (!o) setPending(null);
          }}
          tone={pending?.tone === "destructive" ? "destructive" : "default"}
          icon={pending?.icon}
          title={confirmCfg.title ?? <>Switch to {pending?.label}?</>}
          description={confirmCfg.description ?? pending?.description}
          confirmLabel={confirmCfg.confirmLabel ?? "Switch mode"}
          onConfirm={() => {
            if (pending) setValue(pending.value);
          }}
        />
      </>
    );
  }
);
PermissionModeSwitcher.displayName = "PermissionModeSwitcher";

/* ------------------------------------------------------------------ */
/* EffortSlider                                                        */
/* ------------------------------------------------------------------ */

export interface EffortLevel {
  value: string;
  label: React.ReactNode;
  description?: React.ReactNode;
}

export const defaultEffortLevels: EffortLevel[] = [
  { value: "low", label: "Low", description: "Fastest answers, minimal thinking" },
  { value: "medium", label: "Medium", description: "Balanced speed and depth" },
  { value: "high", label: "High", description: "Thinks longer on harder problems" },
  { value: "max", label: "Max", description: "Deepest reasoning, slowest" },
];

export interface EffortGlyphProps extends React.SVGAttributes<SVGSVGElement> {
  /** 0-based filled level. */
  level: number;
  /** Total levels (bars). Default 4. */
  count?: number;
  /** Glyph width and height in px. */
  size?: number;
}

/** Ascending bars glyph: `level + 1` of `count` bars filled. */
export const EffortGlyph = React.forwardRef<SVGSVGElement, EffortGlyphProps>(function EffortGlyph(
  { level, count = 4, size = 14, className, ...props },
  ref
) {
  const gap = 1.5;
  const w = (16 - gap * (count - 1)) / count;
  return (
    <svg ref={ref} aria-hidden viewBox="0 0 16 16" width={size} height={size} className={cn("shrink-0", className)} {...props}>
      {Array.from({ length: count }, (_, i) => {
        const h = 4 + ((12 - 4) * i) / Math.max(1, count - 1);
        return (
          <rect
            key={i}
            x={i * (w + gap)}
            y={16 - h}
            width={w}
            height={h}
            rx={0.75}
            fill="currentColor"
            opacity={i <= level ? 1 : 0.25}
          />
        );
      })}
    </svg>
  );
});
EffortGlyph.displayName = "EffortGlyph";

export interface EffortSliderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange" | "children"> {
  /** Controlled id of the selected effort level. */
  value?: string;
  /** Initially selected level id when `value` is not controlled. */
  defaultValue?: string;
  /** Called with the level id when the user moves the slider. */
  onValueChange?: (value: string) => void;
  /** Levels from lowest to highest, each with an id and label; defaults to the built-in set. */
  levels?: EffortLevel[];
  /** `"normal"` (default) shows a labelled track with a legend; `"compact"` is a small pill for the composer. */
  density?: Density;
  /** `compact` renders a small pill for the composer. @deprecated Use `density` (`"compact"`). */
  variant?: "default" | "compact";
  /** Accessible name and visible caption. Default "Effort". */
  label?: string;
  /** Tooltip text; `null` hides it. */
  tooltip?: React.ReactNode | null;
  /** Disables the slider. */
  disabled?: boolean;
}

/** Discrete effort-level control: click or drag the bars, ← → keys, compact pill variant. */
export const EffortSlider = React.forwardRef<HTMLDivElement, EffortSliderProps>(
  (
    {
      value: valueProp,
      defaultValue,
      onValueChange,
      levels = defaultEffortLevels,
      density,
      variant,
      label = "Effort",
      tooltip = "Click or drag to set effort level",
      disabled = false,
      className,
      ...props
    },
    ref
  ) => {
    const [value, setValue] = useControllableState({
      value: valueProp,
      defaultValue: defaultValue ?? levels[Math.min(1, levels.length - 1)]?.value ?? "",
      onChange: onValueChange,
    });
    const index = Math.max(0, levels.findIndex((l) => l.value === value));
    const trackRef = React.useRef<HTMLDivElement>(null);
    const dragging = React.useRef(false);
    const current = levels[index];
    const compact = density ? normalizeDensity(density) === "compact" : variant === "compact";

    const setIndex = (i: number) => {
      if (disabled || levels.length === 0) return;
      const clamped = clamp(i, 0, levels.length - 1);
      setValue(levels[clamped].value);
    };

    const indexFromPointer = (e: React.PointerEvent) => {
      const seg = (e.target as HTMLElement).closest?.("[data-effort-index]");
      if (seg && trackRef.current?.contains(seg)) return Number(seg.getAttribute("data-effort-index"));
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return null;
      return Math.floor(((e.clientX - rect.left) / rect.width) * levels.length);
    };

    const fromX = (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return;
      setIndex(Math.floor(((clientX - rect.left) / rect.width) * levels.length));
    };

    const slider = (
      <div
        ref={trackRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={levels.length - 1}
        aria-valuenow={index}
        aria-valuetext={typeof current?.label === "string" ? current.label : current?.value}
        aria-disabled={disabled || undefined}
        aria-orientation="horizontal"
        data-slot="effort-slider-track"
        data-value={current?.value}
        onPointerDown={(e) => {
          if (disabled) return;
          const i = indexFromPointer(e);
          if (i != null) setIndex(i);
          dragging.current = true;
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (dragging.current) fromX(e.clientX);
        }}
        onPointerUp={(e) => {
          dragging.current = false;
          (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
        onKeyDown={(e) => {
          let next: number | null = null;
          if (logicalArrow(e) === "ArrowRight" || e.key === "ArrowUp") next = index + 1;
          else if (logicalArrow(e) === "ArrowLeft" || e.key === "ArrowDown") next = index - 1;
          else if (e.key === "Home") next = 0;
          else if (e.key === "End") next = levels.length - 1;
          if (next != null) {
            e.preventDefault();
            setIndex(next);
          }
        }}
        className={cn(
          hitArea,
          "relative flex touch-none select-none items-end",
          compact ? "h-4 gap-0.5" : "h-8 gap-1",
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
          "rounded-xs",
          focusRing
        )}
      >
        {levels.map((l, i) => {
          const h = 35 + (65 * i) / Math.max(1, levels.length - 1);
          return (
            <span
              key={l.value}
              data-effort-index={i}
              data-active={i <= index ? "" : undefined}
              style={{ height: `${h}%` }}
              className={cn(
                "block rounded-[2px] transition-colors",
                compact ? "w-1" : "w-full min-w-6 flex-1",
                i <= index ? "bg-primary" : "bg-muted hover:bg-border-strong"
              )}
            />
          );
        })}
      </div>
    );

    const wrapped = tooltip != null && !disabled ? <SimpleTooltip content={tooltip}>{slider}</SimpleTooltip> : slider;

    if (compact) {
      return (
        <div
          ref={ref}
          data-slot="effort-slider"
          data-variant="compact"
          className={cn(
            "inline-flex h-7 shrink-0 items-center gap-2 rounded-control border border-border bg-background px-2 text-xs font-medium text-foreground shadow-xs",
            className
          )}
          {...props}
        >
          {wrapped}
          <span aria-hidden className="tabular-nums">{current?.label}</span>
        </div>
      );
    }

    return (
      <div ref={ref} data-slot="effort-slider" data-variant="default" className={cn("flex w-full max-w-xs flex-col gap-2", className)} {...props}>
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="font-medium text-foreground" aria-hidden>
            {label}
          </span>
          <span className="text-muted-foreground" aria-hidden>
            {current?.label}
          </span>
        </div>
        {wrapped}
        <div aria-hidden className="flex justify-between gap-1 text-2xs text-muted-foreground">
          {levels.map((l, i) => (
            <button
              key={l.value}
              type="button"
              tabIndex={-1}
              disabled={disabled}
              onClick={() => setIndex(i)}
              className={cn(hitArea, "inline-flex flex-1 items-center justify-center gap-1", i === index && "text-foreground")}
            >
              <EffortGlyph level={i} count={levels.length} size={12} />
              {l.label}
            </button>
          ))}
        </div>
        {current?.description != null && <p className="text-xs text-muted-foreground">{current.description}</p>}
      </div>
    );
  }
);
EffortSlider.displayName = "EffortSlider";
