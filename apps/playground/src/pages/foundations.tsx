import * as React from "react";
import {
  breakpoints,
  chartColors,
  colors,
  grid,
  radii,
  shadows,
  spacing,
  typography,
  cn,
  useCopy,
  usePrefersReducedMotion,
  Avatar,
  Badge,
  Button,
  Card,
  CodeBlock,
  Combobox,
  Container,
  EmptyState,
  Eyebrow,
  Grid,
  GridItem,
  Heading,
  InlineAlert,
  InlineAlertDescription,
  InlineAlertTitle,
  InlineCode,
  Input,
  Kbd,
  StatusBadge,
  Text,
} from "@sutra/ui";
import { RiAddLine, RiArrowDownSLine, RiCheckLine, RiCloseLine, RiRefreshLine } from "@sutra/ui/icons";
import { Demo, DemoLabel, PageIntro } from "../components/demo";
import { MotionSettingControl } from "../components/motion-setting";
import { MotionLists, MotionPresence, MotionSprings, MotionText } from "./motion-demos";
import { MotionPointer, MotionScroll, MotionViewTransitions } from "./motion-nav-demos";

/* ------------------------------------------------------------------ */
/* Colors                                                              */
/* ------------------------------------------------------------------ */

const toKebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

function Swatch({ name, value, className }: { name: string; value: string; className?: string }) {
  const { copied, copy } = useCopy();
  return (
    <button
      type="button"
      onClick={() => copy(value)}
      className={cn("group flex min-w-0 flex-col gap-2 text-left", className)}
      title={`Copy ${value}`}
    >
      <span
        className="block h-16 w-full rounded-box border border-border shadow-xs transition-transform group-hover:-translate-y-0.5"
        style={{ background: value }}
      />
      <span className="w-full min-w-0">
        <span className="block truncate text-sm font-medium">{name}</span>
        <span className="block truncate font-mono text-2xs text-muted-foreground">{copied ? "Copied!" : value}</span>
      </span>
    </button>
  );
}

const semanticTokens = Object.entries(colors).filter(
  (entry): entry is [string, string] => typeof entry[1] === "string"
);

function Scale({ label, scale }: { label: string; scale: Record<string, string> }) {
  return (
    <div className="space-y-2">
      <DemoLabel>{label}</DemoLabel>
      <div className="grid grid-cols-4 gap-1 sm:grid-cols-6 lg:grid-cols-12">
        {Object.entries(scale).map(([step, value]) => (
          <div key={step} className="space-y-1">
            <div className="h-12 rounded-sm border border-border/50" style={{ background: value }} />
            <p className="text-center font-mono text-2xs text-muted-foreground">{step}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ColorsPage() {
  return (
    <PageIntro
      eyebrow="Foundations"
      title="Colors"
      description="Semantic tokens map onto a brand scale and a neutral scale. Switch brand, neutral and mode in the top bar — every swatch here follows. Click a swatch to copy its CSS variable."
    >
      <Demo title="Semantic tokens" description="Use these through Tailwind utilities such as bg-card, text-muted-foreground or border-border." align="start">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
          {semanticTokens.map(([name, value]) => (
            <Swatch key={name} name={toKebab(name)} value={value} />
          ))}
        </div>
      </Demo>
      <Demo title="Brand scale" description="Driven by data-brand. Available as brand-50 … brand-950 utilities." align="start">
        <Scale label="brand" scale={colors.brand} />
      </Demo>
      <Demo title="Neutral scale" description="Driven by data-neutral (zinc, slate, gray, stone)." align="start">
        <Scale label="neutral" scale={colors.neutral} />
      </Demo>
      <Demo title="Status" align="start">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {(["success", "warning", "destructive", "info"] as const).map((tone) => (
            <div key={tone} className="overflow-hidden rounded-box border border-border">
              <div className="h-14" style={{ background: colors[tone] }} />
              <div className="flex flex-wrap items-center justify-between gap-2 p-3">
                <span className="text-sm font-medium capitalize">{tone}</span>
                <Badge tone={tone}>{tone}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Demo>
      <Demo title="Chart palette" description="chartColors — a categorical palette for charts, avatars and tags." align="start">
        <div className="flex flex-wrap gap-3">
          {chartColors.map((c, i) => (
            <div key={c} className="flex items-center gap-2">
              <span className="size-8 rounded-sm" style={{ background: c }} />
              <span className="font-mono text-xs text-muted-foreground">
                {i + 1}. {c}
              </span>
            </div>
          ))}
        </div>
      </Demo>
    </PageIntro>
  );
}

/* ------------------------------------------------------------------ */
/* Typography                                                          */
/* ------------------------------------------------------------------ */

export function TypographyPage() {
  return (
    <PageIntro
      eyebrow="Foundations"
      title="Typography"
      description="Geist for UI and display, Geist Mono for code. The scale pairs each size with a line height and tracking."
    >
      <Demo title="Type scale" align="start" canvasClassName="gap-0 p-0 sm:p-0">
        {Object.entries(typography.scale).map(([name, t]) => (
          <div key={name} className="flex flex-col gap-1 border-b border-border px-6 py-4 last:border-0 lg:flex-row lg:items-baseline lg:gap-6">
            <div className="shrink-0 space-y-0.5 lg:w-36">
              <p className="font-mono text-xs font-medium">{name}</p>
              <p className="font-mono text-2xs text-muted-foreground">
                {t.size} / {t.lineHeight} / {t.tracking}
              </p>
            </div>
            <p
              className="min-w-0 break-words font-semibold sm:truncate sm:py-[0.15em]"
              style={{ fontSize: t.size, lineHeight: t.lineHeight, letterSpacing: t.tracking }}
            >
              Thread every idea together
            </p>
          </div>
        ))}
      </Demo>
      <Demo title="Weights & families" align="start">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            {Object.entries(typography.weights).map(([name, w]) => (
              <p key={name} className="text-xl" style={{ fontWeight: w }}>
                {name} <span className="font-mono text-xs text-muted-foreground">{w}</span>
              </p>
            ))}
          </div>
          <div className="space-y-4">
            <div>
              <DemoLabel>Sans — {typography.fontSans}</DemoLabel>
              <p className="text-display-xs font-semibold tracking-tight">Aa Bb Cc 0123</p>
            </div>
            <div>
              <DemoLabel>Mono — {typography.fontMono}</DemoLabel>
              <p className="font-mono text-display-xs">Aa Bb Cc 0123</p>
            </div>
          </div>
        </div>
      </Demo>
      <Demo title="Text components" description="Heading, Text, Eyebrow, Kbd and InlineCode." align="start">
        <div className="max-w-xl space-y-3">
          <Eyebrow>Release notes</Eyebrow>
          <Heading size="display-sm">Sutra 1.0 is here</Heading>
          <Text tone="neutral">
            Press <Kbd>⌘</Kbd> <Kbd>K</Kbd> to open the command menu, or import <InlineCode>{"{ Button }"}</InlineCode> from{" "}
            <InlineCode>@sutra/ui</InlineCode>.
          </Text>
          <div className="flex flex-wrap gap-4">
            {(["default", "muted", "primary", "success", "warning", "destructive"] as const).map((tone) => (
              <Text key={tone} size="sm" weight="medium" tone={tone}>
                {tone}
              </Text>
            ))}
          </div>
        </div>
      </Demo>
    </PageIntro>
  );
}

/* ------------------------------------------------------------------ */
/* Grid & layout                                                       */
/* ------------------------------------------------------------------ */

function Cell({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex h-12 items-center justify-center rounded-sm border border-dashed border-primary/40 bg-primary-soft font-mono text-xs text-primary-soft-foreground",
        className
      )}
    >
      {children}
    </div>
  );
}

export function GridPage() {
  return (
    <PageIntro
      eyebrow="Foundations"
      title="Grid & Layout"
      description="A responsive 4 → 8 → 12 column grid, a centered Container, and Stack primitives on the 4px spacing grid."
    >
      <Demo title="12-column grid" description="Resize the window: 4 columns on mobile, 8 on tablet, 12 on desktop." align="start">
        <Grid>
          {Array.from({ length: 12 }, (_, i) => (
            <GridItem key={i} span={1}>
              <Cell>{i + 1}</Cell>
            </GridItem>
          ))}
        </Grid>
      </Demo>
      <Demo title="GridItem spans" description="span (mobile, of 4), md (tablet, of 8) and lg (desktop, of 12)." align="start">
        <Grid gap="sm">
          <GridItem span={4} md={8} lg={12}><Cell>span 4 · md 8 · lg 12</Cell></GridItem>
          <GridItem span={4} md={4} lg={8}><Cell>lg 8</Cell></GridItem>
          <GridItem span={4} md={4} lg={4}><Cell>lg 4</Cell></GridItem>
          <GridItem span={2} md={4} lg={3}><Cell>lg 3</Cell></GridItem>
          <GridItem span={2} md={4} lg={3}><Cell>lg 3</Cell></GridItem>
          <GridItem span={4} md={8} lg={6}><Cell>lg 6</Cell></GridItem>
        </Grid>
      </Demo>
      <Demo title="Container" description="Centered max-width wrapper with responsive gutters." align="start" canvasClassName="gap-3 px-0 sm:px-0">
        {(["sm", "md", "lg"] as const).map((size) => (
          <Container key={size} size={size}>
            <Cell className="h-10">Container size="{size}"</Cell>
          </Container>
        ))}
      </Demo>
      <Demo title="Grid tokens" align="start">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {Object.entries(grid).map(([device, g]) => (
            <Card key={device} padded className="space-y-1 p-4">
              <p className="text-sm font-semibold capitalize">{device}</p>
              <p className="text-sm text-muted-foreground">
                {g.columns} columns · {g.gutter}px gutter · {g.margin}px margin
                {"maxWidth" in g ? ` · ${g.maxWidth}px max` : ""}
              </p>
            </Card>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(breakpoints).map(([bp, px]) => (
            <Badge key={bp} variant="outline">
              {bp} · {px}px
            </Badge>
          ))}
        </div>
      </Demo>
    </PageIntro>
  );
}

/* ------------------------------------------------------------------ */
/* Shadows & effects                                                   */
/* ------------------------------------------------------------------ */

export function ShadowsPage() {
  return (
    <PageIntro
      eyebrow="Foundations"
      title="Shadows & Effects"
      description="Layered, low-contrast shadows that deepen in dark mode, plus glass, dotted and grid surfaces."
    >
      <Demo title="Elevation" description="shadow-xs … shadow-3xl. Menus use shadow-lg, dialogs shadow-2xl." dots canvasClassName="grid grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] gap-8">
        {Object.entries(shadows).map(([name, value]) => (
          <div key={name} className="flex flex-col items-center gap-3">
            <div className="size-20 rounded-box border border-border/60 bg-card" style={{ boxShadow: value }} />
            <span className="font-mono text-xs text-muted-foreground">{name}</span>
          </div>
        ))}
      </Demo>
      <Demo title="Surfaces & effects" align="start">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="relative h-36 overflow-hidden rounded-box bg-gradient-to-br from-brand-400 to-brand-700 p-4">
            <div className="glass absolute inset-4 grid place-items-center rounded-box text-sm font-medium">glass</div>
          </div>
          <div className="grid h-36 place-items-center rounded-box border border-border bg-dots text-sm font-medium">bg-dots</div>
          <div className="grid h-36 place-items-center rounded-box border border-border bg-grid text-sm font-medium">bg-grid</div>
          <div className="grid h-36 place-items-center rounded-box bg-primary text-sm font-medium text-primary-foreground shadow-inner-highlight">
            shadow-inner-highlight
          </div>
          <div className="grid h-36 place-items-center rounded-box bg-inverse text-sm font-medium text-inverse-foreground">bg-inverse</div>
          <div className="grid h-36 place-items-center rounded-box border border-border">
            <span className="text-shimmer text-lg font-semibold">text-shimmer</span>
          </div>
        </div>
      </Demo>
    </PageIntro>
  );
}

/* ------------------------------------------------------------------ */
/* Corner radius                                                       */
/* ------------------------------------------------------------------ */

export function RadiusPage() {
  return (
    <PageIntro
      eyebrow="Foundations"
      title="Corner Radius"
      description="rounded-control (buttons, inputs, chips) and rounded-box (cards, popovers) follow the radius mode — try Rounded, Pill and Square in the top bar."
    >
      <Demo title="Radius scale" canvasClassName="grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-6">
        {Object.entries(radii).map(([name, value]) => (
          <div key={name} className="flex flex-col items-center gap-2">
            <div className="size-16 border-2 border-primary bg-primary-soft" style={{ borderRadius: value }} />
            <span className="font-mono text-xs text-muted-foreground">{name}</span>
          </div>
        ))}
      </Demo>
      <Demo title="Theme-aware radius in components">
        <Card padded className="w-full max-w-sm space-y-3">
          <Text weight="semibold">rounded-box</Text>
          <Input placeholder="rounded-control input" />
          <div className="flex gap-2">
            <Button>Primary</Button>
            <Button variant="outline">Outline</Button>
            <Badge>Badge</Badge>
          </div>
        </Card>
      </Demo>
    </PageIntro>
  );
}

/* ------------------------------------------------------------------ */
/* Spacing                                                             */
/* ------------------------------------------------------------------ */

export function SpacingPage() {
  return (
    <PageIntro
      eyebrow="Foundations"
      title="Spacing"
      description="A 4px base grid. Keys match Tailwind's spacing scale, so p-4 is 16px and gap-6 is 24px."
    >
      <Demo title="Spacing scale" align="start" canvasClassName="gap-2">
        {Object.entries(spacing)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([key, px]) => (
            <div key={key} className="flex items-center gap-4">
              <span className="w-10 shrink-0 font-mono text-xs font-medium">{key}</span>
              <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground">{px}</span>
              <span className="h-4 rounded-xs bg-primary" style={{ width: px }} />
            </div>
          ))}
      </Demo>
    </PageIntro>
  );
}

/* ------------------------------------------------------------------ */
/* Motion                                                              */
/* ------------------------------------------------------------------ */

/** A custom property of the root, kept live: a style (`data-style`) or theme change retunes the value. */
function useRootVar(name: string) {
  const [value, setValue] = React.useState("");
  React.useEffect(() => {
    const root = document.documentElement;
    const read = () => setValue(getComputedStyle(root).getPropertyValue(name).trim());
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true });
    return () => observer.disconnect();
  }, [name]);
  return value;
}

/** The same pattern as @sutra/ui's internal `useChangeKey`: 0 until `value` changes, then +1 per change. */
function useChangeKey(value: unknown) {
  const [state, setState] = React.useState({ value, key: 0 });
  if (!Object.is(state.value, value)) {
    const key = state.key + 1;
    setState({ value, key });
    return key;
  }
  return state.key;
}

/** A `cubic-bezier(x1, y1, x2, y2)` drawn as a curve, so a style's retuned ease is visible. */
function EaseCurve({ name }: { name: string }) {
  const value = useRootVar(name);
  const n = /cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/.exec(value)?.slice(1).map(Number);
  return (
    <svg viewBox="-10 -60 120 180" className="h-24 w-16 shrink-0 text-primary" aria-hidden>
      <rect x="0" y="0" width="100" height="100" className="fill-none stroke-border" strokeDasharray="3 3" />
      {n && <path d={`M0,100 C${n[0]! * 100},${100 - n[1]! * 100} ${n[2]! * 100},${100 - n[3]! * 100} 100,0`} className="fill-none stroke-current" strokeWidth="4" strokeLinecap="round" />}
    </svg>
  );
}

const speedTokens = [
  { name: "--sutra-duration-fast", use: "hover, press, colour, icon swap" },
  { name: "--sutra-duration", use: "chevrons, overlays, collapsibles" },
  { name: "--sutra-duration-slow", use: "sliding indicators, entrances" },
  { name: "--sutra-duration-fill", use: "value fills, rings" },
] as const;

function SpeedRow({ name, use, on }: { name: string; use: string; on: boolean }) {
  const value = useRootVar(name);
  return (
    <div className="grid grid-cols-[minmax(0,13rem)_4rem_minmax(0,1fr)] items-center gap-4 text-xs">
      <div className="min-w-0">
        <div className="truncate font-mono font-medium">{name}</div>
        <div className="truncate text-muted-foreground">{use}</div>
      </div>
      <span className="font-mono tabular-nums text-muted-foreground">{value}</span>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full origin-left rounded-full bg-primary"
          style={{
            transform: on ? "scaleX(1)" : "scaleX(0.04)",
            transitionProperty: "transform",
            transitionDuration: `var(${name})`,
            transitionTimingFunction: "var(--sutra-ease)",
          }}
        />
      </div>
    </div>
  );
}

function EaseRow({ name, label }: { name: string; label: string }) {
  const value = useRootVar(name);
  return (
    <div className="flex items-center gap-4 text-xs">
      <EaseCurve name={name} />
      <div className="min-w-0 space-y-1">
        <div className="font-mono font-medium">{name}</div>
        <div className="text-muted-foreground">{label}</div>
        <div className="truncate font-mono text-muted-foreground">{value}</div>
      </div>
    </div>
  );
}

/** A Replay button above a stage that is re-created (so its entrance plays again). */
function Replayable({ name, note, children }: { name: string; note: string; children: (run: number) => React.ReactNode }) {
  const [run, setRun] = React.useState(0);
  return (
    <div className="flex flex-col gap-3 rounded-box border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-mono text-sm font-medium">{name}</div>
          <div className="text-xs text-muted-foreground">{note}</div>
        </div>
        <Button size="xs" variant="outline" leadingIcon={<RiRefreshLine />} onClick={() => setRun((r) => r + 1)}>
          Replay
        </Button>
      </div>
      <div className="grid min-h-16 place-items-center rounded-control bg-subtle p-3">{children(run)}</div>
    </div>
  );
}

function MotionSpeeds() {
  const [on, setOn] = React.useState(false);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Text size="sm" tone="neutral">
          Each bar fills with its own token and the shared ease.
        </Text>
        <Button size="sm" variant="outline" onClick={() => setOn((v) => !v)}>
          {on ? "Reset" : "Play"}
        </Button>
      </div>
      <div className="space-y-4">
        {speedTokens.map((t) => (
          <SpeedRow key={t.name} {...t} on={on} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 border-t border-border pt-6 sm:grid-cols-2">
        <EaseRow name="--sutra-ease" label="the one ease: entrances, fills, chevrons, hover" />
        <EaseRow name="--sutra-ease-spring" label="springy: pops, switch and radio thumbs" />
      </div>
    </div>
  );
}

function MotionChevron() {
  const [open, setOpen] = React.useState(false);
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={() => setOpen((v) => !v)}
      className="inline-flex items-center gap-2 rounded-control border border-border bg-background px-3 py-1.5 text-sm font-medium shadow-xs"
    >
      Details
      <RiArrowDownSLine className={cn("size-4 chevron-turn", open && "rotate-180")} aria-hidden />
    </button>
  );
}

function MotionUtilities() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <Replayable name="animate-pop" note="springy scale-in: icon swaps, ticks, badges">
        {(run) => (
          <span key={run} className="grid size-10 animate-pop place-items-center rounded-full bg-primary-soft text-primary-soft-foreground">
            <RiCheckLine className="size-5" aria-hidden />
          </span>
        )}
      </Replayable>
      <Replayable name="animate-tick" note="a changed value slides up into place">
        {(run) => (
          <span key={run} className="inline-block animate-tick text-2xl font-semibold tabular-nums">
            1,284
          </span>
        )}
      </Replayable>
      <Replayable name="animate-flash" note="colour highlight for a value that just changed">
        {(run) => (
          <span key={run} className="animate-flash rounded-control px-3 py-1 text-sm font-medium">
            Saved 12:04
          </span>
        )}
      </Replayable>
      <Replayable name="animate-fade-in" note="300 ms fade">
        {(run) => (
          <Card key={run} padded className="w-40 animate-fade-in text-sm">
            Fades in
          </Card>
        )}
      </Replayable>
      <Replayable name="animate-fade-up" note="300 ms fade with a 6 px rise: the newest message, page heads">
        {(run) => (
          <Card key={run} padded className="w-40 animate-fade-up text-sm">
            Rises in
          </Card>
        )}
      </Replayable>
      <Replayable name="animate-pop-in" note="200 ms rise from 98.5%: popovers and cards">
        {(run) => (
          <Card key={run} padded className="w-40 animate-pop-in text-sm">
            Settles in
          </Card>
        )}
      </Replayable>
      <div className="flex flex-col gap-3 rounded-box border border-border bg-card p-4 lg:col-span-2 xl:col-span-1">
        <div>
          <div className="font-mono text-sm font-medium">chevron-turn</div>
          <div className="text-xs text-muted-foreground">disclosure rotation; pair with rotate-180 or rotate-90</div>
        </div>
        <div className="grid min-h-16 place-items-center rounded-control bg-subtle p-3">
          <MotionChevron />
        </div>
      </div>
    </div>
  );
}

const motionFruits = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "cherry", label: "Cherry" },
  { value: "mango", label: "Mango" },
];
const statusCycle = ["pending", "success", "error"] as const;

/** The stage owns the state, so remounting it starts from first render again. */
function MotionOnChangeStage() {
  const [count, setCount] = React.useState(1284);
  const countKey = useChangeKey(count);
  const [status, setStatus] = React.useState<(typeof statusCycle)[number]>("pending");
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <div className="space-y-3 rounded-box border border-border bg-card p-4">
        <DemoLabel>Number: key + animate-tick</DemoLabel>
        <div className="flex items-center gap-3">
          <span key={countKey} className={cn("inline-block min-w-16 text-2xl font-semibold tabular-nums", countKey > 0 && "animate-tick")}>
            {count.toLocaleString("en-US")}
          </span>
          <Button size="sm" variant="outline" leadingIcon={<RiAddLine />} onClick={() => setCount((c) => c + 7)}>
            Add 7
          </Button>
        </div>
      </div>
      <div className="space-y-3 rounded-box border border-border bg-card p-4">
        <DemoLabel>StatusBadge: colour fade, icon pops on change</DemoLabel>
        <div className="flex items-center gap-3">
          <StatusBadge status={status} icon={status === "error" ? <RiCloseLine /> : <RiCheckLine />} />
          <Button size="sm" variant="outline" onClick={() => setStatus((s) => statusCycle[(statusCycle.indexOf(s) + 1) % statusCycle.length]!)}>
            Next status
          </Button>
        </div>
      </div>
      <div className="space-y-3 rounded-box border border-border bg-card p-4">
        <DemoLabel>Combobox: only a chip you add eases in</DemoLabel>
        <Combobox multiple aria-label="Fruit" options={motionFruits} defaultValue={["apple", "banana"]} placeholder="Pick fruit" />
      </div>
    </div>
  );
}

function MotionOnChange() {
  const [mount, setMount] = React.useState(0);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Text size="sm" tone="neutral">
          Nothing below moves on first render. Change a value and only that value animates. Remount to check.
        </Text>
        <Button size="sm" variant="outline" leadingIcon={<RiRefreshLine />} onClick={() => setMount((m) => m + 1)}>
          Remount
        </Button>
      </div>
      <MotionOnChangeStage key={mount} />
      <CodeBlock
        language="tsx"
        filename="useChangeKey.tsx"
        copyable={false}
        code={`const n = useChangeKey(status);            // 0 until status changes, then +1 per change
<span key={n} className={n > 0 ? "animate-pop" : undefined}>{icon}</span>`}
      />
    </div>
  );
}

function MotionEntrances() {
  const [run, setRun] = React.useState(0);
  const image =
    "data:image/svg+xml;utf8," +
    encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#615fff"/><circle cx="32" cy="26" r="11" fill="#fff"/><path d="M10 64c2-16 12-22 22-22s20 6 22 22z" fill="#fff"/></svg>');
  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" leadingIcon={<RiRefreshLine />} onClick={() => setRun((r) => r + 1)}>
          Replay
        </Button>
      </div>
      <div key={run} className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[auto_1fr]">
        <div className="space-y-2">
          <DemoLabel>Avatar image: fades in once loaded</DemoLabel>
          <Avatar src={image} name="Ada Lovelace" size="xl" />
        </div>
        <div className="space-y-2">
          <DemoLabel>EmptyState: rises in</DemoLabel>
          <EmptyState size="sm" title="Nothing here yet" description="Results show up as soon as there are some." />
        </div>
      </div>
    </div>
  );
}

function ReducedMotionNote() {
  const reduced = usePrefersReducedMotion();
  return (
    <div className="space-y-4">
      <InlineAlert tone={reduced ? "success" : "info"}>
        <InlineAlertTitle>{reduced ? "Reduced motion is on" : "Reduced motion is off"}</InlineAlertTitle>
        <InlineAlertDescription>
          {reduced
            ? "Everything on this page is still: the system asks for less motion, or the setting below says Reduce."
            : "Try it with the setting below, or turn on Reduce motion in your system settings (or emulate prefers-reduced-motion in the browser's rendering tools)."}
        </InlineAlertDescription>
      </InlineAlert>
      <MotionSettingControl />
      <p className="max-w-prose text-sm text-muted-foreground">
        The setting is <InlineCode>&lt;html data-motion="reduce" | "full"&gt;</InlineCode>: the CSS net, Tailwind's <InlineCode>motion-reduce:</InlineCode> and{" "}
        <InlineCode>motion-safe:</InlineCode>, <InlineCode>usePrefersReducedMotion()</InlineCode> and every hook that reads it follow it. Remove the attribute to follow the system again.
      </p>
      <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
        <li>Decorative loops and entrances stop: the pulse, ping, dots, bars, caret, mesh, bob and ring, and every entrance utility above.</li>
        <li>
          Every transition ends in <InlineCode>1ms</InlineCode>, so state changes still land and <InlineCode>transitionend</InlineCode> still fires.
        </li>
        <li>Overlays keep their fade and lose their movement. Collapsibles end in 1 ms, so Radix still unmounts them on <InlineCode>animationend</InlineCode>.</li>
        <li>
          <InlineCode>animate-spin</InlineCode> keeps turning: it is a progress indicator, not decoration. Indeterminate bars slow down to 3 s.
        </li>
        <li>
          Never put <InlineCode>animation: none</InlineCode> on something that unmounts on <InlineCode>animationend</InlineCode>: use a 1 ms duration.
        </li>
      </ul>
      <Text size="sm" tone="neutral">
        <InlineCode>test/motion-guard.test.ts</InlineCode> keeps this honest: every looping animation is covered by the net or guarded on the site, durations stay on the scale, and curves come from the shared ease.
      </Text>
    </div>
  );
}

export function MotionPage() {
  return (
    <PageIntro
      eyebrow="Foundations"
      title="Motion"
      description="One ease and four speeds, set as tokens a style can retune. Everything is CSS: transform, opacity and colour, 150 to 300 ms, and still under reduced motion."
    >
      <Demo
        id="tokens"
        title="Tokens"
        description="--sutra-ease and four speeds on :root. Bare transitions follow them. Switch to the paper style in the top bar and the values and curves change."
        align="start"
      >
        <MotionSpeeds />
      </Demo>
      <Demo id="utilities" title="Utilities" description="Pick the utility by what changed. All of them stand still under reduced motion." align="start">
        <MotionUtilities />
      </Demo>
      <Demo id="change" title="Animate on change, not on mount" description="useChangeKey gives a key that only moves when the value does. Lists and history never animate on first paint." align="start">
        <MotionOnChange />
      </Demo>
      <Demo id="entrances" title="Entrances" description="Avatar images fade in once loaded; empty states rise in. A chat only animates its newest message." align="start">
        <MotionEntrances />
      </Demo>
      <Demo
        id="springs"
        title="Springs"
        description="Three spring tokens (gentle, snappy, bouncy) generated from real spring physics into CSS linear() easings, plus a small JS spring for what CSS cannot do. Switch to the paper style: the same names, calmer."
        align="start"
      >
        <MotionSprings />
      </Demo>
      <Demo id="presence" title="Presence" description="Mount on demand and leave properly: an exiting element is inert, hidden from assistive tech and removed after its exit animation." align="start">
        <MotionPresence />
      </Demo>
      <Demo id="animated-list" title="Animated list" description="Rows and chips enter with a pop and leave with a fade and a collapse, with nothing animating on first render." align="start">
        <MotionLists />
      </Demo>
      <Demo id="text" title="Stagger and text" description="A delay per item from one token, and text that reveals or types itself while screen readers get the whole line." align="start">
        <MotionText />
      </Demo>
      <Demo
        id="view-transitions"
        title="View transitions"
        description="A state change that morphs: a list row flies into its detail panel and back, and a tab swap crossfades. One useViewTransition call; the browser does the snapshots."
        align="start"
      >
        <MotionViewTransitions />
      </Demo>
      <Demo
        id="scroll"
        title="Scroll-driven"
        description="Reveals and a progress bar on animation-timeline (no script where the browser has it), a script fallback that writes --sutra-progress, and a sticky ScrollStage over a runway."
        align="start"
      >
        <MotionScroll />
      </Demo>
      <Demo
        id="pointer"
        title="Pointer effects"
        description="A glow, a 3D tilt and a magnetic pull that follow a mouse. They read CSS variables from one small hook, work on hover-capable fine pointers only and stay still under reduced motion."
        align="start"
      >
        <MotionPointer />
      </Demo>
      <Demo id="reduced" title="Reduced motion" description="One net in sutra.css covers every utility and transition." align="start">
        <ReducedMotionNote />
      </Demo>
    </PageIntro>
  );
}
