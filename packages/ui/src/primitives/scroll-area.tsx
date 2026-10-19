import * as React from "react";
import { ScrollArea as ScrollAreaPrimitive } from "radix-ui";
import { cn } from "../lib/cn";
import { useMergedRefs } from "../hooks/use-merged-refs";
import { useScrollEdges, type ScrollEdges as Edges } from "../hooks/use-scroll-edges";
import { useRootDirection } from "../hooks/use-direction";

type FadeEdges = boolean | "vertical" | "horizontal";

export interface ScrollAreaProps extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> {
  /** Which scrollbars to render. Default "vertical". */
  orientation?: "vertical" | "horizontal" | "both";
  /** Fade content into gradient masks at the edges that can still scroll. */
  fadeEdges?: FadeEdges;
  /** Classes for the inner viewport (e.g. a max height). */
  viewportClassName?: string;
  /** Ref to the scrolling viewport element (for `scrollTo` or scroll listeners). */
  viewportRef?: React.Ref<HTMLDivElement>;
}

function buildMask(edges: Edges, fade: FadeEdges): string | undefined {
  const size = "24px";
  const layers: string[] = [];
  if (fade === true || fade === "vertical") {
    layers.push(
      `linear-gradient(to bottom, ${edges.top ? "transparent" : "#000"}, #000 ${size}, #000 calc(100% - ${size}), ${
        edges.bottom ? "transparent" : "#000"
      })`
    );
  }
  if (fade === true || fade === "horizontal") {
    layers.push(
      `linear-gradient(to right, ${edges.left ? "transparent" : "#000"}, #000 ${size}, #000 calc(100% - ${size}), ${
        edges.right ? "transparent" : "#000"
      })`
    );
  }
  return layers.length ? layers.join(", ") : undefined;
}

/** Custom-styled scroll container with thin overlay scrollbars and optional edge fades. */
export const ScrollArea = React.forwardRef<React.ElementRef<typeof ScrollAreaPrimitive.Root>, ScrollAreaProps>(
  (
    {
      className,
      children,
      type = "hover",
      orientation = "vertical",
      fadeEdges = false,
      viewportClassName,
      viewportRef,
      ...props
    },
    ref
  ) => {
    const { ref: rootRef, dir } = useRootDirection(ref);
    const localRef = React.useRef<HTMLDivElement | null>(null);
    const edges = useScrollEdges(localRef, { enabled: !!fadeEdges });
    const handleViewportRef = useMergedRefs(localRef, viewportRef);

    const mask = fadeEdges ? buildMask(edges, fadeEdges) : undefined;
    const maskStyle: React.CSSProperties | undefined = mask
      ? { maskImage: mask, WebkitMaskImage: mask, maskComposite: "intersect", WebkitMaskComposite: "source-in" }
      : undefined;

    return (
      <ScrollAreaPrimitive.Root
        ref={rootRef}
        dir={dir}
        type={type}
        className={cn("relative overflow-hidden", className)}
        {...props}
      >
        <ScrollAreaPrimitive.Viewport
          ref={handleViewportRef}
          style={maskStyle}
          className={cn(
            "size-full rounded-[inherit] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35",
            viewportClassName
          )}
        >
          {children}
        </ScrollAreaPrimitive.Viewport>
        {orientation !== "horizontal" && <ScrollBar orientation="vertical" />}
        {orientation !== "vertical" && <ScrollBar orientation="horizontal" />}
        <ScrollAreaPrimitive.Corner className="bg-transparent" />
      </ScrollAreaPrimitive.Root>
    );
  }
);
ScrollArea.displayName = "ScrollArea";

export interface ScrollBarProps
  extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar> {
  /** Classes for the draggable thumb. */
  thumbClassName?: string;
}

/** Thin scrollbar track + thumb; rendered automatically by `ScrollArea`. */
export const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  ScrollBarProps
>(({ className, orientation = "vertical", thumbClassName, ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "group/scrollbar z-10 flex touch-none select-none p-0.5 transition-[background-color,opacity] duration-150",
      "data-[state=hidden]:animate-out data-[state=hidden]:fade-out-0 data-[state=visible]:animate-in data-[state=visible]:fade-in-0",
      orientation === "vertical" && "h-full w-2.5 border-s border-s-transparent hover:w-3",
      orientation === "horizontal" && "h-2.5 flex-col border-t border-t-transparent hover:h-3",
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb
      className={cn(
        "relative flex-1 rounded-full bg-[var(--scrollbar)] transition-colors duration-150 hover:bg-[var(--scrollbar-hover)] active:bg-[var(--scrollbar-hover)]",
        "before:absolute before:start-1/2 before:top-1/2 before:size-full before:min-h-11 before:min-w-11 before:-translate-x-1/2 rtl:before:translate-x-1/2 before:-translate-y-1/2",
        thumbClassName
      )}
    />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
));
ScrollBar.displayName = "ScrollBar";
