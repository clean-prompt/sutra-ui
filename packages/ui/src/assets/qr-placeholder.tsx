import * as React from "react";
import { cn } from "../lib/cn";
import { seededRandom } from "../lib/hash";

/* ------------------------------------------------------------------ */
/* QRCodePlaceholder                                                   */
/* ------------------------------------------------------------------ */

/** @deprecated See `QRCodePlaceholder`; use `QRCodeProps` with `QRCode`. */
export interface QRCodePlaceholderProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Seed for the (decorative, non-scannable) module pattern. */
  value?: string;
  /** Rendered size in pixels. */
  size?: number;
  /** Modules per side. */
  modules?: number;
  /** Optional center logo. */
  logo?: React.ReactNode;
  /** Draw a white quiet-zone card behind the code. */
  framed?: boolean;
}

/**
 * A decorative QR-code-like graphic for mockups and placeholders.
 *
 * @deprecated **Not scannable**: the modules are random noise, so a phone camera reads nothing (and it is still
 * announced as "QR code"). For anything a user might scan, use `QRCode` (or `QRCodeCard`) from `components/qr-code`,
 * which encodes a real value. Kept only for static mockups.
 */
export const QRCodePlaceholder = React.forwardRef<HTMLSpanElement, QRCodePlaceholderProps>(
  ({ value = "sutra", size = 160, modules = 25, logo, framed = true, className, ...props }, ref) => {
    const n = Math.max(21, modules);
    const hasLogo = logo != null && logo !== false;
    const d = React.useMemo(() => {
      const rand = seededRandom(value);
      const logoSpan = hasLogo ? Math.round(n * 0.28) : 0;
      const logoStart = Math.floor((n - logoSpan) / 2);
      const inFinder = (x: number, y: number) =>
        (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8);
      const inLogo = (x: number, y: number) =>
        logoSpan > 0 && x >= logoStart && x < logoStart + logoSpan && y >= logoStart && y < logoStart + logoSpan;
      let path = "";
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          if (inFinder(x, y) || inLogo(x, y)) continue;
          const timing = (x === 6 || y === 6) && !inFinder(x, y);
          const on = timing ? (x + y) % 2 === 0 : rand() > 0.52;
          if (on) path += `M${x} ${y}h1v1h-1z`;
        }
      }
      return path;
    }, [value, n, hasLogo]);

    const finder = (x: number, y: number) =>
      `M${x} ${y}h7v7h-7zM${x + 1} ${y + 1}v5h5v-5zM${x + 2} ${y + 2}h3v3h-3z`;

    return (
      <span
        ref={ref}
        role="img"
        aria-label="QR code"
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center text-[#09090b]",
          framed && "rounded-box border border-border bg-white p-3 shadow-xs",
          className
        )}
        {...props}
      >
        <svg
          viewBox={`0 0 ${n} ${n}`}
          width={size}
          height={size}
          shapeRendering="crispEdges"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
          focusable="false"
          className="block"
        >
          <path d={d} fill="currentColor" />
          <path
            d={`${finder(0, 0)}${finder(n - 7, 0)}${finder(0, n - 7)}`}
            fill="currentColor"
            fillRule="evenodd"
            shapeRendering="geometricPrecision"
          />
        </svg>
        {logo ? (
          <span className="absolute inset-0 flex items-center justify-center">
            <span
              className="flex items-center justify-center overflow-hidden rounded-md bg-white"
              style={{ width: size * 0.24, height: size * 0.24 }}
            >
              {logo}
            </span>
          </span>
        ) : null}
      </span>
    );
  }
);
QRCodePlaceholder.displayName = "QRCodePlaceholder";
