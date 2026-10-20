import * as React from "react";
import { cn } from "../lib/cn";

export type FileCategory =
  | "document"
  | "spreadsheet"
  | "presentation"
  | "text"
  | "code"
  | "data"
  | "archive"
  | "image"
  | "audio"
  | "video"
  | "design"
  | "executable"
  | "font"
  | "unknown";

/** Representative color per file category, used for unknown extensions. */
export const fileCategoryColors: Record<FileCategory, string> = {
  document: "#2B579A",
  spreadsheet: "#16A34A",
  presentation: "#D24726",
  text: "#71717B",
  code: "#615FFF",
  data: "#CA8A04",
  archive: "#A16207",
  image: "#0EA5E9",
  audio: "#8B5CF6",
  video: "#F43F5E",
  design: "#A259FF",
  executable: "#52525C",
  font: "#475569",
  unknown: "#9F9FA9",
};

const formats: Record<string, { color: string; category: FileCategory }> = {
  pdf: { color: "#E5252A", category: "document" },
  doc: { color: "#2B579A", category: "document" },
  docx: { color: "#2B579A", category: "document" },
  odt: { color: "#2B579A", category: "document" },
  rtf: { color: "#3F3F46", category: "document" },
  pages: { color: "#F59E0B", category: "document" },
  epub: { color: "#84CC16", category: "document" },
  xls: { color: "#217346", category: "spreadsheet" },
  xlsx: { color: "#217346", category: "spreadsheet" },
  ods: { color: "#217346", category: "spreadsheet" },
  numbers: { color: "#16A34A", category: "spreadsheet" },
  csv: { color: "#16A34A", category: "spreadsheet" },
  tsv: { color: "#16A34A", category: "spreadsheet" },
  ppt: { color: "#D24726", category: "presentation" },
  pptx: { color: "#D24726", category: "presentation" },
  key: { color: "#0A84FF", category: "presentation" },
  odp: { color: "#D24726", category: "presentation" },
  txt: { color: "#71717B", category: "text" },
  md: { color: "#3F3F46", category: "text" },
  mdx: { color: "#3F3F46", category: "text" },
  log: { color: "#71717B", category: "text" },
  json: { color: "#CA8A04", category: "data" },
  xml: { color: "#F97316", category: "data" },
  yaml: { color: "#CB171E", category: "data" },
  yml: { color: "#CB171E", category: "data" },
  toml: { color: "#9C4121", category: "data" },
  sql: { color: "#E38C00", category: "data" },
  db: { color: "#52525C", category: "data" },
  sqlite: { color: "#0F80CC", category: "data" },
  js: { color: "#F7DF1E", category: "code" },
  mjs: { color: "#F7DF1E", category: "code" },
  jsx: { color: "#61DAFB", category: "code" },
  ts: { color: "#3178C6", category: "code" },
  tsx: { color: "#3178C6", category: "code" },
  html: { color: "#E34F26", category: "code" },
  css: { color: "#1572B6", category: "code" },
  scss: { color: "#CC6699", category: "code" },
  vue: { color: "#41B883", category: "code" },
  svelte: { color: "#FF3E00", category: "code" },
  py: { color: "#3776AB", category: "code" },
  ipynb: { color: "#F37626", category: "code" },
  java: { color: "#EA2D2E", category: "code" },
  kt: { color: "#7F52FF", category: "code" },
  swift: { color: "#F05138", category: "code" },
  go: { color: "#00ADD8", category: "code" },
  rs: { color: "#DEA584", category: "code" },
  rb: { color: "#CC342D", category: "code" },
  php: { color: "#777BB4", category: "code" },
  c: { color: "#A8B9CC", category: "code" },
  cpp: { color: "#00599C", category: "code" },
  cs: { color: "#68217A", category: "code" },
  sh: { color: "#4EAA25", category: "code" },
  zip: { color: "#A16207", category: "archive" },
  rar: { color: "#7C3AED", category: "archive" },
  "7z": { color: "#57534D", category: "archive" },
  tar: { color: "#78716C", category: "archive" },
  gz: { color: "#78716C", category: "archive" },
  png: { color: "#0EA5E9", category: "image" },
  jpg: { color: "#10B981", category: "image" },
  jpeg: { color: "#10B981", category: "image" },
  gif: { color: "#EC4899", category: "image" },
  svg: { color: "#FFB13B", category: "image" },
  webp: { color: "#14B8A6", category: "image" },
  avif: { color: "#0D9488", category: "image" },
  heic: { color: "#06B6D4", category: "image" },
  bmp: { color: "#0284C7", category: "image" },
  ico: { color: "#0284C7", category: "image" },
  tiff: { color: "#0369A1", category: "image" },
  mp3: { color: "#8B5CF6", category: "audio" },
  wav: { color: "#A855F7", category: "audio" },
  flac: { color: "#7C3AED", category: "audio" },
  aac: { color: "#9333EA", category: "audio" },
  ogg: { color: "#9333EA", category: "audio" },
  m4a: { color: "#8B5CF6", category: "audio" },
  mp4: { color: "#F43F5E", category: "video" },
  mov: { color: "#E11D48", category: "video" },
  avi: { color: "#BE123C", category: "video" },
  mkv: { color: "#BE123C", category: "video" },
  webm: { color: "#F43F5E", category: "video" },
  fig: { color: "#A259FF", category: "design" },
  sketch: { color: "#F7B500", category: "design" },
  psd: { color: "#31A8FF", category: "design" },
  ai: { color: "#FF9A00", category: "design" },
  xd: { color: "#FF61F6", category: "design" },
  indd: { color: "#FF3366", category: "design" },
  exe: { color: "#52525C", category: "executable" },
  msi: { color: "#52525C", category: "executable" },
  dmg: { color: "#71717B", category: "executable" },
  pkg: { color: "#71717B", category: "executable" },
  app: { color: "#3F3F46", category: "executable" },
  apk: { color: "#3DDC84", category: "executable" },
  deb: { color: "#A80030", category: "executable" },
  iso: { color: "#3F3F46", category: "executable" },
  ttf: { color: "#475569", category: "font" },
  otf: { color: "#475569", category: "font" },
  woff: { color: "#475569", category: "font" },
  woff2: { color: "#475569", category: "font" },
};

/** Short label for extensions longer than the five letters the badge holds (cutting them off would read "NUMBE", "SKETC"). */
const formatLabels: Record<string, string> = { numbers: "NUM", sketch: "SKTCH", sqlite: "SQLT", svelte: "SVLT" };

/** Brand color for every known extension. */
export const fileFormatColors: Record<string, string> = Object.fromEntries(
  Object.entries(formats).map(([ext, f]) => [ext, f.color])
);

/** Extract the lowercase extension from a filename, path or bare extension (`""` for names like `"Dockerfile"`). */
export function getFileExtension(filenameOrExt: string): string {
  const clean = filenameOrExt.trim().toLowerCase().split(/[?#]/)[0] ?? "";
  const base = clean.split(/[\\/]/).pop() ?? clean;
  const dot = base.lastIndexOf(".");
  if (dot !== -1) return base.slice(dot + 1);
  // No dot: a bare extension ("pdf") or an extensionless file name ("Dockerfile", "src/readme").
  if (base !== clean) return "";
  return Object.prototype.hasOwnProperty.call(formats, base) || /^[a-z0-9]{1,5}$/.test(base) ? base : "";
}

/** Category for a filename or extension, e.g. `"report.pdf"` → `"document"`. */
export function getFileCategory(filenameOrExt: string): FileCategory {
  return formats[getFileExtension(filenameOrExt)]?.category ?? "unknown";
}

function getFormatColor(ext: string) {
  return formats[ext]?.color ?? fileCategoryColors.unknown;
}

function isLight(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, "$1$1") : h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 175;
}

export type FileFormatIconSize = "xs" | "sm" | "md" | "lg" | "xl";

const fileHeights: Record<FileFormatIconSize, number> = { xs: 24, sm: 32, md: 40, lg: 48, xl: 64 };

export interface FileFormatIconProps extends Omit<React.ComponentPropsWithoutRef<"svg">, "children"> {
  /** Extension or filename (e.g. `"pdf"` or `"Q3 report.pdf"`). */
  ext: string;
  /** `default` white sheet with a colored label, `solid` colored sheet, `minimal` outline with colored text. */
  variant?: "default" | "solid" | "minimal";
  /** Size token or height in pixels. */
  size?: FileFormatIconSize | number;
  /** Override the label text (defaults to the uppercased extension; the long ones `numbers`, `sketch`, `sqlite` and `svelte` use a short form, other extensions are cut at five letters). */
  label?: string;
  /** Override the format color. */
  color?: string;
  /**
   * Ink on paper: one ink for every format (the label band, or the sheet in `solid`, in the foreground colour with paper-coloured
   * text) instead of the format colour. Unset follows the style: the paper style draws it mono, the others coloured; `true` forces mono
   * and `false` keeps the format colour in the paper style.
   */
  mono?: boolean;
  /** Accessible name; when set the icon is exposed as an image, otherwise it is decorative. */
  title?: string;
}

const BODY = "M6 .5h14.5l9 9V36a3.5 3.5 0 0 1-3.5 3.5H6A3.5 3.5 0 0 1 2.5 36V4A3.5 3.5 0 0 1 6 .5Z";
const FOLD = "M20.5 .5V6a3.5 3.5 0 0 0 3.5 3.5h5.5";

/** A document icon with a folded corner and a colored file-extension label. */
export const FileFormatIcon = React.forwardRef<SVGSVGElement, FileFormatIconProps>(
  ({ ext, variant = "default", size = "md", label, color, mono, title, className, ...props }, ref) => {
    const extension = getFileExtension(ext);
    const tint = color ?? getFormatColor(extension);
    const text = (label ?? formatLabels[extension] ?? (extension || "file")).toUpperCase().slice(0, 5);
    const height = typeof size === "number" ? size : fileHeights[size];
    const width = (height * 32) / 40;
    const fontSize = text.length > 4 ? 5.4 : text.length > 3 ? 6 : 6.8;
    const bandWidth = Math.min(30, Math.max(16, 5 + text.length * fontSize * 0.68));
    const labelInk = isLight(tint) ? "#18181b" : "#ffffff";
    const titleId = React.useId();

    return (
      <svg
        ref={ref}
        viewBox="0 0 32 40"
        width={width}
        height={height}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        data-slot="file-format-icon"
        data-variant={variant}
        data-mono={mono == null ? undefined : String(mono)}
        data-ext={extension}
        data-category={getFileCategory(extension)}
        className={cn("shrink-0 overflow-visible", className)}
        {...(title
          ? { role: "img", "aria-labelledby": titleId }
          : { "aria-hidden": true, focusable: "false" as const })}
        {...props}
      >
        {title ? <title id={titleId}>{title}</title> : null}

        {variant === "solid" ? (
          <>
            <path data-part="body" d={BODY} fill={tint} />
            <path data-part="fold" d={FOLD} fill="#000000" fillOpacity="0.2" />
            <text
              data-part="label"
              x="16"
              y="31"
              textAnchor="middle"
              fontSize={fontSize}
              fontWeight="700"
              fill={labelInk}
              className="font-sans"
              letterSpacing="0.02em"
            >
              {text}
            </text>
          </>
        ) : variant === "minimal" ? (
          <>
            <path d={BODY} className="fill-background stroke-border-strong" strokeWidth="1" />
            <path d={FOLD} className="stroke-border-strong" strokeWidth="1" strokeLinejoin="round" />
            <text
              data-part="label"
              x="16"
              y="31"
              textAnchor="middle"
              fontSize={fontSize}
              fontWeight="700"
              fill={isLight(tint) ? "#a16207" : tint}
              className="font-sans"
              letterSpacing="0.02em"
            >
              {text}
            </text>
          </>
        ) : (
          <>
            <path d={BODY} className="fill-background stroke-border-strong" strokeWidth="1" />
            <path d={FOLD} className="fill-muted stroke-border-strong" strokeWidth="1" strokeLinejoin="round" />
            <rect data-part="band" x="0" y="20" width={bandWidth} height="11" rx="2" fill={tint} />
            <text
              data-part="label"
              x={bandWidth / 2}
              y="27.6"
              textAnchor="middle"
              fontSize={fontSize}
              fontWeight="700"
              fill={labelInk}
              className="font-sans"
              letterSpacing="0.02em"
            >
              {text}
            </text>
          </>
        )}
      </svg>
    );
  }
);
FileFormatIcon.displayName = "FileFormatIcon";
