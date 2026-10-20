import * as React from "react";
import { cn } from "../lib/cn";
import { colorForSeed, pickForSeed } from "../lib/hash";
import { initials as initialsOf } from "../lib/text";
import { isSafeHref } from "../lib/validate";
import { useDirection } from "../hooks/use-direction";
import { useSafeId } from "../hooks/use-safe-id";
import { SutraAppIcon, sutraAppMeta, sutraApps, type SutraApp } from "../assets/brand";
import { SutraMascot, mascotCharacters, type MascotCharacter, type MascotState } from "../assets/mascot";
import { canDrawMonogram, layoutMonogram } from "./identity-avatar-glyphs-internal";

/* ------------------------------------------------------------------ */
/* Vocabulary                                                          */
/* ------------------------------------------------------------------ */

/** What the avatar stands for: a person (photo or initials), an agent or a machine (a Sutra mascot head), or an app (its tile). */
export type IdentityAvatarKind = "person" | "agent" | "machine" | "app";
/** Presence: `online`, `busy`, `away` or `offline`. */
export type IdentityAvatarPresence = "online" | "busy" | "away" | "offline";
/** How presence is drawn: `mark` a shaped mark in the corner, `bead` a thread round the face with a bead on it. */
export type IdentityAvatarPresenceStyle = "mark" | "bead";
/** Size steps, 20 to 64 px. */
export type IdentityAvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
/** How a person's initials are set: `drawn` in monoline strokes (the wordmark's manner) or `text` in the UI font. */
export type IdentityAvatarMonogram = "drawn" | "text";

/** The pixel size of each step. */
export const identityAvatarSizes: Record<IdentityAvatarSize, number> = { xs: 20, sm: 24, md: 32, lg: 48, xl: 64 };

/** The word each presence adds to the accessible name ("Ada, agent, busy"). */
export const identityAvatarPresenceLabels: Record<IdentityAvatarPresence, string> = {
  online: "online",
  busy: "busy",
  away: "away",
  offline: "offline",
};

const KIND_WORD: Record<IdentityAvatarKind, string> = { person: "", agent: "agent", machine: "machine", app: "app" };
const PRESENCES: readonly IdentityAvatarPresence[] = ["online", "busy", "away", "offline"];
/** The mascot's expression for each presence: awake, at work, asleep; offline is asleep and dimmed by the stylesheet. */
const MASCOT_STATE: Record<IdentityAvatarPresence, MascotState> = { online: "idle", busy: "working", away: "sleeping", offline: "sleeping" };
/** Characters a seed may land on. The Sutradhar's head and shoulders reads as a person without a photo, so it is opt-in. */
const SEEDED_CHARACTERS: readonly MascotCharacter[] = mascotCharacters.filter((c) => c !== "sutradhar");

/**
 * How each character is cropped for an avatar: the point of its 64 box that sits at the centre (`cx`, `cy`) and the zoom.
 * The bare mascot is drawn whole in its box; the avatar wants the head, a little larger.
 */
const CROP: Record<MascotCharacter, { zoom: number; cx: number; cy: number }> = {
  bead: { zoom: 1.12, cx: 30.5, cy: 33 },
  pendant: { zoom: 1.3, cx: 32, cy: 35 },
  mala: { zoom: 1.08, cx: 32, cy: 33 },
  bindu: { zoom: 1.12, cx: 32, cy: 34 },
  "knot-pendant": { zoom: 1.24, cx: 32, cy: 32 },
  bow: { zoom: 1.1, cx: 30, cy: 32 },
  bun: { zoom: 1.2, cx: 32, cy: 33 },
  sutradhar: { zoom: 1.9, cx: 32, cy: 21 },
};

/* ------------------------------------------------------------------ */
/* Pure helpers                                                        */
/* ------------------------------------------------------------------ */

/** The mascot character a seed lands on when none is chosen (every character except the Sutradhar, by hash). */
export function identityAvatarCharacter(seed: string): MascotCharacter {
  return pickForSeed(seed, SEEDED_CHARACTERS) ?? "bead";
}

/** A photo URL that is safe in an SVG `<image>`, or null (photos can come from user-supplied profiles). */
function safePhoto(src: string | null | undefined): string | null {
  if (typeof src !== "string") return null;
  const s = src.trim();
  if (!s) return null;
  return /^(blob:|data:image\/)/i.test(s) || (isSafeHref(s) && !/^(mailto|tel):/i.test(s)) ? s : null;
}

const f = (n: number) => Number(n.toFixed(2));

function circleD(cx: number, cy: number, r: number) {
  return `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;
}
function capsuleD(cx: number, cy: number, w: number, h: number) {
  const hr = h / 2;
  const x0 = cx - w / 2 + hr;
  const x1 = cx + w / 2 - hr;
  return `M${f(x0)} ${f(cy - hr)}H${f(x1)}a${f(hr)} ${f(hr)} 0 0 1 0 ${f(h)}H${f(x0)}a${f(hr)} ${f(hr)} 0 0 1 0 ${f(-h)}Z`;
}
function rrectD(x: number, y: number, w: number, h: number, r: number) {
  const k = Math.min(r, w / 2, h / 2);
  return (
    `M${f(x + k)} ${f(y)}H${f(x + w - k)}A${f(k)} ${f(k)} 0 0 1 ${f(x + w)} ${f(y + k)}V${f(y + h - k)}` +
    `A${f(k)} ${f(k)} 0 0 1 ${f(x + w - k)} ${f(y + h)}H${f(x + k)}A${f(k)} ${f(k)} 0 0 1 ${f(x)} ${f(y + h - k)}V${f(y + k)}` +
    `A${f(k)} ${f(k)} 0 0 1 ${f(x + k)} ${f(y)}Z`
  );
}

/** Where a sliding bead turns (inline: it depends on the size) and which way it slides (towards the side, mirrored in RTL). */
function slideStyle(origin: string, rtl: boolean): React.CSSProperties {
  return { transformOrigin: origin, ["--sutra-ia-slide" as string]: rtl ? "26deg" : "-26deg" };
}

/** The shaped presence mark (solid, barred, half, hollow), centred at (cx, cy). */
function PresenceMark({ presence, cx, cy, r }: { presence: IdentityAvatarPresence; cx: number; cy: number; r: number }) {
  const sw = Math.max(1.2, 0.28 * r);
  if (presence === "online") return <circle cx={f(cx)} cy={f(cy)} r={f(r)} fill="currentColor" />;
  if (presence === "busy") {
    return <path fillRule="evenodd" fill="currentColor" d={circleD(cx, cy, r) + capsuleD(cx, cy, 1.2 * r, Math.max(1.35, 0.36 * r))} />;
  }
  const rr = r - sw / 2;
  return (
    <>
      <circle cx={f(cx)} cy={f(cy)} r={f(rr)} fill="none" stroke="currentColor" strokeWidth={f(sw)} />
      {presence === "away" ? <path fill="currentColor" d={`M${f(cx)} ${f(cy - rr)}A${f(rr)} ${f(rr)} 0 0 0 ${f(cx)} ${f(cy + rr)}Z`} /> : null}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* IdentityAvatar                                                      */
/* ------------------------------------------------------------------ */

export interface IdentityAvatarProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "color" | "children"> {
  /**
   * What the avatar stands for: `person` a photo or initials, `agent` and `machine` a Sutra mascot head (machines in a rounded
   * square), `app` the Sutra app tile.
   * @default "person"
   */
  kind?: IdentityAvatarKind;
  /** Display name: the source of a person's initials and of the accessible name. Apps default to the app's name. */
  name?: string;
  /** Stable id (a user or agent id). It picks the seed colour and, when `character` is not given, the agent's mascot. Defaults to `name`. */
  seed?: string;
  /** A person's photo URL. The initials show while it loads, if it fails, or if the URL is unsafe (http(s), relative, `blob:` and `data:image/`). */
  src?: string | null;
  /** The Sutra mascot of an agent or machine (`SutraMascot` `character`). Without it the seed picks one (never the Sutradhar). */
  character?: MascotCharacter;
  /** The Sutra app of an `app` avatar, drawn with `SutraAppIcon`. Other apps get a tile with their initials. */
  app?: SutraApp;
  /** Presence: `online`, `busy`, `away` or `offline`. Leave it out for no presence. */
  presence?: IdentityAvatarPresence | null;
  /**
   * `mark` a small shaped mark in the corner (solid online, barred busy, half away, hollow offline); `bead` a thread round the face
   * with a bead on it (full thread online, a barred bead busy, half a thread away, a dashed thread and hollow bead offline). Apps
   * always use the mark.
   * @default "mark"
   */
  presenceStyle?: IdentityAvatarPresenceStyle;
  /**
   * A step from `xs` (20 px) to `xl` (64 px), or a number of pixels.
   * @default "md"
   */
  size?: IdentityAvatarSize | number;
  /**
   * `drawn` sets a person's initials in monoline strokes like the wordmark (one initial under 32 px); letters it has no drawing for,
   * and other scripts, fall back to `text`, the UI font.
   * @default "drawn"
   */
  monogram?: IdentityAvatarMonogram;
  /** Seed colour override (any CSS colour) for the stock style; the paper style draws in ink. Defaults to a colour picked by the seed. */
  color?: string;
  /** Accessible name. Defaults to the name, the kind and the presence ("Ada, agent, busy"). */
  label?: string;
  /** Hide from assistive technology (use it when the name is next to the avatar). Avatars without a name are always decorative. */
  decorative?: boolean;
  /** Let an agent's mascot move (and a busy agent's bead slide along its thread). Avatars hold still by default; reduced motion stops it. */
  animated?: boolean;
}

/**
 * An avatar for anyone in a Sutra room: people (photo or drawn initials), agents and machines (a Sutra mascot head whose face follows
 * the presence) and apps (the Bead app tiles), with presence drawn as a shaped mark or as a bead on a thread. Ink in the paper style,
 * the seed tint in the stock style. Decorative unless it has a name.
 */
export const IdentityAvatar = React.forwardRef<HTMLSpanElement, IdentityAvatarProps>(
  (
    {
      kind = "person",
      name,
      seed,
      src,
      character,
      app,
      presence,
      presenceStyle = "mark",
      size = "md",
      monogram = "drawn",
      color,
      label,
      decorative,
      animated = false,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const uid = useSafeId("identity-avatar");
    const rtl = useDirection() === "rtl";
    const S = typeof size === "number" && Number.isFinite(size) && size > 0 ? size : identityAvatarSizes[size as IdentityAvatarSize] ?? 32;
    const state = presence && PRESENCES.includes(presence) ? presence : null;
    const sutraApp = kind === "app" && app && (sutraApps as readonly string[]).includes(app) ? app : undefined;
    const displayName = name ?? (sutraApp ? sutraAppMeta[sutraApp].name : undefined);
    const seedText = seed ?? displayName ?? "";
    const tint = color ?? colorForSeed(seedText);
    const photo = kind === "person" ? safePhoto(src) : null;
    const [failed, setFailed] = React.useState<string | null>(null);
    const showPhoto = photo !== null && failed !== photo;
    const bead = presenceStyle === "bead" && kind !== "app" && state !== null;
    const squareFrame = kind === "machine";
    const mascot = kind === "agent" || kind === "machine" ? character ?? identityAvatarCharacter(seedText) : null;
    /* a busy agent's bead slides along its thread while the avatar is animated */
    const sliding = bead && state === "busy" && mascot !== null && animated;

    /* ---- geometry, in pixels (the svg's user units are pixels, so strokes and the mascot get their true optical size) ---- */
    const RX = squareFrame ? 0.28 * S : kind === "app" ? (14.3 / 64) * S : S / 2;
    const tw = 0.018 * S + 1;
    const inset = bead ? tw + 0.022 * S + 0.85 : 0;
    const faceRx = squareFrame || kind === "app" ? Math.max(RX - inset, 2) : (S - 2 * inset) / 2;
    const faceD = squareFrame || kind === "app" ? rrectD(inset, inset, S - 2 * inset, S - 2 * inset, faceRx) : circleD(S / 2, S / 2, S / 2 - inset);
    const side = (x: number) => (rtl ? S - x : x);

    /* presence: a mark in the corner, or a bead on the thread */
    let gap: { cx: number; cy: number; r: number } | null = null;
    let presenceArt: React.ReactNode = null;
    let threadArt: React.ReactNode = null;
    let slide: { origin: string } | null = null;
    if (state && !bead) {
      const r = (0.19 * S + 3.4) / 2;
      const cx = side(S - r);
      const cy = S - r;
      gap = { cx, cy, r: r + 0.035 * S + 0.9 };
      presenceArt = (
        <g data-part="presence">
          <PresenceMark presence={state} cx={cx} cy={cy} r={r} />
        </g>
      );
    } else if (state && bead) {
      const rb = (0.15 * S + 3.6) / 2;
      const gb = 0.028 * S + 0.85;
      let bx: number;
      let by: number;
      let perimeter: number;
      let along: number;
      let thread: (extra: React.SVGProps<SVGElement>) => React.ReactNode;
      if (!squareFrame) {
        const Rt = S / 2 - tw / 2;
        bx = S / 2 + Rt * Math.SQRT1_2;
        by = bx;
        perimeter = 2 * Math.PI * Rt;
        along = perimeter / 8;
        slide = { origin: `${f(S / 2)}px ${f(S / 2)}px` };
        thread = (extra) => <circle cx={f(S / 2)} cy={f(S / 2)} r={f(Rt)} {...(extra as React.SVGProps<SVGCircleElement>)} />;
      } else {
        const cr = RX - tw / 2;
        const straight = S - tw - 2 * cr;
        const cc = S - RX;
        bx = cc + cr * Math.SQRT1_2;
        by = bx;
        perimeter = 4 * straight + 2 * Math.PI * cr;
        along = 2 * straight + (Math.PI * cr) / 2 + (Math.PI * cr) / 4;
        slide = { origin: `${f(rtl ? S - cc : cc)}px ${f(cc)}px` };
        thread = (extra) => (
          <rect x={f(tw / 2)} y={f(tw / 2)} width={f(S - tw)} height={f(S - tw)} rx={f(cr)} {...(extra as React.SVGProps<SVGRectElement>)} />
        );
      }
      const dash: React.SVGProps<SVGElement> =
        state === "away"
          ? { strokeDasharray: `${f(perimeter / 2)} ${f(perimeter / 2)}`, strokeDashoffset: f(perimeter / 4 - along), strokeLinecap: "round" }
          : state === "offline"
            ? (() => {
                const n = Math.max(8, Math.round(perimeter / (2.6 * tw + 2.4)));
                const seg = perimeter / n;
                return { strokeDasharray: `${f(seg * 0.56)} ${f(seg * 0.44)}` };
              })()
            : {};
      bx = side(bx);
      gap = { cx: bx, cy: by, r: rb + gb };
      threadArt = (
        <g data-part="thread" transform={rtl ? `translate(${f(S)} 0) scale(-1 1)` : undefined}>
          {thread({ fill: "none", stroke: "currentColor", strokeWidth: f(tw), ...dash })}
        </g>
      );
      const beadShape =
        state === "offline" ? (
          <circle cx={f(bx)} cy={f(by)} r={f(rb - tw / 2)} fill="none" stroke="currentColor" strokeWidth={f(tw)} />
        ) : state === "busy" ? (
          <path fillRule="evenodd" fill="currentColor" d={circleD(bx, by, rb) + capsuleD(bx, by, 1.2 * rb, Math.max(1.35, 0.36 * rb))} />
        ) : (
          <circle cx={f(bx)} cy={f(by)} r={f(rb)} fill="currentColor" />
        );
      presenceArt = (
        <g data-part="bead" data-slide={sliding ? "" : undefined} style={sliding && slide ? slideStyle(slide.origin, rtl) : undefined}>
          {beadShape}
        </g>
      );
    }

    /* ---- the face ---- */
    let face: React.ReactNode;
    if (kind === "person") {
      const words = initialsOf(displayName ?? "");
      const letters = S < 32 ? [...words].slice(0, 1).join("") : words;
      const drawn = monogram === "drawn" && letters.length > 0 && canDrawMonogram(letters);
      const nudge = S < 32 && state && !bead ? 0.34 : 0; /* keep a lone letter clear of the corner mark */
      const cx = S / 2 - (rtl ? -nudge : nudge) * (S / 20);
      const cy = S / 2 - nudge * 0.8 * (S / 20);
      let ink: React.ReactNode = null;
      if (drawn) {
        const inner = S - 2 * inset;
        const capPx = (letters.length > 1 ? 0.3 : state && !bead && S < 32 ? 0.38 : 0.4) * inner;
        const m = layoutMonogram(letters, S, { cx, cy, capPx, maxWidth: inner * 0.62 });
        ink = (
          <g
            data-part="monogram"
            data-monogram="drawn"
            transform={`translate(${f(m.x)} ${f(m.y)}) scale(${f(m.scale)})`}
            fill="none"
            stroke="currentColor"
            strokeWidth={f(m.strokeWidth)}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {m.glyphs.map((g, i) => (
              <path key={i} d={g.d} transform={g.x ? `translate(${f(g.x)} 0)` : undefined} />
            ))}
          </g>
        );
      } else if (letters) {
        const inner = S - 2 * inset;
        const fontSize = (letters.length > 1 ? 0.36 : 0.46) * inner;
        ink = (
          <text
            data-part="monogram"
            data-monogram="text"
            x={f(cx)}
            y={f(cy)}
            dy="0.35em"
            textAnchor="middle"
            fontSize={f(fontSize)}
            fontWeight={500}
            fill="currentColor"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            {letters}
          </text>
        );
      }
      face = showPhoto ? (
        <>
          <image
            data-part="photo"
            href={photo!}
            x={f(inset)}
            y={f(inset)}
            width={f(S - 2 * inset)}
            height={f(S - 2 * inset)}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${uid}-face)`}
            onError={() => setFailed(photo)}
          />
          <path data-part="hairline" d={circleD(S / 2, S / 2, S / 2 - inset - 0.5)} fill="none" stroke="currentColor" strokeWidth={1} />
        </>
      ) : (
        <>
          <path data-part="disc" d={faceD} fill="currentColor" />
          <path data-part="hairline" d={circleD(S / 2, S / 2, S / 2 - inset - 0.5)} fill="none" stroke="currentColor" strokeWidth={1} />
          {ink}
        </>
      );
    } else if (mascot) {
      const c = CROP[mascot];
      const mS = S * c.zoom;
      const k = mS / 64;
      face = (
        <>
          <path data-part="frame" d={faceD} fill="currentColor" />
          <g clipPath={`url(#${uid}-face)`}>
            <g data-part="mascot">
              <SutraMascot
                character={mascot}
                state={state ? MASCOT_STATE[state] : "idle"}
                size={f(mS)}
                x={f(S / 2 - c.cx * k)}
                y={f(S / 2 - c.cy * k)}
                paused={!animated}
              />
            </g>
          </g>
        </>
      );
    } else if (sutraApp) {
      face = (
        <g data-part="app">
          <SutraAppIcon app={sutraApp} size={S} />
        </g>
      );
    } else {
      /* an app that is not a Sutra app: a tile with its initials */
      const letters = initialsOf(displayName ?? "", { mode: "first-two", singleWord: 2, fallback: "?" });
      const one = S < 32 ? letters.slice(0, 1) : letters;
      const drawn = monogram === "drawn" && canDrawMonogram(one);
      const m = drawn ? layoutMonogram(one, S, { cx: S / 2, cy: S / 2, capPx: (one.length > 1 ? 0.3 : 0.4) * S, maxWidth: S * 0.62 }) : null;
      face = (
        <>
          <path data-part="frame" d={faceD} fill="currentColor" />
          {m ? (
            <g
              data-part="monogram"
              data-monogram="drawn"
              transform={`translate(${f(m.x)} ${f(m.y)}) scale(${f(m.scale)})`}
              fill="none"
              stroke="currentColor"
              strokeWidth={f(m.strokeWidth)}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {m.glyphs.map((g, i) => (
                <path key={i} d={g.d} transform={g.x ? `translate(${f(g.x)} 0)` : undefined} />
              ))}
            </g>
          ) : (
            <text
              data-part="monogram"
              data-monogram="text"
              x={f(S / 2)}
              y={f(S / 2)}
              dy="0.35em"
              textAnchor="middle"
              fontSize={f((one.length > 1 ? 0.36 : 0.46) * S)}
              fontWeight={500}
              fill="currentColor"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              {one}
            </text>
          )}
        </>
      );
    }

    const kindWord = KIND_WORD[kind] ?? "";
    const accessibleName = label ?? (displayName ? [displayName, kindWord, state ? identityAvatarPresenceLabels[state] : ""].filter(Boolean).join(", ") : undefined);
    const hidden = decorative || !accessibleName;
    const gapMask = gap ? `${uid}-gap` : null;

    return (
      <span
        role={hidden ? undefined : "img"}
        aria-label={hidden ? undefined : accessibleName}
        aria-hidden={hidden || undefined}
        data-slot="identity-avatar"
        data-kind={kind}
        data-presence={state ?? undefined}
        data-presence-style={state ? (bead ? "bead" : "mark") : undefined}
        data-character={mascot ?? undefined}
        data-photo={showPhoto ? "" : undefined}
        {...props}
        ref={ref}
        className={cn("relative inline-flex shrink-0 select-none align-middle", className)}
        style={{ width: S, height: S, ["--sutra-ia-seed" as string]: tint, ...style }}
      >
        <svg viewBox={`0 0 ${f(S)} ${f(S)}`} width={f(S)} height={f(S)} fill="none" aria-hidden focusable="false" className="block overflow-visible">
          <defs>
            <clipPath id={`${uid}-face`}>
              <path d={faceD} />
            </clipPath>
            {gap ? (
              <mask id={gapMask!} maskUnits="userSpaceOnUse" x={f(-S)} y={f(-S)} width={f(3 * S)} height={f(3 * S)}>
                <rect x={f(-S)} y={f(-S)} width={f(3 * S)} height={f(3 * S)} fill="white" />
                <g data-slide={sliding ? "" : undefined} style={sliding && slide ? slideStyle(slide.origin, rtl) : undefined}>
                  <circle cx={f(gap.cx)} cy={f(gap.cy)} r={f(gap.r)} fill="black" />
                </g>
              </mask>
            ) : null}
          </defs>
          <g mask={gapMask ? `url(#${gapMask})` : undefined}>
            {face}
            {threadArt}
          </g>
          {presenceArt}
        </svg>
      </span>
    );
  }
);
IdentityAvatar.displayName = "IdentityAvatar";
