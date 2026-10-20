import * as React from "react";
import { cn } from "../lib/cn";

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

export const countryFlagCodes = [
  "US", "GB", "IN", "KR", "JP", "CN", "DE", "FR", "IT", "ES",
  "CA", "AU", "BR", "MX", "NL", "SE", "NO", "FI", "DK", "CH",
  "IE", "PT", "PL", "RU", "UA", "TR", "SA", "AE", "SG", "ID",
  "TH", "VN", "PH", "ZA", "NG", "EG", "AR", "NZ", "BD", "PK",
] as const;

export type CountryFlagCode = (typeof countryFlagCodes)[number];

export interface CountryFlagInfo {
  code: CountryFlagCode;
  name: string;
  /** International dialing prefix including the leading "+". */
  dialCode: string;
}

/** Countries with hand-drawn flags, with display names and dial codes. */
export const countries: CountryFlagInfo[] = [
  { code: "US", name: "United States", dialCode: "+1" },
  { code: "GB", name: "United Kingdom", dialCode: "+44" },
  { code: "IN", name: "India", dialCode: "+91" },
  { code: "KR", name: "South Korea", dialCode: "+82" },
  { code: "JP", name: "Japan", dialCode: "+81" },
  { code: "CN", name: "China", dialCode: "+86" },
  { code: "DE", name: "Germany", dialCode: "+49" },
  { code: "FR", name: "France", dialCode: "+33" },
  { code: "IT", name: "Italy", dialCode: "+39" },
  { code: "ES", name: "Spain", dialCode: "+34" },
  { code: "CA", name: "Canada", dialCode: "+1" },
  { code: "AU", name: "Australia", dialCode: "+61" },
  { code: "BR", name: "Brazil", dialCode: "+55" },
  { code: "MX", name: "Mexico", dialCode: "+52" },
  { code: "NL", name: "Netherlands", dialCode: "+31" },
  { code: "SE", name: "Sweden", dialCode: "+46" },
  { code: "NO", name: "Norway", dialCode: "+47" },
  { code: "FI", name: "Finland", dialCode: "+358" },
  { code: "DK", name: "Denmark", dialCode: "+45" },
  { code: "CH", name: "Switzerland", dialCode: "+41" },
  { code: "IE", name: "Ireland", dialCode: "+353" },
  { code: "PT", name: "Portugal", dialCode: "+351" },
  { code: "PL", name: "Poland", dialCode: "+48" },
  { code: "RU", name: "Russia", dialCode: "+7" },
  { code: "UA", name: "Ukraine", dialCode: "+380" },
  { code: "TR", name: "Türkiye", dialCode: "+90" },
  { code: "SA", name: "Saudi Arabia", dialCode: "+966" },
  { code: "AE", name: "United Arab Emirates", dialCode: "+971" },
  { code: "SG", name: "Singapore", dialCode: "+65" },
  { code: "ID", name: "Indonesia", dialCode: "+62" },
  { code: "TH", name: "Thailand", dialCode: "+66" },
  { code: "VN", name: "Vietnam", dialCode: "+84" },
  { code: "PH", name: "Philippines", dialCode: "+63" },
  { code: "ZA", name: "South Africa", dialCode: "+27" },
  { code: "NG", name: "Nigeria", dialCode: "+234" },
  { code: "EG", name: "Egypt", dialCode: "+20" },
  { code: "AR", name: "Argentina", dialCode: "+54" },
  { code: "NZ", name: "New Zealand", dialCode: "+64" },
  { code: "BD", name: "Bangladesh", dialCode: "+880" },
  { code: "PK", name: "Pakistan", dialCode: "+92" },
];

/** Regional-indicator emoji flag for an ISO 3166-1 alpha-2 code (white flag when invalid). */
export function getFlagEmoji(code: string): string {
  const upper = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return "\u{1F3F3}\u{FE0F}";
  return String.fromCodePoint(...Array.from(upper).map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/* ------------------------------------------------------------------ */
/* Drawing helpers (all flags drawn on a 640×480 canvas)               */
/* ------------------------------------------------------------------ */

const W = 640;
const H = 480;

function starPoints(cx: number, cy: number, r: number, rotation = 0, inner = 0.382) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = ((rotation - 90 + i * 36) * Math.PI) / 180;
    const radius = i % 2 === 0 ? r : r * inner;
    pts.push(`${(cx + radius * Math.cos(angle)).toFixed(1)},${(cy + radius * Math.sin(angle)).toFixed(1)}`);
  }
  return pts.join(" ");
}

function Star({ cx, cy, r, rotation, fill }: { cx: number; cy: number; r: number; rotation?: number; fill: string }) {
  return <polygon points={starPoints(cx, cy, r, rotation)} fill={fill} />;
}

function hStripes(colors: string[], weights?: number[]) {
  const w = weights ?? colors.map(() => 1);
  const total = w.reduce((a, b) => a + b, 0);
  let y = 0;
  return colors.map((color, i) => {
    const h = (w[i] / total) * H;
    const rect = <rect key={i} x={0} y={y} width={W} height={h + 0.5} fill={color} />;
    y += h;
    return rect;
  });
}

function vStripes(colors: string[], weights?: number[]) {
  const w = weights ?? colors.map(() => 1);
  const total = w.reduce((a, b) => a + b, 0);
  let x = 0;
  return colors.map((color, i) => {
    const width = (w[i] / total) * W;
    const rect = <rect key={i} x={x} y={0} width={width + 0.5} height={H} fill={color} />;
    x += width;
    return rect;
  });
}

function nordicCross(bg: string, cross: string, thickness: number, inner?: { color: string; thickness: number }) {
  const cx = 216;
  const cy = 240;
  return (
    <>
      <rect width={W} height={H} fill={bg} />
      <rect x={cx - thickness / 2} y={0} width={thickness} height={H} fill={cross} />
      <rect x={0} y={cy - thickness / 2} width={W} height={thickness} fill={cross} />
      {inner ? (
        <>
          <rect x={cx - inner.thickness / 2} y={0} width={inner.thickness} height={H} fill={inner.color} />
          <rect x={0} y={cy - inner.thickness / 2} width={W} height={inner.thickness} fill={inner.color} />
        </>
      ) : null}
    </>
  );
}

const unionJack = (
  <>
    <rect width={W} height={H} fill="#012169" />
    <path d="M0 0 640 480M640 0 0 480" stroke="#ffffff" strokeWidth="96" />
    <path d="M0 0 640 480M640 0 0 480" stroke="#C8102E" strokeWidth="32" />
    <rect x="260" y="0" width="120" height="480" fill="#ffffff" />
    <rect x="0" y="180" width="640" height="120" fill="#ffffff" />
    <rect x="284" y="0" width="72" height="480" fill="#C8102E" />
    <rect x="0" y="204" width="640" height="72" fill="#C8102E" />
  </>
);

const usStars = (() => {
  const nodes: React.ReactNode[] = [];
  const cantonW = 256;
  const cantonH = (H * 7) / 13;
  for (let row = 0; row < 9; row++) {
    const count = row % 2 === 0 ? 6 : 5;
    for (let col = 0; col < count; col++) {
      const x = row % 2 === 0 ? ((col * 2 + 1) * cantonW) / 12 : ((col + 1) * cantonW) / 6;
      const y = ((row + 1) * cantonH) / 10;
      nodes.push(<Star key={`${row}-${col}`} cx={x} cy={y} r={10} fill="#ffffff" />);
    }
  }
  return nodes;
})();

const chakraSpokes = Array.from({ length: 24 }, (_, i) => {
  const a = (i * 15 * Math.PI) / 180;
  return (
    <line
      key={i}
      x1={320}
      y1={240}
      x2={(320 + 56 * Math.cos(a)).toFixed(1)}
      y2={(240 + 56 * Math.sin(a)).toFixed(1)}
      stroke="#000080"
      strokeWidth="3"
    />
  );
});

const sunRays = (cx: number, cy: number, r1: number, r2: number, color: string, count = 8, width = 8) =>
  Array.from({ length: count }, (_, i) => {
    const a = ((i * 360) / count) * (Math.PI / 180);
    return (
      <line
        key={i}
        x1={(cx + r1 * Math.cos(a)).toFixed(1)}
        y1={(cy + r1 * Math.sin(a)).toFixed(1)}
        x2={(cx + r2 * Math.cos(a)).toFixed(1)}
        y2={(cy + r2 * Math.sin(a)).toFixed(1)}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
      />
    );
  });

function trigram(x: number, y: number, angle: number) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`} fill="#000000">
      <rect x="-48" y="-34" width="96" height="16" />
      <rect x="-48" y="-8" width="96" height="16" />
      <rect x="-48" y="18" width="96" height="16" />
    </g>
  );
}

const mapleLeaf =
  "M320 120 342 162 365 150 358 210 400 170 410 192 445 185 430 228 445 235 380 285 390 310 328 300 328 360 312 360 312 300 250 310 260 285 195 235 210 228 195 185 230 192 240 170 282 210 275 150 298 162Z";

const flags: Record<CountryFlagCode, React.ReactNode> = {
  US: (
    <>
      {Array.from({ length: 13 }, (_, i) => (
        <rect key={i} x={0} y={(i * H) / 13} width={W} height={H / 13 + 0.5} fill={i % 2 === 0 ? "#B22234" : "#ffffff"} />
      ))}
      <rect width="256" height={(H * 7) / 13} fill="#3C3B6E" />
      {usStars}
    </>
  ),
  GB: unionJack,
  IN: (
    <>
      {hStripes(["#FF9933", "#ffffff", "#138808"])}
      <circle cx="320" cy="240" r="60" fill="none" stroke="#000080" strokeWidth="8" />
      {chakraSpokes}
      <circle cx="320" cy="240" r="10" fill="#000080" />
    </>
  ),
  KR: (
    <>
      <rect width={W} height={H} fill="#ffffff" />
      <g transform="rotate(36.87 320 240)">
        <circle cx="320" cy="240" r="120" fill="#CD2E3A" />
        <path d="M200 240a120 120 0 0 0 240 0Z" fill="#0047A0" />
        <circle cx="260" cy="240" r="60" fill="#CD2E3A" />
        <circle cx="380" cy="240" r="60" fill="#0047A0" />
      </g>
      {trigram(144, 108, -53.13)}
      {trigram(496, 372, -53.13)}
      {trigram(496, 108, 53.13)}
      {trigram(144, 372, 53.13)}
    </>
  ),
  JP: (
    <>
      <rect width={W} height={H} fill="#ffffff" />
      <circle cx="320" cy="240" r="144" fill="#BC002D" />
    </>
  ),
  CN: (
    <>
      <rect width={W} height={H} fill="#EE1C25" />
      <Star cx={112} cy={112} r={72} fill="#FFFF00" />
      <Star cx={224} cy={48} r={24} rotation={23} fill="#FFFF00" />
      <Star cx={272} cy={96} r={24} rotation={46} fill="#FFFF00" />
      <Star cx={272} cy={168} r={24} rotation={70} fill="#FFFF00" />
      <Star cx={224} cy={216} r={24} rotation={20} fill="#FFFF00" />
    </>
  ),
  DE: hStripes(["#000000", "#DD0000", "#FFCE00"]),
  FR: vStripes(["#002654", "#ffffff", "#CE1126"]),
  IT: vStripes(["#009246", "#ffffff", "#CE2B37"]),
  ES: (
    <>
      {hStripes(["#AA151B", "#F1BF00", "#AA151B"], [1, 2, 1])}
      <rect x="150" y="190" width="70" height="100" rx="18" fill="#AA151B" />
      <rect x="166" y="206" width="38" height="68" rx="10" fill="#F1BF00" />
    </>
  ),
  CA: (
    <>
      {vStripes(["#D80621", "#ffffff", "#D80621"], [1, 2, 1])}
      <path d={mapleLeaf} fill="#D80621" />
    </>
  ),
  AU: (
    <>
      <rect width={W} height={H} fill="#012169" />
      <svg x="0" y="0" width="320" height="240" viewBox="0 0 640 480">
        {unionJack}
      </svg>
      <polygon points={starPoints(160, 360, 54, 0, 0.45)} fill="#ffffff" />
      <Star cx={480} cy={400} r={30} fill="#ffffff" />
      <Star cx={400} cy={220} r={28} fill="#ffffff" />
      <Star cx={480} cy={96} r={28} fill="#ffffff" />
      <Star cx={556} cy={196} r={28} fill="#ffffff" />
      <Star cx={520} cy={266} r={16} fill="#ffffff" />
    </>
  ),
  BR: (
    <>
      <rect width={W} height={H} fill="#009C3B" />
      <polygon points="320,48 592,240 320,432 48,240" fill="#FFDF00" />
      <circle cx="320" cy="240" r="104" fill="#002776" />
      <path d="M220 214c70-18 142-8 198 34" fill="none" stroke="#ffffff" strokeWidth="16" />
    </>
  ),
  MX: (
    <>
      {vStripes(["#006847", "#ffffff", "#CE1126"])}
      <circle cx="320" cy="240" r="52" fill="none" stroke="#8C9157" strokeWidth="12" />
      <circle cx="320" cy="232" r="24" fill="#8B5A2B" />
    </>
  ),
  NL: hStripes(["#AE1C28", "#ffffff", "#21468B"]),
  SE: nordicCross("#006AA7", "#FECC00", 80),
  NO: nordicCross("#BA0C2F", "#ffffff", 120, { color: "#00205B", thickness: 60 }),
  FI: nordicCross("#ffffff", "#002F6C", 120),
  DK: nordicCross("#C8102E", "#ffffff", 72),
  CH: (
    <>
      <rect width={W} height={H} fill="#DA291C" />
      <rect x="284" y="120" width="72" height="240" fill="#ffffff" />
      <rect x="200" y="204" width="240" height="72" fill="#ffffff" />
    </>
  ),
  IE: vStripes(["#169B62", "#ffffff", "#FF883E"]),
  PT: (
    <>
      {vStripes(["#006600", "#FF0000"], [2, 3])}
      <circle cx="256" cy="240" r="84" fill="none" stroke="#FFE900" strokeWidth="18" />
      <rect x="226" y="196" width="60" height="78" rx="14" fill="#FF0000" stroke="#ffffff" strokeWidth="10" />
    </>
  ),
  PL: hStripes(["#ffffff", "#DC143C"]),
  RU: hStripes(["#ffffff", "#0039A6", "#D52B1E"]),
  UA: hStripes(["#0057B7", "#FFD700"]),
  TR: (
    <>
      <rect width={W} height={H} fill="#E30A17" />
      <circle cx="240" cy="240" r="120" fill="#ffffff" />
      <circle cx="270" cy="240" r="96" fill="#E30A17" />
      <Star cx={392} cy={240} r={60} rotation={-90} fill="#ffffff" />
    </>
  ),
  SA: (
    <>
      <rect width={W} height={H} fill="#006C35" />
      <path
        d="M170 180c20-24 40 10 60-10s40 14 60-6 40 16 60-4 40 14 60-6 40 12 60-4"
        fill="none"
        stroke="#ffffff"
        strokeWidth="18"
        strokeLinecap="round"
      />
      <path d="M180 300h270" stroke="#ffffff" strokeWidth="14" strokeLinecap="round" />
      <path d="M450 300l24-14v28Z" fill="#ffffff" />
    </>
  ),
  AE: (
    <>
      {hStripes(["#009739", "#ffffff", "#000000"])}
      <rect width="160" height={H} fill="#EF3340" />
    </>
  ),
  SG: (
    <>
      {hStripes(["#EF3340", "#ffffff"])}
      <circle cx="130" cy="120" r="72" fill="#ffffff" />
      <circle cx="160" cy="120" r="70" fill="#EF3340" />
      <Star cx={190} cy={70} r={16} fill="#ffffff" />
      <Star cx={232} cy={102} r={16} fill="#ffffff" />
      <Star cx={216} cy={154} r={16} fill="#ffffff" />
      <Star cx={164} cy={154} r={16} fill="#ffffff" />
      <Star cx={148} cy={102} r={16} fill="#ffffff" />
    </>
  ),
  ID: hStripes(["#CE1126", "#ffffff"]),
  TH: hStripes(["#A51931", "#F4F5F8", "#2D2A4A", "#F4F5F8", "#A51931"], [1, 1, 2, 1, 1]),
  VN: (
    <>
      <rect width={W} height={H} fill="#DA251D" />
      <Star cx={320} cy={250} r={130} fill="#FFFF00" />
    </>
  ),
  PH: (
    <>
      {hStripes(["#0038A8", "#CE1126"])}
      <polygon points="0,0 416,240 0,480" fill="#ffffff" />
      <circle cx="138" cy="240" r="38" fill="#FCD116" />
      {sunRays(138, 240, 50, 76, "#FCD116", 8, 10)}
      <Star cx={40} cy={50} r={20} fill="#FCD116" />
      <Star cx={40} cy={430} r={20} fill="#FCD116" />
      <Star cx={360} cy={240} r={20} rotation={-90} fill="#FCD116" />
    </>
  ),
  ZA: (
    <>
      {hStripes(["#E03C31", "#001489"])}
      <path d="M0 0 270 240H640M0 480 270 240" fill="none" stroke="#ffffff" strokeWidth="160" />
      <path d="M0 0 270 240H640M0 480 270 240" fill="none" stroke="#007749" strokeWidth="96" />
      <polygon points="0,48 214,240 0,432" fill="#FFB81C" />
      <polygon points="0,90 168,240 0,390" fill="#000000" />
    </>
  ),
  NG: vStripes(["#008751", "#ffffff", "#008751"]),
  EG: (
    <>
      {hStripes(["#CE1126", "#ffffff", "#000000"])}
      <path d="M320 196l26 18-6 52h-40l-6-52Z" fill="#C09300" />
      <rect x="296" y="268" width="48" height="12" rx="3" fill="#C09300" />
    </>
  ),
  AR: (
    <>
      {hStripes(["#74ACDF", "#ffffff", "#74ACDF"])}
      {sunRays(320, 240, 34, 62, "#F6B40E", 16, 8)}
      <circle cx="320" cy="240" r="34" fill="#F6B40E" stroke="#85340A" strokeWidth="3" />
    </>
  ),
  NZ: (
    <>
      <rect width={W} height={H} fill="#012169" />
      <svg x="0" y="0" width="320" height="240" viewBox="0 0 640 480">
        {unionJack}
      </svg>
      {[
        [480, 400, 30],
        [400, 230, 26],
        [480, 100, 26],
        [560, 210, 24],
      ].map(([cx, cy, r]) => (
        <g key={`${cx}-${cy}`}>
          <Star cx={cx} cy={cy} r={r + 8} fill="#ffffff" />
          <Star cx={cx} cy={cy} r={r} fill="#C8102E" />
        </g>
      ))}
    </>
  ),
  BD: (
    <>
      <rect width={W} height={H} fill="#006A4E" />
      <circle cx="288" cy="240" r="128" fill="#F42A41" />
    </>
  ),
  PK: (
    <>
      <rect width={W} height={H} fill="#01411C" />
      <rect width="160" height={H} fill="#ffffff" />
      <circle cx="410" cy="250" r="120" fill="#ffffff" />
      <circle cx="446" cy="220" r="106" fill="#01411C" />
      <Star cx={480} cy={170} r={38} rotation={-30} fill="#ffffff" />
    </>
  ),
};

const flagNames = new Map<string, string>(countries.map((c): [string, string] => [c.code, c.name]));

function isFlagCode(code: string): code is CountryFlagCode {
  return (countryFlagCodes as readonly string[]).includes(code);
}

/* ------------------------------------------------------------------ */
/* CountryFlag                                                         */
/* ------------------------------------------------------------------ */

export type CountryFlagSize = "xs" | "sm" | "md" | "lg" | "xl";

const flagHeights: Record<CountryFlagSize, number> = { xs: 12, sm: 16, md: 20, lg: 24, xl: 32 };

export interface CountryFlagProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** ISO 3166-1 alpha-2 country code (case-insensitive). */
  code: CountryFlagCode | (string & {});
  /** `rect` is 4:3, `square` 1:1, `circle` a round badge. */
  shape?: "rect" | "square" | "circle";
  /** Size token or height in pixels. */
  size?: CountryFlagSize | number;
  /** Accessible label; defaults to the country name. Pass `""` to hide from assistive tech. */
  label?: string;
}

/** A small, recognizable country flag drawn in inline SVG, with an emoji fallback. */
export const CountryFlag = React.forwardRef<HTMLSpanElement, CountryFlagProps>(
  ({ code, shape = "rect", size = "md", label, className, style, ...props }, ref) => {
    const upper = code.toUpperCase();
    const height = typeof size === "number" ? size : flagHeights[size];
    const width = shape === "rect" ? Math.round((height * 4) / 3) : height;
    const name = label ?? flagNames.get(upper) ?? upper;
    const hidden = name === "";

    return (
      <span
        ref={ref}
        role={hidden ? undefined : "img"}
        aria-label={hidden ? undefined : name}
        aria-hidden={hidden ? true : undefined}
        data-code={upper}
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center overflow-hidden align-middle",
          "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:ring-1 after:ring-inset after:ring-[color:light-dark(color-mix(in_oklab,black_10%,transparent),color-mix(in_oklab,white_15%,transparent))]",
          shape === "circle" ? "rounded-full" : height >= 24 ? "rounded-[3px]" : "rounded-[2px]",
          className
        )}
        style={{ width, height, ...style }}
        {...props}
      >
        {isFlagCode(upper) ? (
          <svg
            viewBox={`0 0 ${W} ${H}`}
            width={width}
            height={height}
            preserveAspectRatio="xMidYMid slice"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
            focusable="false"
            className="block size-full"
          >
            {flags[upper]}
          </svg>
        ) : (
          <span
            aria-hidden
            className="flex size-full items-center justify-center bg-muted leading-none"
            style={{ fontSize: Math.round(height * 0.8) }}
          >
            {getFlagEmoji(upper)}
          </span>
        )}
      </span>
    );
  }
);
CountryFlag.displayName = "CountryFlag";
