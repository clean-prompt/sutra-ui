import * as React from "react";
import { Dialog as DialogPrimitive, Slot } from "radix-ui";
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCloseLine,
  RiDownloadLine,
  RiImageLine,
  RiZoomInLine,
  RiZoomOutLine,
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { clamp } from "../lib/math";
import { useSwipe } from "../hooks/use-swipe";

/* ------------------------------------------------------------------ */
/* ImageWithFallback                                                   */
/* ------------------------------------------------------------------ */

const shimmerClass =
  "animate-shimmer bg-[linear-gradient(90deg,var(--muted)_25%,color-mix(in_oklab,var(--muted),var(--foreground)_7%)_50%,var(--muted)_75%)] bg-[length:200%_100%] motion-reduce:animate-none";

export interface ImageWithFallbackProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "width" | "height" | "onLoad" | "onError"> {
  src?: string;
  alt: string;
  /** Intrinsic size; reserves the aspect ratio before the image loads. */
  width?: number;
  height?: number;
  /** Aspect ratio (width / height) to reserve, e.g. `16 / 9`. Overrides width/height. */
  ratio?: number;
  /** Load the image yourself (e.g. with auth headers). The blob becomes an object URL, revoked on unmount. */
  fetcher?: (src: string) => Promise<Blob>;
  /** Content for the error state. Default: icon + "Image unavailable". */
  fallback?: React.ReactNode;
  /** Classes for the `<img>` element (the wrapper gets `className`). */
  imgClassName?: string;
  /** `object-fit` of the image. Default "cover". */
  fit?: "cover" | "contain";
  onLoad?: () => void;
  onError?: () => void;
}

type LoadStatus = "loading" | "loaded" | "error";

/** Image that reserves its aspect ratio, shimmers while loading and shows "Image unavailable" on error. */
export const ImageWithFallback = React.forwardRef<HTMLImageElement, ImageWithFallbackProps>(
  (
    {
      src,
      alt,
      width,
      height,
      ratio,
      fetcher,
      fallback,
      className,
      imgClassName,
      fit = "cover",
      style,
      onLoad,
      onError,
      loading = "lazy",
      ...props
    },
    ref
  ) => {
    const [status, setStatus] = React.useState<LoadStatus>(src ? "loading" : "error");
    const [resolved, setResolved] = React.useState<string | undefined>(fetcher ? undefined : src);
    const imgRef = React.useRef<HTMLImageElement | null>(null);
    const fetcherRef = React.useRef(fetcher);
    fetcherRef.current = fetcher;
    const useFetcher = Boolean(fetcher);

    React.useEffect(() => {
      if (!src) {
        setStatus("error");
        setResolved(undefined);
        return;
      }
      setStatus("loading");
      if (!useFetcher) {
        setResolved(src);
        return;
      }
      setResolved(undefined);
      let cancelled = false;
      let objectUrl: string | undefined;
      fetcherRef.current!(src).then(
        (blob) => {
          if (cancelled) return;
          objectUrl = URL.createObjectURL(blob);
          setResolved(objectUrl);
        },
        () => {
          if (!cancelled) {
            setStatus("error");
            onError?.();
          }
        }
      );
      return () => {
        cancelled = true;
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src, useFetcher]);

    // Cached images can finish before React attaches onLoad.
    React.useEffect(() => {
      const img = imgRef.current;
      if (img && img.complete && img.naturalWidth > 0) setStatus("loaded");
    }, [resolved]);

    const aspect = ratio ?? (width && height ? width / height : undefined);
    const setRefs = (node: HTMLImageElement | null) => {
      imgRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    };

    return (
      <span
        data-slot="image"
        data-status={status}
        className={cn("relative block overflow-hidden bg-muted", className)}
        style={{ aspectRatio: aspect, ...style }}
      >
        {status === "loading" && <span aria-hidden data-slot="image-skeleton" className={cn("absolute inset-0", shimmerClass)} />}
        {status === "error" ? (
          <span
            role="img"
            aria-label={alt ? `${alt} (image unavailable)` : "Image unavailable"}
            className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-3 text-center text-xs text-muted-foreground"
          >
            {fallback ?? (
              <>
                <RiImageLine aria-hidden className="size-6 opacity-70" />
                <span aria-hidden>Image unavailable</span>
              </>
            )}
          </span>
        ) : resolved ? (
          <img
            ref={setRefs}
            src={resolved}
            alt={alt}
            width={width}
            height={height}
            loading={loading}
            decoding="async"
            onLoad={() => {
              setStatus("loaded");
              onLoad?.();
            }}
            onError={() => {
              setStatus("error");
              onError?.();
            }}
            className={cn(
              "block size-full transition-opacity duration-300",
              fit === "cover" ? "object-cover" : "object-contain",
              status === "loaded" ? "opacity-100" : "opacity-0",
              !aspect && status !== "loaded" && "min-h-24",
              imgClassName
            )}
            {...props}
          />
        ) : (
          !aspect && <span aria-hidden className="block min-h-24" />
        )}
      </span>
    );
  }
);
ImageWithFallback.displayName = "ImageWithFallback";

/* ------------------------------------------------------------------ */
/* Lightbox                                                            */
/* ------------------------------------------------------------------ */

export interface LightboxItem {
  src: string;
  alt: string;
  caption?: React.ReactNode;
  type?: "image" | "video";
  /** Smaller image for the thumbnail strip. */
  thumbnail?: string;
  /** Poster frame for videos. */
  poster?: string;
  /** Download file name (when downloads are enabled). */
  downloadName?: string;
}

interface LightboxContextValue {
  items: LightboxItem[];
  openAt: (index: number) => void;
}

const LightboxContext = React.createContext<LightboxContextValue | null>(null);

export interface LightboxProps {
  items: LightboxItem[];
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Wrap from the last item to the first. Default false. */
  loop?: boolean;
  /** Show the thumbnail strip (when there is more than one item). Default true. */
  thumbnails?: boolean;
  /** Show a download link for the current item. Default false. */
  download?: boolean;
  /** Maximum zoom factor. Default 4. */
  maxZoom?: number;
  /** Accessible name for the viewer. Default "Image viewer". */
  label?: string;
  className?: string;
  /** Children (e.g. `LightboxTrigger`s) can open the viewer at an index. */
  children?: React.ReactNode;
}

const MIN_ZOOM = 1;


const chromeButton = cn(
  "inline-flex size-10 shrink-0 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/15 hover:text-white disabled:pointer-events-none disabled:opacity-35 [&_svg]:size-5",
  focusRing,
  "focus-visible:ring-white/50"
);

/** Fullscreen media viewer: arrows/swipe, zoom + pan, counter, thumbnails, Escape to close, focus trap. */
export function Lightbox({
  items,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  index: indexProp,
  defaultIndex = 0,
  onIndexChange,
  loop = false,
  thumbnails = true,
  download = false,
  maxZoom = 4,
  label = "Image viewer",
  className,
  children,
}: LightboxProps) {
  const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
  const [rawIndex, setIndex] = useControllableState({ value: indexProp, defaultValue: defaultIndex, onChange: onIndexChange });
  const count = items.length;
  const index = count ? clamp(rawIndex, 0, count - 1) : 0;
  const item = items[index];
  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const [stage, setStage] = React.useState<HTMLDivElement | null>(null);
  const panStart = React.useRef<{ x: number; y: number; px: number; py: number; id: number } | null>(null);

  const resetZoom = React.useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  React.useEffect(resetZoom, [index, open, resetZoom]);

  const canPrev = count > 1 && (loop || index > 0);
  const canNext = count > 1 && (loop || index < count - 1);
  const go = React.useCallback(
    (delta: number) => {
      if (count < 2) return;
      let next = index + delta;
      if (loop) next = (next + count) % count;
      next = clamp(next, 0, count - 1);
      if (next !== index) setIndex(next);
    },
    [count, index, loop, setIndex]
  );

  const zoomTo = React.useCallback(
    (z: number) => {
      const next = clamp(z, MIN_ZOOM, maxZoom);
      setZoom(next);
      if (next === 1) setPan({ x: 0, y: 0 });
    },
    [maxZoom]
  );

  // Preload neighbours.
  React.useEffect(() => {
    if (!open || typeof Image === "undefined") return;
    for (const i of [index - 1, index + 1]) {
      const n = items[loop ? (i + count) % count : i];
      if (n && n.type !== "video") {
        const img = new Image();
        img.src = n.src;
      }
    }
  }, [open, index, items, loop, count]);

  // Pinch (ctrl+wheel on trackpads) needs a non-passive listener to stop the page zooming.
  React.useEffect(() => {
    if (!stage) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      setZoom((z) => {
        const next = clamp(z * Math.exp(-event.deltaY * 0.01), MIN_ZOOM, maxZoom);
        if (next === 1) setPan({ x: 0, y: 0 });
        return next;
      });
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [stage, maxZoom]);

  const swipe = useSwipe({
    axis: "x",
    mouse: true,
    allow: () => zoom === 1,
    onSwipeLeft: () => go(1),
    onSwipeRight: () => go(-1),
  });

  const ctx = React.useMemo<LightboxContextValue>(
    () => ({
      items,
      openAt: (i: number) => {
        setIndex(i);
        setOpen(true);
      },
    }),
    [items, setIndex, setOpen]
  );

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.defaultPrevented) return;
    const target = event.target as HTMLElement;
    if (target.tagName === "VIDEO" && (event.key === "ArrowLeft" || event.key === "ArrowRight")) return;
    switch (event.key) {
      case "ArrowLeft":
        go(-1);
        break;
      case "ArrowRight":
        go(1);
        break;
      case "Home":
        if (count) setIndex(0);
        break;
      case "End":
        if (count) setIndex(count - 1);
        break;
      case "+":
      case "=":
        zoomTo(zoom * 1.5);
        break;
      case "-":
        zoomTo(zoom / 1.5);
        break;
      case "0":
        resetZoom();
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  const isVideo = item?.type === "video";
  const counter = count > 0 ? `${index + 1} / ${count}` : "0 / 0";

  return (
    <LightboxContext.Provider value={ctx}>
      {children}
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <DialogPrimitive.Content
            aria-label={label}
            aria-describedby={undefined}
            onKeyDown={onKeyDown}
            data-slot="lightbox"
            className={cn(
              "fixed inset-0 z-50 flex flex-col text-white outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98] data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
              className
            )}
          >
            <DialogPrimitive.Title className="sr-only">{label}</DialogPrimitive.Title>
            <div className="flex shrink-0 items-center gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
              <span className="px-2 text-sm font-medium tabular-nums text-white/85" aria-live="polite" data-slot="lightbox-counter">
                {counter}
              </span>
              <span className="min-w-0 flex-1" />
              {!isVideo && (
                <>
                  <button type="button" className={chromeButton} aria-label="Zoom out" onClick={() => zoomTo(zoom / 1.5)} disabled={zoom <= MIN_ZOOM}>
                    <RiZoomOutLine aria-hidden />
                  </button>
                  <button type="button" className={chromeButton} aria-label="Zoom in" onClick={() => zoomTo(zoom * 1.5)} disabled={zoom >= maxZoom}>
                    <RiZoomInLine aria-hidden />
                  </button>
                </>
              )}
              {download && item && (
                <a href={item.src} download={item.downloadName ?? true} className={chromeButton} aria-label="Download">
                  <RiDownloadLine aria-hidden />
                </a>
              )}
              <DialogPrimitive.Close className={chromeButton} aria-label="Close viewer">
                <RiCloseLine aria-hidden />
              </DialogPrimitive.Close>
            </div>

            <div
              ref={setStage}
              data-slot="lightbox-stage"
              className={cn(
                "relative flex min-h-0 flex-1 touch-pan-y items-center justify-center overflow-hidden px-2 sm:px-16",
                zoom > 1 && "cursor-grab touch-none active:cursor-grabbing"
              )}
              onPointerDown={(event) => {
                swipe.onPointerDown(event);
                if (zoom > 1 && !isVideo) {
                  panStart.current = { x: event.clientX, y: event.clientY, px: pan.x, py: pan.y, id: event.pointerId };
                  try {
                    event.currentTarget.setPointerCapture?.(event.pointerId);
                  } catch {
                    /* best effort */
                  }
                }
              }}
              onPointerMove={(event) => {
                swipe.onPointerMove(event);
                const p = panStart.current;
                if (p && p.id === event.pointerId) {
                  setPan({ x: p.px + (event.clientX - p.x) / zoom, y: p.py + (event.clientY - p.y) / zoom });
                }
              }}
              onPointerUp={(event) => {
                swipe.onPointerUp(event);
                panStart.current = null;
              }}
              onPointerCancel={(event) => {
                swipe.onPointerCancel(event);
                panStart.current = null;
              }}
            >
              {item ? (
                isVideo ? (
                  <video
                    key={item.src}
                    src={item.src}
                    poster={item.poster}
                    controls
                    playsInline
                    aria-label={item.alt}
                    className="max-h-full max-w-full rounded-md bg-black"
                  />
                ) : (
                  <LightboxImage
                    key={item.src}
                    item={item}
                    zoom={zoom}
                    pan={pan}
                    onDoubleClick={() => zoomTo(zoom > 1 ? 1 : 2)}
                  />
                )
              ) : null}
              {count > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous"
                    onClick={() => go(-1)}
                    disabled={!canPrev}
                    className={cn(chromeButton, "absolute left-2 top-1/2 -translate-y-1/2 bg-black/35 max-sm:hidden sm:left-4")}
                  >
                    <RiArrowLeftSLine aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label="Next"
                    onClick={() => go(1)}
                    disabled={!canNext}
                    className={cn(chromeButton, "absolute right-2 top-1/2 -translate-y-1/2 bg-black/35 max-sm:hidden sm:right-4")}
                  >
                    <RiArrowRightSLine aria-hidden />
                  </button>
                </>
              )}
            </div>

            <div className="flex shrink-0 flex-col items-center gap-3 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
              {item?.caption ? <p className="max-w-2xl text-center text-sm text-white/85">{item.caption}</p> : null}
              {thumbnails && count > 1 && (
                <div className="flex max-w-full gap-2 overflow-x-auto px-1 py-1 scrollbar-none" role="group" aria-label="Thumbnails">
                  {items.map((it, i) => (
                    <button
                      key={`${it.src}-${i}`}
                      type="button"
                      onClick={() => setIndex(i)}
                      aria-label={`View ${i + 1} of ${count}: ${it.alt}`}
                      aria-current={i === index ? "true" : undefined}
                      className={cn(
                        "relative size-12 shrink-0 overflow-hidden rounded-md opacity-55 ring-2 ring-transparent transition-[opacity,box-shadow] hover:opacity-90 aria-[current=true]:opacity-100 aria-[current=true]:ring-white",
                        focusRing
                      )}
                    >
                      {it.type === "video" && !it.thumbnail && !it.poster ? (
                        <span className="flex size-full items-center justify-center bg-white/10 text-2xs">Video</span>
                      ) : (
                        <img src={it.thumbnail ?? it.poster ?? it.src} alt="" className="size-full object-cover" draggable={false} />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </LightboxContext.Provider>
  );
}
Lightbox.displayName = "Lightbox";

function LightboxImage({
  item,
  zoom,
  pan,
  onDoubleClick,
}: {
  item: LightboxItem;
  zoom: number;
  pan: { x: number; y: number };
  onDoubleClick: () => void;
}) {
  const [failed, setFailed] = React.useState(false);
  if (failed) {
    return (
      <div role="img" aria-label={`${item.alt} (image unavailable)`} className="flex flex-col items-center gap-2 text-sm text-white/70">
        <RiImageLine aria-hidden className="size-10" />
        <span aria-hidden>Image unavailable</span>
      </div>
    );
  }
  return (
    <img
      src={item.src}
      alt={item.alt}
      draggable={false}
      onDoubleClick={onDoubleClick}
      onError={() => setFailed(true)}
      data-zoom={zoom}
      className="max-h-full max-w-full select-none object-contain transition-transform duration-150 ease-out will-change-transform"
      style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)` }}
    />
  );
}

export interface LightboxTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Item index to open. */
  index: number;
  asChild?: boolean;
}

/** Opens the surrounding `Lightbox` at `index`. Render inside `<Lightbox>`'s children. */
export const LightboxTrigger = React.forwardRef<HTMLButtonElement, LightboxTriggerProps>(
  ({ index, asChild, onClick, className, "aria-label": ariaLabel, ...props }, ref) => {
    const ctx = React.useContext(LightboxContext);
    const Comp = asChild ? Slot.Root : "button";
    const item = ctx?.items[index];
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : "button"}
        aria-label={ariaLabel ?? (item ? `Open ${item.alt}` : undefined)}
        aria-haspopup="dialog"
        className={cn("cursor-zoom-in", !asChild && cn("block overflow-hidden rounded-box", focusRing), className)}
        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
          onClick?.(event);
          if (!event.defaultPrevented) ctx?.openAt(index);
        }}
        {...props}
      />
    );
  }
);
LightboxTrigger.displayName = "LightboxTrigger";

/** Imperative control for a `Lightbox`: `const lb = useLightbox(); lb.openAt(2); <Lightbox items={…} {...lb.props} />`. */
export function useLightbox(initialIndex = 0) {
  const [open, setOpen] = React.useState(false);
  const [index, setIndex] = React.useState(initialIndex);
  const openAt = React.useCallback((i = 0) => {
    setIndex(i);
    setOpen(true);
  }, []);
  const close = React.useCallback(() => setOpen(false), []);
  return {
    open,
    index,
    openAt,
    close,
    setIndex,
    props: { open, onOpenChange: setOpen, index, onIndexChange: setIndex },
  };
}
