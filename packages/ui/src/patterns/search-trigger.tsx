import * as React from "react";
import { RiSearchLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { formatShortcutSpoken, toShortcutKeyList } from "../lib/shortcuts";
import { useLatestRef } from "../hooks/use-iso-layout-effect";
import { useShortcutPlatform } from "../hooks/use-shortcut-manager";
import { Button } from "../primitives/button";
import { ShortcutKeys } from "../primitives/shortcut-keys";
import { useShortcut } from "./shortcuts";

export type SearchTriggerSize = "sm" | "md" | "lg";

export interface SearchTriggerProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type" | "children"> {
  /** Called on click and when the hotkey is pressed. Open your command palette here. */
  onTrigger?: () => void;
  /** Visible hint text. Default "Search…". */
  placeholder?: string;
  /** Shortcut hint (and hotkey) as a keys spec: "mod+k" (⌘ on macOS, Ctrl elsewhere), "/", … Default "mod+k". */
  shortcut?: string;
  /** Also listen for `shortcut` anywhere on the page and call `onTrigger`. Plain keys are ignored while typing in a field; `mod+` chords always fire. */
  hotkey?: boolean;
  /** Field height: sm 32px, md 36px, lg 40px. Default md. */
  size?: SearchTriggerSize;
  /** Below this breakpoint the field becomes an icon button. Default: always the field. */
  collapseBelow?: "sm" | "md" | "lg";
  /** Accessible name. Default: the placeholder text. The shortcut is announced as the description and through `aria-keyshortcuts`. */
  label?: string;
}

const heights: Record<SearchTriggerSize, string> = { sm: "h-8", md: "h-9", lg: "h-10" };
const iconSizes = { sm: "icon-sm", md: "icon", lg: "icon-lg" } as const;
const fieldDisplay = { sm: "hidden sm:flex", md: "hidden md:flex", lg: "hidden lg:flex" } as const;
const iconHide = { sm: "sm:hidden", md: "md:hidden", lg: "lg:hidden" } as const;

/** Keys that need ⌘ or Ctrl held. These also work while typing in a field. */
function isChorded(keys: string) {
  return toShortcutKeyList(keys).some((k) => /(^|\s|\+)(mod|cmd|command|meta|super|win|ctrl|control)\+/i.test(k));
}

/** `aria-keyshortcuts` value for a single-combo keys spec ("mod+k" → "Meta+K Control+K"); undefined for sequences. */
function ariaKeyShortcuts(keys: string): string | undefined {
  const out: string[] = [];
  for (const spec of toShortcutKeyList(keys)) {
    if (/\s/.test(spec.trim())) continue;
    const parts = spec.trim().split("+");
    const key = parts.pop() || "+";
    const key2 = key.length === 1 ? key.toUpperCase() : key.charAt(0).toUpperCase() + key.slice(1);
    let variants = [""];
    for (const raw of parts) {
      const mod = raw.toLowerCase();
      const names =
        mod === "mod" ? ["Meta", "Control"] : /^(cmd|command|meta|super|win)$/.test(mod) ? ["Meta"] : /^(ctrl|control)$/.test(mod) ? ["Control"] : /^(alt|opt|option)$/.test(mod) ? ["Alt"] : mod === "shift" ? ["Shift"] : [];
      if (names.length) variants = variants.flatMap((v) => names.map((n) => `${v}${n}+`));
    }
    out.push(...variants.map((v) => `${v}${key2}`));
  }
  return out.length ? out.join(" ") : undefined;
}

/**
 * A button that looks like a search field and opens a command palette: placeholder text plus the shortcut as `Kbd` chips.
 * With `hotkey` it also listens for the shortcut (through the shortcut registry when a `ShortcutProvider` is present).
 */
export const SearchTrigger = React.forwardRef<HTMLButtonElement, SearchTriggerProps>(
  (
    { onTrigger, onClick, placeholder = "Search…", shortcut = "mod+k", hotkey = false, size = "md", collapseBelow, label, className, ...props },
    ref
  ) => {
    const platform = useShortcutPlatform();
    const triggerRef = useLatestRef(onTrigger);
    useShortcut(hotkey ? shortcut : null, () => triggerRef.current?.(), {
      id: `sutra:search-trigger:${shortcut}`,
      label: "Search",
      group: "General",
      allowInInputs: isChorded(shortcut),
    });

    const descriptionId = React.useId();
    const spoken = toShortcutKeyList(shortcut).length === 1 ? formatShortcutSpoken(shortcut, platform) : undefined;
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      if (!event.defaultPrevented) onTrigger?.();
    };

    return (
      <>
        <button
          ref={ref}
          type="button"
          data-slot="search-trigger"
          aria-label={label}
          aria-describedby={spoken ? descriptionId : undefined}
          aria-keyshortcuts={ariaKeyShortcuts(shortcut)}
          onClick={handleClick}
          className={cn(
            "w-full max-w-72 items-center gap-2 rounded-control border border-input bg-background pl-3 pr-1.5 text-sm text-muted-foreground shadow-xs transition-colors hover:border-border-strong hover:text-foreground",
            collapseBelow ? fieldDisplay[collapseBelow] : "flex",
            heights[size],
            focusRing,
            className
          )}
          {...props}
        >
          <RiSearchLine aria-hidden className="size-4 shrink-0" />
          <span className="flex-1 truncate text-left">{placeholder}</span>
          <span aria-hidden className="flex items-center">
            <ShortcutKeys keys={shortcut} platform={platform} />
          </span>
        </button>
        {spoken ? (
          <span id={descriptionId} hidden>
            {`Shortcut: ${spoken}`}
          </span>
        ) : null}
        {collapseBelow ? (
          <Button variant="ghost" size={iconSizes[size]} aria-label={label ?? "Search"} disabled={props.disabled} onClick={handleClick} className={iconHide[collapseBelow]}>
            <RiSearchLine aria-hidden />
          </Button>
        ) : null}
      </>
    );
  }
);
SearchTrigger.displayName = "SearchTrigger";
