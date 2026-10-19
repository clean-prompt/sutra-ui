import * as React from "react";
import {
  Badge,
  Button,
  Card,
  Heading,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  InlineCode,
  Magnetic,
  ScrollProgressBar,
  ScrollReveal,
  ScrollStage,
  SegmentedControl,
  SharedElement,
  SpotlightCard,
  Switch,
  Text,
  TiltCard,
  cn,
  supportsScrollTimeline,
  supportsViewTransitions,
  useMediaQuery,
  usePrefersReducedMotion,
  useViewTransition,
} from "@sutra/ui";
import { RiArrowLeftLine, RiArrowRightLine, RiHeartLine } from "@sutra/ui/icons";
import { DemoLabel } from "../components/demo";

/* ------------------------------------------------------------------ */
/* View transitions                                                    */
/* ------------------------------------------------------------------ */

const NOTES = [
  { id: "harbour", title: "Harbour at dawn", tint: "bg-info-soft", body: "Boats rock at their moorings while the light comes up. Shot on the first ferry, before the market opened." },
  { id: "orchard", title: "Orchard rows", tint: "bg-success-soft", body: "Twelve rows of apple trees, pruned in February. The thumbnail you tapped is the same box you see here, moved by the browser." },
  { id: "kiln", title: "The old kiln", tint: "bg-warning-soft", body: "A kiln that has not been fired in thirty years, still warm to the touch on summer afternoons." },
] as const;

function SupportBadge() {
  const [supported, setSupported] = React.useState<boolean | null>(null);
  React.useEffect(() => setSupported(supportsViewTransitions()), []);
  if (supported === null) return null;
  return (
    <Badge color={supported ? "success" : "gray"} data-slot="vt-support">
      {supported ? "View transitions supported" : "Not supported here: the change just happens"}
    </Badge>
  );
}

/** List to detail: the swatch and the title are SharedElements with the same names in both screens. */
function ListToDetail() {
  const run = useViewTransition();
  const [open, setOpen] = React.useState<string | null>(null);
  const note = NOTES.find((n) => n.id === open);
  return (
    <div className="@container min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <DemoLabel>List to detail: the thumbnail and the title fly into the panel and back</DemoLabel>
        <SupportBadge />
      </div>
      {note ? (
        <Card className="overflow-hidden" data-slot="vt-detail">
          <div className="grid grid-cols-1 gap-4 p-4 @md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
            <SharedElement name={`swatch-${note.id}`} className={cn("aspect-[4/3] w-full rounded-box border border-border", note.tint)} />
            <div className="min-w-0 space-y-2">
              <SharedElement name={`title-${note.id}`} as="header" className="w-fit max-w-full">
                <Heading as="h3" size="lg">
                  {note.title}
                </Heading>
              </SharedElement>
              <Text className="text-muted-foreground">{note.body}</Text>
              <Button size="sm" variant="outline" leadingIcon={<RiArrowLeftLine />} onClick={() => void run(() => setOpen(null))}>
                Back to the list
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-3 @md:grid-cols-3" data-slot="vt-list">
          {NOTES.map((n) => (
            <li key={n.id} className="min-w-0">
              <button
                type="button"
                onClick={() => void run(() => setOpen(n.id))}
                className="group flex w-full min-w-0 flex-col gap-2 rounded-box border border-border bg-card p-2 text-start shadow-xs outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
              >
                <SharedElement name={`swatch-${n.id}`} className={cn("aspect-[4/3] w-full rounded-control border border-border", n.tint)} />
                <SharedElement name={`title-${n.id}`} as="span" className="mx-1 mb-1 block w-fit max-w-[calc(100%-0.5rem)] truncate text-sm font-medium" title={n.title}>
                  {n.title}
                </SharedElement>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        Keyboard: Tab to a note, Enter opens it, then Tab to the back button. Reduced motion: the panel simply swaps.
      </p>
    </div>
  );
}

const TABS = [
  { value: "overview", label: "Overview", text: "A short summary of the project: what it is for, who owns it and when it ships." },
  { value: "activity", label: "Activity", text: "Recent changes, newest first. Each row links to the thing that changed." },
  { value: "files", label: "Files", text: "Everything attached to the project, from the brief to the last export." },
] as const;

/** Tab swap: the default page crossfade (root) at --sutra-duration; the panel is named so it can be styled alone. */
function TabFade() {
  const run = useViewTransition();
  const [tab, setTab] = React.useState<string>("overview");
  const current = TABS.find((t) => t.value === tab) ?? TABS[0];
  return (
    <div className="@container min-w-0 space-y-3">
      <DemoLabel>Tab or route swap: one call, no per-element code</DemoLabel>
      <SegmentedControl
        aria-label="Project tab"
        value={tab}
        onValueChange={(v) => void run(() => setTab(v))}
        options={TABS.map((t) => ({ value: t.value, label: t.label }))}
      />
      <SharedElement name="tab-panel" className="rounded-box border border-border bg-card p-4" data-slot="vt-panel">
        <Heading as="h3" size="sm">
          {current.label}
        </Heading>
        <Text className="mt-1 text-muted-foreground">{current.text}</Text>
      </SharedElement>
    </div>
  );
}

export function MotionViewTransitions() {
  return (
    <div className="min-w-0 space-y-8">
      <ListToDetail />
      <TabFade />
      <p className="text-sm text-muted-foreground">
        <InlineCode>useViewTransition()</InlineCode> wraps <InlineCode>document.startViewTransition</InlineCode> with <InlineCode>flushSync</InlineCode>; names come from entity ids with{" "}
        <InlineCode>SharedElement</InlineCode> or <InlineCode>viewTransitionName(id)</InlineCode> and must be unique on screen at one time. Without support, or with reduced motion, the update just runs.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Scroll-driven effects                                               */
/* ------------------------------------------------------------------ */

const REVEALS = [
  { from: "up", title: "Slides up", text: "The default: a 24 px rise and a fade, finished before the card is fully in view." },
  { from: "start", title: "From the start", text: "Direction follows the writing direction, so it mirrors in right-to-left." },
  { from: "end", title: "From the end", text: "The opposite side. Alternate the two for a timeline." },
  { from: "scale", title: "Scales in", text: "A fade and a 94% scale, for tiles and images." },
  { from: "down", title: "Drops in", text: "Comes from above, for banners and tabs." },
  { from: "fade", title: "Only fades", text: "No movement at all, the calmest option." },
] as const;

function ScrollSupportNote({ forced }: { forced: boolean }) {
  const [native, setNative] = React.useState<boolean | null>(null);
  React.useEffect(() => setNative(supportsScrollTimeline()), []);
  if (native === null) return null;
  const script = forced || !native;
  return (
    <Badge color={script ? "info" : "success"} data-slot="scroll-support">
      {script ? "Script fallback (--sutra-progress)" : "Native scroll timeline"}
    </Badge>
  );
}

function RevealDemo({ forced }: { forced: boolean }) {
  return (
    <div className="@container min-w-0 space-y-2">
      <DemoLabel>Scroll the box: cards reveal as they enter, a bar tracks the box</DemoLabel>
      <div data-slot="reveal-scroller" tabIndex={0} aria-label="Reveal demo, scrollable" role="region" className="h-80 overflow-y-auto rounded-box border border-border bg-background outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ScrollProgressBar forceFallback={forced} className="sticky top-0 z-10" />
        <div className="grid grid-cols-1 gap-x-3 gap-y-16 p-4 pt-10 pb-24 @md:grid-cols-2">
          {REVEALS.map((r) => (
            <ScrollReveal key={r.from} from={r.from} forceFallback={forced} className="min-w-0 rounded-box border border-border bg-card p-4 shadow-xs">
              <p className="text-sm font-medium">{r.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{r.text}</p>
              <p className="mt-2 font-mono text-2xs text-muted-foreground">from="{r.from}"</p>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Children follow --sutra-progress in CSS; the number is written straight to a text node (no React state per frame). */
function StageDemo() {
  const scroller = React.useRef<HTMLDivElement>(null);
  const readout = React.useRef<HTMLSpanElement>(null);
  const steps = ["Collect", "Compare", "Decide"];
  return (
    <div className="@container min-w-0 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <DemoLabel>ScrollStage: the stage stays put while the runway scrolls; native scrolling, nothing is hijacked</DemoLabel>
        <span className="font-mono text-2xs text-muted-foreground">
          progress <span ref={readout} data-slot="stage-readout">0.00</span>
        </span>
      </div>
      <div ref={scroller} data-slot="stage-scroller" tabIndex={0} aria-label="Scroll stage demo, scrollable" role="region" className="h-80 overflow-y-auto rounded-box border border-border bg-background outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ScrollStage
          runway="48rem"
          stageHeight="20rem"
          scroller={scroller}
          onScrollProgress={(p) => {
            if (readout.current) readout.current.textContent = p.toFixed(2);
          }}
        >
          <div className="grid h-full grid-cols-1 content-center gap-4 p-6">
            <Heading as="h3" size="lg" className="origin-left scale-[calc(0.8_+_var(--sutra-progress,1)_*_0.2)]">
              Three steps, one stage
            </Heading>
            <ol className="grid grid-cols-1 gap-2 @md:grid-cols-3">
              {steps.map((label, i) => (
                <li
                  key={label}
                  style={{ "--p": `clamp(0, (var(--sutra-progress, 1) - ${0.1 + i * 0.25}) / 0.25, 1)` } as React.CSSProperties}
                  className="min-w-0 translate-y-[calc((1_-_var(--p))_*_16px)] rounded-box border border-border bg-card p-3 opacity-(--p)"
                >
                  <span className="font-mono text-2xs text-muted-foreground">0{i + 1}</span>
                  <p className="text-sm font-medium">{label}</p>
                </li>
              ))}
            </ol>
            <div className="h-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full origin-left scale-x-(--sutra-progress,1) bg-primary" />
            </div>
          </div>
        </ScrollStage>
      </div>
    </div>
  );
}

export function MotionScroll() {
  const [forced, setForced] = React.useState(false);
  return (
    <div className="min-w-0 space-y-8">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <ScrollSupportNote forced={forced} />
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={forced} onCheckedChange={setForced} aria-label="Force the script fallback" />
          Force the script fallback (what Firefox runs)
        </label>
      </div>
      <RevealDemo key={`reveal-${forced}`} forced={forced} />
      <StageDemo />
      <p className="text-sm text-muted-foreground">
        <InlineCode>scroll-reveal</InlineCode> and <InlineCode>scroll-progress-bar</InlineCode> are CSS utilities on <InlineCode>animation-timeline</InlineCode>; where it is missing, or under reduced motion, content shows its end state.
        <InlineCode>useScrollProgress</InlineCode> writes <InlineCode>--sutra-progress</InlineCode> for the fallback and for stages. Under reduced motion the stage is an ordinary block.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pointer effects                                                     */
/* ------------------------------------------------------------------ */

const PLANS = [
  { name: "Free", price: "$0", note: "One workspace, 3 members." },
  { name: "Pro", price: "$12", note: "Unlimited members, version history." },
  { name: "Team", price: "$29", note: "Roles, audit log, single sign-on." },
] as const;

function PointerStatus() {
  const fine = useMediaQuery("(hover: hover) and (pointer: fine)");
  const reduced = usePrefersReducedMotion();
  const on = fine && !reduced;
  return (
    <Badge color={on ? "success" : "gray"} data-slot="pointer-status">
      {on ? "Pointer effects on (mouse)" : reduced ? "Off: reduced motion" : "Off: no hover-capable mouse (touch)"}
    </Badge>
  );
}

function PlanCard({ plan, ...rest }: { plan: (typeof PLANS)[number]; glowSize?: number }) {
  return (
    <SpotlightCard className="min-w-0" {...rest}>
      <CardHeader>
        <CardTitle>{plan.name}</CardTitle>
        <CardDescription>{plan.note}</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-2 pb-(--card-pad)">
        <span className="text-display-xs font-semibold tabular-nums">{plan.price}</span>
        <Button size="sm" variant="outline" trailingIcon={<RiArrowRightLine />}>
          Choose
        </Button>
      </CardContent>
    </SpotlightCard>
  );
}

export function MotionPointer() {
  return (
    <div className="min-w-0 space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <PointerStatus />
        <span className="text-xs text-muted-foreground">Hover with a mouse. Tab into a card: the glow shows at the centre. Touch and reduced motion: still.</span>
      </div>

      <div className="@container min-w-0 space-y-2">
        <DemoLabel>SpotlightCard: a glow that follows the pointer (the last one with glowSize 90)</DemoLabel>
        <div className="grid grid-cols-1 gap-3 @lg:grid-cols-3" data-slot="spotlight-grid">
          <PlanCard plan={PLANS[0]} />
          <PlanCard plan={PLANS[1]} />
          <PlanCard plan={PLANS[2]} glowSize={90} />
        </div>
      </div>

      <div className="@container min-w-0 space-y-2">
        <DemoLabel>TiltCard: the pointer is read on a still wrapper, the card tilts (second: max 14 degrees plus the glow)</DemoLabel>
        <div className="grid grid-cols-1 gap-3 @md:grid-cols-2" data-slot="tilt-grid">
          <TiltCard className="min-w-0 p-5">
            <p className="text-sm font-medium">Default tilt</p>
            <p className="mt-1 text-sm text-muted-foreground">7 degrees at the edge; paper uses 3. It springs back when the pointer leaves.</p>
          </TiltCard>
          <TiltCard max={14} spotlight className="min-w-0 p-5">
            <p className="text-sm font-medium">Strong, with a glow</p>
            <p className="mt-1 text-sm text-muted-foreground">Tilt and spotlight compose: both read the same variables.</p>
          </TiltCard>
        </div>
      </div>

      <div className="@container min-w-0 space-y-2">
        <DemoLabel>Magnetic: the child drifts toward the pointer inside a reach of 80 px (clicks and focus are unchanged)</DemoLabel>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 rounded-box border border-dashed border-border p-8" data-slot="magnetic-row">
          <Magnetic>
            <Button>Get started</Button>
          </Magnetic>
          <Magnetic radius={120} strength={0.5}>
            <Button variant="outline" size="icon" aria-label="Like">
              <RiHeartLine />
            </Button>
          </Magnetic>
          <Magnetic radius={50}>
            <a href="#/foundations/motion/pointer" className="rounded-control px-3 py-2 text-sm font-medium underline-offset-4 hover:underline">
              A link
            </a>
          </Magnetic>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        <InlineCode>usePointerVars()</InlineCode> sets <InlineCode>data-pointer</InlineCode>, <InlineCode>--px --py --tx --ty --pull-x --pull-y</InlineCode> once per frame for a mouse or pen only, and removes them on leave;
        the <InlineCode>spotlight</InlineCode>, <InlineCode>tilt</InlineCode> and <InlineCode>magnetic</InlineCode> utilities read them and spring back on the snappy token.
        Strengths are tokens (<InlineCode>--sutra-tilt-max</InlineCode>, <InlineCode>--sutra-spotlight-alpha</InlineCode>, <InlineCode>--sutra-magnetic-scale</InlineCode>), calmer in paper.
      </p>
    </div>
  );
}
