import * as React from "react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { cn, focusRing } from "../../lib/cn";
import { menuContentClass } from "../../primitives/dropdown-menu";
import { useMediaPortalContainer, type MediaTone } from "./media-controls-base";

export type MediaButtonBaseProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "value" | "defaultValue"> & {
  /** `default` follows the theme; `overlay` is for controls drawn over video or artwork. */
  tone?: MediaTone;
  /** Button size: `sm`, `md` or `lg`. */
  size?: "sm" | "md" | "lg";
};

export function MediaMenuContent({ className, ...props }: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>) {
  const container = useMediaPortalContainer();
  return (
    <DropdownMenuPrimitive.Portal container={container ?? undefined}>
      <DropdownMenuPrimitive.Content
        sideOffset={6}
        align="end"
        className={cn(
          menuContentClass,
          "max-h-(--radix-dropdown-menu-content-available-height) min-w-40 origin-(--radix-dropdown-menu-content-transform-origin)",
          className
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export const chipClass = (tone: MediaTone, active: boolean) =>
  cn(
    "inline-flex h-8 shrink-0 select-none items-center gap-1.5 rounded-control border px-2.5 text-xs font-semibold uppercase tracking-wide transition-colors [&_svg]:size-4 [&_svg]:shrink-0",
    "disabled:pointer-events-none disabled:opacity-40",
    focusRing,
    tone === "overlay"
      ? active
        ? "border-white bg-white/20 text-white"
        : "border-white/30 text-white/85 hover:border-white hover:text-white"
      : active
        ? "border-primary/50 bg-primary-soft text-primary-soft-foreground"
        : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground"
  );
