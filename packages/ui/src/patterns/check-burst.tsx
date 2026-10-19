import * as React from "react";
import { cn } from "../lib/cn";
import { burstKeyframes, burstParticles, burstPopKeyframes, type BurstShape } from "../lib/burst";
import { toneClasses, type Tone } from "../lib/tone";
import { useIsoLayoutEffect, useLatestRef } from "../hooks/use-iso-layout-effect";
import { prefersReducedMotion } from "../hooks/use-media-query";

export interface CheckBurstApi {
  /** Play one burst now (nothing shows under reduced motion). */
  burst: () => void;
}

export interface CheckBurstProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** What the burst belongs to (a checkbox, a streak flame). It swells with the burst unless `pop` is false. Optional: with no children the burst fills its positioned parent. */
  children?: React.ReactNode;
  /** A burst plays when this goes from false to true (never on mount). */
  active?: boolean;
  /** A burst plays whenever this value changes (a streak count). */
  burstKey?: string | number;
  /** Number of particles, 0 to 24. Default 10. */
  count?: number;
  /** How far the particles fly, in px from the centre. Default 28. */
  radius?: number;
  /** Particle size in px (a dash is 1.8 times as long). Default 5. */
  particleSize?: number;
  /** Milliseconds. Default 500. */
  duration?: number;
  /** `"multi"` cycles brand, success, warning and info; a tone paints them all in one colour. Default "multi". */
  tone?: Tone | "multi";
  shape?: BurstShape;
  /** Swell the children with the burst. Default true. */
  pop?: boolean;
  /** Called when a burst is asked for, also where reduced motion keeps it from showing. */
  onBurst?: () => void;
  /** Called when the particles are gone. */
  onBurstEnd?: () => void;
  /** Imperative handle (`burst()`). */
  apiRef?: React.Ref<CheckBurstApi>;
}

const MULTI: Tone[] = ["primary", "success", "warning", "info"];

function ease(el: Element): string {
  return (typeof getComputedStyle === "function" ? getComputedStyle(el).getPropertyValue("--sutra-ease").trim() : "") || "ease";
}

/**
 * A tiny celebratory pop for completing a task or reaching a streak: a ring of particles flies out of the centre and fades
 * (Web Animations on `translate`, `scale` and `opacity`, no keyframes in the stylesheet), and the content swells. Pure
 * decoration: the layer is `aria-hidden` and never carries information, so say the result in text (a live region, the
 * checked state). Under `prefers-reduced-motion` nothing plays. It draws past its own box, so keep it out of an
 * `overflow-hidden` ancestor. Drive it with `active`, `burstKey` or `apiRef.burst()`.
 */
export const CheckBurst = React.forwardRef<HTMLSpanElement, CheckBurstProps>(function CheckBurst(
  {
    children,
    active,
    burstKey,
    count = 10,
    radius = 28,
    particleSize = 5,
    duration = 500,
    tone = "multi",
    shape = "mixed",
    pop = true,
    onBurst,
    onBurstEnd,
    apiRef,
    className,
    ...props
  },
  ref
) {
  const [run, setRun] = React.useState(0);
  const layerRef = React.useRef<HTMLSpanElement | null>(null);
  const contentRef = React.useRef<HTMLSpanElement | null>(null);
  const latest = useLatestRef({ onBurst, onBurstEnd, duration, pop });
  const particles = React.useMemo(() => burstParticles({ count, radius, size: particleSize, shape }), [count, radius, particleSize, shape]);

  const fire = React.useCallback(() => {
    latest.current.onBurst?.();
    if (prefersReducedMotion()) return;
    setRun((n) => n + 1);
  }, [latest]);
  React.useImperativeHandle(apiRef, () => ({ burst: fire }), [fire]);

  const prevActive = React.useRef(active);
  const prevKey = React.useRef(burstKey);
  React.useEffect(() => {
    if (active && !prevActive.current) fire();
    prevActive.current = active;
  }, [active, fire]);
  React.useEffect(() => {
    if (burstKey !== prevKey.current) fire();
    prevKey.current = burstKey;
  }, [burstKey, fire]);

  // The particles exist only while a burst plays; the effect starts one animation each and clears the layer when all end.
  useIsoLayoutEffect(() => {
    const layer = layerRef.current;
    if (!run || !layer) return;
    const { duration: ms, pop: swell } = latest.current;
    const timing = { duration: ms, easing: ease(layer), fill: "backwards" as const };
    const animations: Animation[] = [];
    Array.from(layer.children).forEach((el, i) => {
      const p = particles[i];
      if (p && typeof el.animate === "function") animations.push(el.animate(burstKeyframes(p), { ...timing, delay: p.delay }));
    });
    const content = contentRef.current;
    if (swell && content && typeof content.animate === "function") {
      animations.push(content.animate(burstPopKeyframes, { duration: Math.min(ms, 300), easing: ease(layer) }));
    }
    let alive = true;
    const done = () => {
      if (!alive) return;
      setRun(0);
      latest.current.onBurstEnd?.();
    };
    if (!animations.length) done();
    else Promise.all(animations.map((a) => a.finished)).then(done, () => {});
    return () => {
      alive = false;
      animations.forEach((a) => a.cancel());
    };
  }, [run, particles, latest]);

  const colorOf = (i: number) => toneClasses.dot[tone === "multi" ? MULTI[i % MULTI.length]! : tone];
  return (
    <span ref={ref} data-slot="check-burst" data-bursting={run ? "true" : undefined} className={cn(children != null ? "relative inline-flex" : "pointer-events-none absolute inset-0", className)} {...props}>
      {children != null && (
        <span ref={contentRef} data-slot="check-burst-content" className="inline-flex">
          {children}
        </span>
      )}
      {run > 0 && (
        <span key={run} ref={layerRef} aria-hidden="true" data-slot="check-burst-layer" className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
          {particles.map((p) => (
            <span
              key={p.index}
              data-shape={p.shape}
              className={cn("col-start-1 row-start-1 opacity-0", "rounded-full", colorOf(p.index))}
              style={{ "--i": p.index, width: p.width, height: p.height, rotate: p.shape === "dash" ? `${p.angle}deg` : undefined } as React.CSSProperties}
            />
          ))}
        </span>
      )}
    </span>
  );
});
CheckBurst.displayName = "CheckBurst";
