import * as React from "react";
import { cn } from "../lib/cn";
import { formatShortcutSpoken, getShortcutKeyLabels, type ShortcutPlatform } from "../lib/shortcuts";
import { useShortcutPlatform } from "../hooks/use-shortcut-manager";
import { Kbd } from "./typography";

export { isShortcutKeys, formatShortcut, getShortcutKeyLabels, detectShortcutPlatform } from "../lib/shortcuts";
export type { ShortcutPlatform, FormatShortcutOptions } from "../lib/shortcuts";

export interface ShortcutKeysProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Keys spec: "mod+k", "shift+?", "g t". */
  keys: string;
  /** Platform whose key glyphs are shown (`mac` shows ⌘ and ⌥). Defaults to the detected or provided platform. */
  platform?: ShortcutPlatform;
  /** Classes for each Kbd chip. */
  kbdClassName?: string;
  /**
   * Key chip size.
   * @default "sm"
   */
  size?: "sm" | "md";
}

/** Renders a keys spec as platform-aware Kbd chips, with "then" between sequence steps. */
export const ShortcutKeys = React.forwardRef<HTMLSpanElement, ShortcutKeysProps>(
  ({ keys, platform: platformProp, kbdClassName, size = "sm", className, ...props }, ref) => {
    const contextPlatform = useShortcutPlatform();
    const platform = platformProp ?? contextPlatform;
    const steps = getShortcutKeyLabels(keys, { platform });
    return (
      <span ref={ref} data-shortcut={keys} className={cn("inline-flex shrink-0 items-center gap-1", className)} {...props}>
        <span aria-hidden className="inline-flex items-center gap-1">
          {steps.map((step, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="text-[11px] opacity-70">then</span>}
              <span className="inline-flex items-center gap-0.5">
                {step.map((label, j) => (
                  <Kbd key={j} className={cn(size === "md" && "h-6 min-w-6 text-xs", kbdClassName)}>
                    {label}
                  </Kbd>
                ))}
              </span>
            </React.Fragment>
          ))}
        </span>
        <span className="sr-only">{formatShortcutSpoken(keys, platform)}</span>
      </span>
    );
  }
);
ShortcutKeys.displayName = "ShortcutKeys";
