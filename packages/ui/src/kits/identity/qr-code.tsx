import * as React from "react";
import { encode } from "uqr";
import { RiRefreshLine, RiTimeLine } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { formatCountdown } from "../../lib/duration";
import { clamp } from "../../lib/math";
import { toMs, type TimeInput } from "../../lib/time";
import { useCountdown } from "../../hooks/use-now";
import { Button } from "../../primitives/button";
import { CopyButton } from "../../primitives/copy-button";

/* ------------------------------------------------------------------ */
/* Geometry helpers                                                    */
/* ------------------------------------------------------------------ */

export type QRCodeECC = "L" | "M" | "Q" | "H";
export type QRCodeModuleStyle = "square" | "rounded" | "dots";
export type QRCodeFinderStyle = "square" | "rounded" | "circle";

function roundedRect(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  return (
    `M${x + rr},${y}H${x + w - rr}A${rr},${rr} 0 0 1 ${x + w},${y + rr}` +
    `V${y + h - rr}A${rr},${rr} 0 0 1 ${x + w - rr},${y + h}` +
    `H${x + rr}A${rr},${rr} 0 0 1 ${x},${y + h - rr}` +
    `V${y + rr}A${rr},${rr} 0 0 1 ${x + rr},${y}Z`
  );
}

function circle(cx: number, cy: number, r: number) {
  return `M${cx - r},${cy}a${r},${r} 0 1 0 ${r * 2},0a${r},${r} 0 1 0 ${-r * 2},0Z`;
}

/** One data module, with corners rounded only where it has no neighbours (fluid, connected look). */
function fluidModule(x: number, y: number, n: { t: boolean; r: boolean; b: boolean; l: boolean }) {
  const R = 0.5;
  const tl = !n.t && !n.l ? R : 0;
  const tr = !n.t && !n.r ? R : 0;
  const br = !n.b && !n.r ? R : 0;
  const bl = !n.b && !n.l ? R : 0;
  let d = `M${x + tl},${y}H${x + 1 - tr}`;
  if (tr) d += `a${tr},${tr} 0 0 1 ${tr},${tr}`;
  d += `V${y + 1 - br}`;
  if (br) d += `a${br},${br} 0 0 1 ${-br},${br}`;
  d += `H${x + bl}`;
  if (bl) d += `a${bl},${bl} 0 0 1 ${-bl},${-bl}`;
  d += `V${y + tl}`;
  if (tl) d += `a${tl},${tl} 0 0 1 ${tl},${-tl}`;
  return d + "Z";
}

function finderPaths(x: number, y: number, style: QRCodeFinderStyle) {
  if (style === "circle") {
    return { ring: circle(x + 3.5, y + 3.5, 3.5) + circle(x + 3.5, y + 3.5, 2.5), eye: circle(x + 3.5, y + 3.5, 1.5) };
  }
  if (style === "rounded") {
    return {
      ring: roundedRect(x, y, 7, 7, 2.2) + roundedRect(x + 1, y + 1, 5, 5, 1.4),
      eye: roundedRect(x + 2, y + 2, 3, 3, 0.9),
    };
  }
  return {
    ring: `M${x},${y}h7v7h-7zM${x + 1},${y + 1}v5h5v-5z`,
    eye: `M${x + 2},${y + 2}h3v3h-3z`,
  };
}

/* ------------------------------------------------------------------ */
/* QRCode                                                              */
/* ------------------------------------------------------------------ */

const ECC_ORDER: QRCodeECC[] = ["L", "M", "Q", "H"];

/** Encodes at `level`, stepping down to lower levels when the data doesn't fit. Null when nothing fits. */
function encodeQR(value: string, level: QRCodeECC) {
  for (let i = ECC_ORDER.indexOf(level); i >= 0; i--) {
    const ecc = ECC_ORDER[i]!;
    try {
      return { qr: encode(value, { ecc, border: 0 }), level: ecc };
    } catch {
      /* too long for this level */
    }
  }
  return null;
}

export interface QRCodeProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children" | "title"> {
  /** Text or URL to encode. */
  value: string;
  /** Rendered width and height in pixels. */
  size?: number;
  /** Error-correction level. Forced to `H` when a `logo` is shown. Data too long for the level falls back to a lower one (without the logo). */
  ecc?: QRCodeECC;
  moduleStyle?: QRCodeModuleStyle;
  finderStyle?: QRCodeFinderStyle;
  /** Module color. Defaults to `currentColor` (near-black unless you set a text color). */
  foreground?: string;
  /** Background / quiet-zone color. Keep it light for scanners. */
  background?: string;
  /** Quiet zone width in modules. */
  quietZone?: number;
  /** Centered logo: a React node or an image URL. Sits on a squircle plate that clears the modules behind it. */
  logo?: React.ReactNode;
  /** Logo plate width as a fraction of the code (0.1 to 0.3). */
  logoSize?: number;
  /** Accessible name. Defaults to "QR code". */
  title?: string;
  svgClassName?: string;
}

/** Real QR code rendered to inline SVG, with rounded/dot modules, styled finders and an optional logo. */
export const QRCode = React.forwardRef<HTMLSpanElement, QRCodeProps>(
  (
    {
      value,
      size = 192,
      ecc = "M",
      moduleStyle = "square",
      finderStyle,
      foreground = "currentColor",
      background = "#ffffff",
      quietZone = 4,
      logo,
      logoSize = 0.24,
      title = "QR code",
      className,
      svgClassName,
      style,
      ...props
    },
    ref
  ) => {
    const wantsLogo = logo != null && logo !== false;
    const requested: QRCodeECC = wantsLogo ? "H" : ecc;
    const finder: QRCodeFinderStyle = finderStyle ?? (moduleStyle === "square" ? "square" : "rounded");
    const titleId = React.useId();

    const encoded = React.useMemo(() => encodeQR(value, requested), [value, requested]);
    const qr = encoded?.qr;
    const level = encoded?.level ?? requested;
    // A logo hides modules, which only level H tolerates; drop it when the data fits only at a lower level.
    const hasLogo = wantsLogo && level === "H";
    const n = qr?.size ?? 0;
    const plate = hasLogo ? Math.max(5, Math.round(n * clamp(logoSize, 0.1, 0.3))) : 0;
    const plateStart = (n - plate) / 2;

    const { dataPath, finders } = React.useMemo(() => {
      if (!qr) return { dataPath: "", finders: [] };
      const isFinder = (r: number, c: number) =>
        (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
      const underPlate = (r: number, c: number) =>
        plate > 0 && r >= plateStart - 0.5 && r < plateStart + plate + 0.5 && c >= plateStart - 0.5 && c < plateStart + plate + 0.5;
      const dark = (r: number, c: number) =>
        r >= 0 && c >= 0 && r < n && c < n && qr.data[r]![c]! && !isFinder(r, c) && !underPlate(r, c);
      let d = "";
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (!dark(r, c)) continue;
          if (moduleStyle === "dots") d += circle(c + 0.5, r + 0.5, 0.42);
          else if (moduleStyle === "rounded")
            d += fluidModule(c, r, { t: dark(r - 1, c), r: dark(r, c + 1), b: dark(r + 1, c), l: dark(r, c - 1) });
          else d += `M${c},${r}h1v1h-1z`;
        }
      }
      const f = [
        [0, 0],
        [n - 7, 0],
        [0, n - 7],
      ].map(([x, y]) => finderPaths(x!, y!, finder));
      return { dataPath: d, finders: f };
    }, [qr, n, moduleStyle, finder, plate, plateStart]);

    const total = n + quietZone * 2;
    const logoSrc = typeof logo === "string" ? logo : null;

    if (!qr) {
      return (
        <span
          ref={ref}
          role="img"
          aria-label={`${title}: too long to encode`}
          data-slot="qr-code"
          data-error="too-long"
          className={cn(
            "relative inline-flex shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-muted p-3 text-center align-middle text-xs text-muted-foreground",
            className
          )}
          style={{ width: size, height: size, ...style }}
          {...props}
        >
          Too long for a QR code
        </span>
      );
    }

    return (
      <span
        ref={ref}
        data-slot="qr-code"
        className={cn("relative inline-block shrink-0 align-middle leading-none text-[#09090b]", className)}
        style={{ width: size, height: size, ...style }}
        dir="ltr"
        {...props}
      >
        <svg
          role="img"
          aria-labelledby={titleId}
          viewBox={`${-quietZone} ${-quietZone} ${total} ${total}`}
          width={size}
          height={size}
          data-modules={n}
          data-version={qr.version}
          data-ecc={level}
          shapeRendering={moduleStyle === "square" ? "crispEdges" : "geometricPrecision"}
          xmlns="http://www.w3.org/2000/svg"
          className={cn("block size-full", svgClassName)}
        >
          <title id={titleId}>{title}</title>
          <rect x={-quietZone} y={-quietZone} width={total} height={total} fill={background} />
          <path d={dataPath} fill={foreground} />
          {finders.map((f, i) => (
            <g key={i} fill={foreground}>
              <path d={f.ring} fillRule="evenodd" />
              <path d={f.eye} />
            </g>
          ))}
          {hasLogo && (
            <rect
              data-slot="qr-code-plate"
              x={plateStart}
              y={plateStart}
              width={plate}
              height={plate}
              rx={plate * 0.26}
              fill={background}
            />
          )}
        </svg>
        {hasLogo && (
          <span
            aria-hidden
            className="pointer-events-none absolute start-1/2 top-1/2 flex -translate-x-1/2 rtl:translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden [&>*]:size-full"
            style={{
              width: `${((plate - 1.2) / total) * 100}%`,
              height: `${((plate - 1.2) / total) * 100}%`,
              borderRadius: `${((plate * 0.2) / total) * size}px`,
            }}
          >
            {logoSrc ? <img src={logoSrc} alt="" className="object-contain" /> : logo}
          </span>
        )}
      </span>
    );
  }
);
QRCode.displayName = "QRCode";

/* ------------------------------------------------------------------ */
/* QRCodeCard                                                          */
/* ------------------------------------------------------------------ */

export interface QRCodeCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  value: string;
  /** Heading above the code, e.g. "Link a device". */
  title?: React.ReactNode;
  /** Short instruction under the code. */
  caption?: React.ReactNode;
  /** URL shown in the copy row. Defaults to `value`; pass `false` to hide the row. */
  url?: string | false;
  /** When the code stops being valid. Shows "Expires in m:ss". */
  expiresAt?: TimeInput;
  /** Called once when the countdown reaches zero. */
  onExpire?: () => void;
  /** Shows a refresh button on the expired overlay. */
  onRefresh?: () => void;
  refreshLabel?: React.ReactNode;
  /** Forces the expired state on or off (otherwise it follows `expiresAt`). */
  expired?: boolean;
  /** Heading of the expired overlay. Default "Code expired". */
  expiredLabel?: React.ReactNode;
  /** Replaces the inner `QRCode` inside the white frame (e.g. a crossfading stack, a spinner or a status). The frame keeps its size, and the expired blur and overlay still apply. */
  code?: React.ReactNode;
  /** Extra classes for the frame around the code (e.g. a card-coloured surface when `code` is not a QR code). */
  frameClassName?: string;
  /** Extra content at the bottom of the card. */
  children?: React.ReactNode;
  size?: number;
  logo?: React.ReactNode;
  /** Extra props for the inner `QRCode`. */
  qrProps?: Partial<Omit<QRCodeProps, "value">>;
}

/** QR code in a card with a caption, copyable link and an optional expiry countdown. */
export const QRCodeCard = React.forwardRef<HTMLDivElement, QRCodeCardProps>(
  (
    {
      value,
      title,
      caption,
      url,
      expiresAt,
      onExpire,
      onRefresh,
      refreshLabel = "Refresh code",
      expired: expiredProp,
      expiredLabel = "Code expired",
      code,
      frameClassName,
      children,
      size = 200,
      logo,
      qrProps,
      className,
      ...props
    },
    ref
  ) => {
    const deadline = toMs(expiresAt);
    const countdown = useCountdown(deadline, { onExpire });
    const expired = expiredProp ?? countdown.expired;
    const remainingMs = countdown.remainingMs;
    const shownUrl = url === false ? null : (url ?? value);

    return (
      <div
        ref={ref}
        data-slot="qr-code-card"
        data-expired={expired || undefined}
        className={cn(
          "flex w-full max-w-xs flex-col items-center gap-4 rounded-box border border-border bg-card p-5 text-center shadow-xs",
          className
        )}
        {...props}
      >
        {title != null && <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>}
        <div
          data-slot="qr-code-card-frame"
          className={cn(
            "relative rounded-xl bg-white p-1 shadow-xs ring-1 ring-black/5",
            code !== undefined && "overflow-hidden",
            frameClassName
          )}
          style={code !== undefined ? { width: size + 8, height: size + 8 } : undefined}
        >
          {code !== undefined ? (
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center transition-[filter,opacity] duration-300",
                expired && "opacity-40 blur-[3px]"
              )}
            >
              {code}
            </div>
          ) : (
            <QRCode
              value={value}
              size={size}
              logo={logo}
              quietZone={2}
              {...qrProps}
              className={cn("transition-[filter,opacity] duration-300", expired && "opacity-40 blur-[3px]", qrProps?.className)}
            />
          )}
          {expired && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-background/70 p-4 backdrop-blur-[1px]">
              <p className="text-sm font-semibold text-foreground">{expiredLabel}</p>
              {onRefresh && (
                <Button size="sm" variant="primary" leadingIcon={<RiRefreshLine aria-hidden />} onClick={onRefresh}>
                  {refreshLabel}
                </Button>
              )}
            </div>
          )}
        </div>
        {caption != null && <p className="text-sm text-muted-foreground">{caption}</p>}
        {deadline !== undefined && !expired && (
          <p
            role="timer"
            aria-live="off"
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-medium tabular-nums",
              remainingMs <= 15_000 ? "text-destructive" : "text-muted-foreground"
            )}
          >
            <RiTimeLine aria-hidden className="size-3.5" />
            Expires in {formatCountdown(remainingMs)}
          </p>
        )}
        {shownUrl && (
          <div className="flex w-full items-center gap-1 rounded-control border border-border bg-subtle py-1 ps-3 pe-1">
            <span className="min-w-0 flex-1 truncate text-start font-mono text-xs text-muted-foreground" title={shownUrl}>
              {shownUrl}
            </span>
            <CopyButton value={shownUrl} size="xs" label="Copy link" copiedLabel="Copied" />
          </div>
        )}
        {children}
      </div>
    );
  }
);
QRCodeCard.displayName = "QRCodeCard";
