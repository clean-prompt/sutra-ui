import * as React from "react";
import { RiComputerLine, RiMoonClearLine, RiSunLine } from "@remixicon/react";
import { cn, type Size } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { useMediaQuery } from "../hooks/use-media-query";
import { Button } from "../primitives/button";
import { SegmentedControl, type SegmentedControlProps } from "../primitives/segmented-control";

export type ThemeToggleMode = "light" | "dark" | "system";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function readStored(key: string | null): ThemeToggleMode | undefined {
  if (!key || typeof window === "undefined") return undefined;
  try {
    const v = window.localStorage.getItem(key);
    return v === "light" || v === "dark" || v === "system" ? v : undefined;
  } catch {
    return undefined;
  }
}

const labels: Record<ThemeToggleMode, string> = { light: "Light", dark: "Dark", system: "System" };
const icons: Record<ThemeToggleMode, React.ReactNode> = {
  light: <RiSunLine aria-hidden />,
  dark: <RiMoonClearLine aria-hidden />,
  system: <RiComputerLine aria-hidden />,
};

export interface ThemeToggleProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "defaultValue" | "onChange" | "dir"> {
  /** `icon` cycles through `modes` with a sun/moon morph; `segmented` shows all modes. */
  variant?: "icon" | "segmented";
  /** Modes offered, in cycle order. `["light", "dark"]` makes a two-state toggle. */
  modes?: ThemeToggleMode[];
  /** Controlled theme mode. Use with `onValueChange`. */
  value?: ThemeToggleMode;
  /** Initial theme mode when uncontrolled. */
  defaultValue?: ThemeToggleMode;
  /** Called with the new mode when the user toggles it. */
  onValueChange?: (mode: ThemeToggleMode) => void;
  /** Toggle the `dark` class / color-scheme on <html>. Default true. */
  applyToDocument?: boolean;
  /** localStorage key used when uncontrolled; `null` disables persistence. */
  storageKey?: string | null;
  /** Button size. */
  size?: Size;
  /** Show labels next to icons in the segmented variant. Default true. */
  showLabels?: boolean;
}

/** Light / dark / system switch: an animated icon button or a segmented control. */
export const ThemeToggle = React.forwardRef<HTMLButtonElement & HTMLDivElement, ThemeToggleProps>(
  (
    {
      variant = "icon",
      modes = ["light", "dark", "system"],
      value,
      defaultValue,
      onValueChange,
      applyToDocument = true,
      storageKey = "sutra-theme",
      size = "md",
      showLabels = true,
      className,
      ...props
    },
    ref
  ) => {
    const [initial] = React.useState<ThemeToggleMode>(() => {
      const stored = value === undefined ? readStored(storageKey) : undefined;
      if (stored && modes.includes(stored)) return stored;
      if (defaultValue) return defaultValue;
      if (modes.includes("system")) return "system";
      return typeof document !== "undefined" && document.documentElement.classList.contains("dark") ? "dark" : "light";
    });
    const [mode, setMode] = useControllableState<ThemeToggleMode>({ value, defaultValue: initial, onChange: onValueChange });
    const systemDark = useMediaQuery(DARK_QUERY);
    const resolved: "light" | "dark" = mode === "system" ? (systemDark ? "dark" : "light") : mode;

    React.useEffect(() => {
      if (!applyToDocument || typeof document === "undefined") return;
      const root = document.documentElement;
      root.classList.toggle("dark", resolved === "dark");
      root.style.colorScheme = resolved;
    }, [resolved, applyToDocument]);

    React.useEffect(() => {
      if (value !== undefined || !storageKey) return;
      try {
        window.localStorage.setItem(storageKey, mode);
      } catch {
        /* storage blocked: still applies for this page */
      }
    }, [mode, value, storageKey]);

    if (variant === "segmented") {
      return (
        <SegmentedControl
          ref={ref}
          aria-label="Theme"
          size={size}
          value={mode}
          onValueChange={(v) => v && setMode(v as ThemeToggleMode)}
          options={modes.map((m) => ({
            value: m,
            icon: icons[m],
            label: showLabels ? labels[m] : undefined,
            "aria-label": showLabels ? undefined : labels[m],
          }))}
          className={className}
          {...(props as unknown as Omit<SegmentedControlProps, "value" | "onValueChange" | "options">)}
        />
      );
    }

    const index = Math.max(0, modes.indexOf(mode));
    const next = modes[(index + 1) % modes.length] ?? "light";
    const showSystem = mode === "system";
    const iconSize = size === "sm" ? "icon-sm" : size === "lg" ? "icon-lg" : "icon";
    return (
      <Button
        ref={ref}
        variant="ghost"
        size={iconSize}
        data-mode={mode}
        data-resolved={resolved}
        aria-label={`Theme: ${labels[mode]}. Switch to ${labels[next]}`}
        title={`Theme: ${labels[mode]}`}
        onClick={() => setMode(next)}
        className={cn("relative overflow-hidden", className)}
        {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-[transform,translate,scale,rotate,opacity] duration-500 ease-spring motion-reduce:transition-none",
            !showSystem && resolved === "light" ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"
          )}
        >
          <RiSunLine aria-hidden />
        </span>
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-[transform,translate,scale,rotate,opacity] duration-500 ease-spring motion-reduce:transition-none",
            !showSystem && resolved === "dark" ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-50 opacity-0"
          )}
        >
          <RiMoonClearLine aria-hidden />
        </span>
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-[transform,translate,scale,rotate,opacity] duration-500 ease-spring motion-reduce:transition-none",
            showSystem ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          )}
        >
          <RiComputerLine aria-hidden />
        </span>
      </Button>
    );
  }
);
ThemeToggle.displayName = "ThemeToggle";
