import * as React from "react";
import { cn } from "@cleanprompt/sutra-ui";

/**
 * Lays children out at the browser's own width, so viewport breakpoints (md:, lg:) match what the block would do on a real
 * page, and scales them down to the frame when the playground sidebar makes the frame narrower than the window.
 */
export function ViewportFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  const frameRef = React.useRef<HTMLDivElement>(null);
  const innerRef = React.useRef<HTMLDivElement>(null);
  const [fit, setFit] = React.useState({ scale: 1, width: 0, height: 0 });

  React.useLayoutEffect(() => {
    const frame = frameRef.current;
    const inner = innerRef.current;
    if (!frame || !inner) return;
    const measure = () => {
      const available = frame.clientWidth;
      const windowWidth = window.innerWidth;
      const narrower = available > 0 && windowWidth - available > 120;
      const width = narrower ? windowWidth : 0;
      const scale = narrower ? available / windowWidth : 1;
      setFit((prev) => {
        const height = inner.offsetHeight;
        return prev.scale === scale && prev.width === width && prev.height === height ? prev : { scale, width, height };
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  const scaled = fit.scale < 1;
  return (
    <div ref={frameRef} className="overflow-hidden" style={scaled ? { height: fit.height * fit.scale } : undefined}>
      <div
        ref={innerRef}
        className={cn("origin-top-left", className)}
        style={scaled ? { width: fit.width, transform: `scale(${fit.scale})` } : undefined}
      >
        {children}
      </div>
    </div>
  );
}
