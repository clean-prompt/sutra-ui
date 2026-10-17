import * as React from "react";
import { AspectRatio as AspectRatioPrimitive } from "radix-ui";
import { cn } from "../lib/cn";

export type AspectRatioPreset = "16/9" | "4/3" | "1/1" | "21/9" | "3/4" | "9/16";

export const aspectRatioPresets: Record<AspectRatioPreset, number> = {
  "16/9": 16 / 9,
  "4/3": 4 / 3,
  "1/1": 1,
  "21/9": 21 / 9,
  "3/4": 3 / 4,
  "9/16": 9 / 16,
};

export interface AspectRatioProps
  extends Omit<React.ComponentPropsWithoutRef<typeof AspectRatioPrimitive.Root>, "ratio"> {
  /** Preset like `"16/9"` or a number (width / height). Default 16/9. */
  ratio?: AspectRatioPreset | number;
  /** Round the corners and clip content (`rounded-box`). */
  rounded?: boolean;
  /** Make a direct img/video/iframe child fill the box with `object-cover`. */
  cover?: boolean;
  /** Subtle muted background and border, useful as a placeholder frame. */
  framed?: boolean;
}

/** Box that keeps a fixed width/height ratio for media and embeds. */
export const AspectRatio = React.forwardRef<
  React.ElementRef<typeof AspectRatioPrimitive.Root>,
  AspectRatioProps
>(({ ratio = "16/9", rounded = false, cover = true, framed = false, className, ...props }, ref) => {
  const value = typeof ratio === "number" ? ratio : aspectRatioPresets[ratio];
  return (
    <AspectRatioPrimitive.Root
      ref={ref}
      ratio={value}
      className={cn(
        "relative w-full",
        rounded && "overflow-hidden rounded-box",
        framed && "border border-border bg-muted",
        cover && "[&>img]:size-full [&>img]:object-cover [&>video]:size-full [&>video]:object-cover [&>iframe]:size-full",
        className
      )}
      {...props}
    />
  );
});
AspectRatio.displayName = "AspectRatio";
