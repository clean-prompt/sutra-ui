import * as React from "react";
import {
  AnimatedList,
  Badge,
  Button,
  CodeBlock,
  InlineCode,
  Input,
  Presence,
  SegmentedControl,
  SplitText,
  Switch,
  Text,
  Typewriter,
  cn,
  settleTime,
  springAt,
  springs,
  usePrefersReducedMotion,
  useSpringValue,
  type SpringName,
} from "@sutra/ui";
import { RiAddLine, RiCloseLine, RiDeleteBinLine, RiRefreshLine } from "@sutra/ui/icons";
import { DemoLabel } from "../components/demo";

/* ------------------------------------------------------------------ */
/* Springs                                                             */
/* ------------------------------------------------------------------ */

const SPRING_NAMES = ["gentle", "snappy", "bouncy"] as const;

/** Full class strings (Tailwind only sees literals). One dot per transition: the shared ease, then the three springs. */
const DOT_ROWS = [
  { id: "ease", label: "ease", note: "--sutra-ease, 300 ms", cls: "transition-transform duration-(--sutra-duration-slow) ease-(--sutra-ease)" },
  { id: "gentle", label: "gentle", note: "transition-spring", cls: "transition-spring" },
  { id: "snappy", label: "snappy", note: "transition-spring-snappy", cls: "transition-spring-snappy" },
  { id: "bouncy", label: "bouncy", note: "transition-spring-bouncy", cls: "transition-spring-bouncy" },
] as const;

function SpringDots() {
  const [on, setOn] = React.useState(false);
  return (
    <div className="@container min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DemoLabel>The same move, four curves (translate only: colour and opacity keep the ease)</DemoLabel>
        <Button size="sm" variant="outline" onClick={() => setOn((v) => !v)} aria-pressed={on}>
          Play
        </Button>
      </div>
      <div className="space-y-2">
        {DOT_ROWS.map((row) => (
          <div key={row.id} className="grid grid-cols-1 items-center gap-1.5 @md:grid-cols-[8.5rem_1fr] @md:gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">{row.label}</p>
              <p className="truncate font-mono text-2xs text-muted-foreground" title={row.note}>
                {row.note}
              </p>
            </div>
            <div className="@container h-8 min-w-0 rounded-control bg-muted">
              <div data-slot="spring-dot" className={cn("size-8 rounded-control bg-primary", row.cls, on && "translate-x-[calc(100cqw-2rem)]")} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const CURVE_COLORS: Record<SpringName, string> = { gentle: "stroke-info", snappy: "stroke-success", bouncy: "stroke-warning" };

/** springAt() drawn for the stock springs: the shape behind each token (paper uses calmer ones). */
function SpringCurves() {
  const W = 300;
  const H = 120;
  const top = 1.2;
  const T = Math.max(...SPRING_NAMES.map((n) => settleTime(springs[n])));
  const y = (v: number) => H - (v / top) * H;
  const path = (name: SpringName) =>
    Array.from({ length: 61 }, (_, i) => `${i ? "L" : "M"}${((i / 60) * W).toFixed(1)} ${y(springAt(springs[name], (i / 60) * T)).toFixed(1)}`).join(" ");
  return (
    <div className="space-y-2">
      <DemoLabel>Step response of the three springs (stock; the paper style uses calmer ones)</DemoLabel>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full max-w-md overflow-visible" role="img" aria-label="Spring curves: gentle, snappy and bouncy rising to 1, bouncy overshooting most">
        <line x1="0" x2={W} y1={y(1)} y2={y(1)} className="stroke-border-strong" strokeDasharray="3 3" />
        <line x1="0" x2={W} y1={y(0)} y2={y(0)} className="stroke-border" />
        {SPRING_NAMES.map((n) => (
          <path key={n} d={path(n)} fill="none" strokeWidth="2" strokeLinecap="round" className={CURVE_COLORS[n]} />
        ))}
      </svg>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {SPRING_NAMES.map((n) => (
          <li key={n} className="flex items-center gap-1.5">
            <span aria-hidden className={cn("h-0.5 w-4 rounded-full bg-current", n === "gentle" && "text-info", n === "snappy" && "text-success", n === "bouncy" && "text-warning")} />
            {n}: k {springs[n].stiffness}, c {springs[n].damping}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SpringValueDemo() {
  const [config, setConfig] = React.useState<SpringName>("bouncy");
  const [target, setTarget] = React.useState(30);
  const value = useSpringValue(target, { config });
  const barRef = React.useRef<HTMLDivElement>(null);
  useSpringValue(target, {
    config,
    onUpdate: (v) => {
      if (barRef.current) barRef.current.style.width = `${Math.max(0, Math.min(v, 100))}%`;
    },
  });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          size="sm"
          aria-label="Spring"
          value={config}
          onValueChange={(v) => setConfig(v as SpringName)}
          options={SPRING_NAMES.map((n) => ({ value: n, label: n }))}
        />
        <div className="flex flex-wrap gap-2">
          {[0, 35, 70, 100].map((n) => (
            <Button key={n} size="sm" variant={target === n ? "secondary" : "outline"} onClick={() => setTarget(n)}>
              {n}
            </Button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <DemoLabel>
          Returned value (one render per frame): <span className="tabular-nums">{value.toFixed(1)}</span>
        </DemoLabel>
        <div className="h-2 overflow-hidden rounded-full bg-muted" role="presentation">
          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} />
        </div>
      </div>
      <div className="space-y-1.5">
        <DemoLabel>
          With <InlineCode>onUpdate</InlineCode>: written to a ref, no re-render
        </DemoLabel>
        <div className="h-2 overflow-hidden rounded-full bg-muted" role="presentation">
          <div ref={barRef} className="h-full rounded-full bg-foreground" style={{ width: "30%" }} />
        </div>
      </div>
    </div>
  );
}

export function MotionSprings() {
  const reduced = usePrefersReducedMotion();
  return (
    <div className="space-y-8">
      <div className="@container">
        <div className="grid grid-cols-1 gap-8 @3xl:grid-cols-2">
          <SpringDots />
          <SpringCurves />
        </div>
      </div>
      <SpringValueDemo />
      <CodeBlock
        filename="springs.tsx"
        language="tsx"
        copyable={false}
        code={`// CSS first: a linear() curve on the compositor, generated from lib/spring.ts (scripts/gen-springs.mjs)
<div className={cn("transition-spring", open && "translate-x-24")} />      // gentle, or -snappy / -bouncy
<div className="transition-transform duration-spring-bouncy ease-spring-bouncy hover:scale-105" />

// JS, for what CSS cannot do (a count-up, a gauge angle): stops at rest, jumps under reduced motion
const value = useSpringValue(target, { config: "snappy" });
useSpringValue(target, { onUpdate: (v) => (ref.current!.style.width = v + "%") });   // no re-render`}
      />
      <Text size="sm" tone="neutral">
        {reduced ? "Reduced motion is on: every spring ends at once and the value jumps to its target." : "Under reduced motion every spring transition ends in 1 ms and the value jumps to its target."} Overshoot is only used on{" "}
        <InlineCode>transform</InlineCode>, <InlineCode>translate</InlineCode>, <InlineCode>scale</InlineCode> and <InlineCode>rotate</InlineCode>.
      </Text>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Presence                                                            */
/* ------------------------------------------------------------------ */

export function MotionPresence() {
  const [open, setOpen] = React.useState(true);
  const [exits, setExits] = React.useState(0);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)} aria-pressed={open}>
          {open ? "Hide" : "Show"} the card
        </Button>
        <DemoLabel>Removed after its exit animation: {exits}</DemoLabel>
      </div>
      <div className="min-h-28">
        <Presence present={open} onExited={() => setExits((n) => n + 1)}>
          <div className="max-w-sm rounded-box border border-border bg-card p-4 data-[presence=enter]:animate-pop-in data-[presence=exit]:animate-fade-out">
            <p className="text-sm font-medium">A card that leaves properly</p>
            <p className="mt-1 text-sm text-muted-foreground">Mounted on demand, with data-state and data-presence, inert while it leaves.</p>
          </div>
        </Presence>
      </div>
      <CodeBlock
        filename="presence.tsx"
        language="tsx"
        copyable={false}
        code={`<Presence present={open}>
  <div className="data-[presence=enter]:animate-pop-in data-[presence=exit]:animate-fade-out">…</div>
</Presence>
// exit = inert + aria-hidden, removed on animationend (or exitDuration). Reduced motion: at once.`}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AnimatedList: tasks and chips                                       */
/* ------------------------------------------------------------------ */

interface Task {
  id: number;
  title: string;
}
const SEED = ["Review the Q3 plan", "Book the offsite", "Reply to Maya"];

function TaskList() {
  const next = React.useRef(SEED.length + 1);
  const [tasks, setTasks] = React.useState<Task[]>(() => SEED.map((title, i) => ({ id: i + 1, title })));
  const [draft, setDraft] = React.useState("");
  const add = (titles: string[]) => setTasks((t) => [...titles.map((title) => ({ id: next.current++, title })), ...t]);
  return (
    <div className="space-y-3">
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          add([draft.trim()]);
          setDraft("");
        }}
      >
        <Input aria-label="New task" placeholder="Add a task" value={draft} onChange={(e) => setDraft(e.target.value)} className="min-w-0 flex-1 basis-48" />
        <Button type="submit" size="sm" leadingIcon={<RiAddLine />}>
          Add
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => add(["Draft the release notes", "Triage the inbox", "Water the plants"])}>
          Add 3 (staggered)
        </Button>
        <Button type="button" size="sm" variant="ghost" leadingIcon={<RiDeleteBinLine />} onClick={() => setTasks([])} disabled={!tasks.length}>
          Clear
        </Button>
      </form>
      <div className="min-h-24 rounded-box border border-border bg-card px-3">
        <AnimatedList
          aria-label="Tasks"
          items={tasks}
          getKey={(t) => t.id}
          renderItem={(t) => (
            <div className="flex items-center gap-3 border-b border-border py-2.5">
              <span className="min-w-0 flex-1 truncate text-sm" title={t.title}>
                {t.title}
              </span>
              <Button size="icon-xs" variant="ghost" aria-label={`Remove ${t.title}`} onClick={() => setTasks((all) => all.filter((x) => x.id !== t.id))}>
                <RiCloseLine />
              </Button>
            </div>
          )}
        />
        {tasks.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Nothing to do</p> : null}
      </div>
    </div>
  );
}

const TAG_POOL = ["design", "research", "urgent", "billing", "mobile", "docs", "bug", "idea"];

function ChipRow() {
  const [tags, setTags] = React.useState(["design", "research", "urgent"]);
  const free = TAG_POOL.filter((t) => !tags.includes(t));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" leadingIcon={<RiAddLine />} disabled={!free.length} onClick={() => setTags((t) => [...t, free[0]!])}>
          Add a tag
        </Button>
        <Text size="sm" tone="neutral">
          Removed tags shrink away and their neighbours close the gap (<InlineCode>collapse="width"</InlineCode>).
        </Text>
      </div>
      <AnimatedList
        as="div"
        aria-label="Tags"
        className="flex min-h-8 flex-wrap"
        collapse="width"
        items={tags}
        getKey={(t) => t}
        renderItem={(t) => (
          <Badge className="mr-2 mb-2" removeLabel={`Remove ${t}`} onRemove={() => setTags((all) => all.filter((x) => x !== t))}>
            {t}
          </Badge>
        )}
      />
    </div>
  );
}

export function MotionLists() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <DemoLabel>Task list: rows pop in (a batch is staggered) and collapse out</DemoLabel>
        <TaskList />
      </div>
      <div className="space-y-2">
        <DemoLabel>Chips and tags</DemoLabel>
        <ChipRow />
      </div>
      <CodeBlock
        filename="animated-list.tsx"
        language="tsx"
        copyable={false}
        code={`<AnimatedList items={tasks} getKey={(t) => t.id} renderItem={(t) => <TaskRow task={t} />} />
// nothing animates on first render; a removed row stays for exitDuration (default 200 ms), inert and aria-hidden,
// while its height collapses. No live region: announce changes yourself. Keep spacing inside the rows, not as a gap.`}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Text and stagger                                                    */
/* ------------------------------------------------------------------ */

const CARDS = ["Capture", "Organise", "Review", "Share"];

export function MotionText() {
  const [run, setRun] = React.useState(0);
  const [loop, setLoop] = React.useState(false);
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" leadingIcon={<RiRefreshLine />} onClick={() => setRun((r) => r + 1)}>
          Replay
        </Button>
      </div>
      <div key={run} className="space-y-6">
        <div className="space-y-2">
          <DemoLabel>Stagger: the delay is --i times --sutra-stagger (30 ms, capped at 12 items)</DemoLabel>
          <div className="@container">
            <ul className="grid grid-cols-2 gap-2 @lg:grid-cols-4">
              {CARDS.map((c, i) => (
                <li
                  key={c}
                  style={{ "--i": i } as React.CSSProperties}
                  className="animate-fade-up stagger rounded-box border border-border bg-card px-3 py-4 text-center text-sm font-medium"
                >
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="space-y-2">
          <DemoLabel>SplitText by character (real text for screen readers, aria-hidden pieces)</DemoLabel>
          <SplitText as="p" text="Plan the week in one calm place." className="text-display-xs font-semibold tracking-tight" />
        </div>
        <div className="space-y-2">
          <DemoLabel>SplitText by word, pop-in</DemoLabel>
          <SplitText as="p" by="word" effect="pop-in" text="Notes, tasks and a calendar that agree with each other." className="text-lg text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <DemoLabel>Typewriter (the caret goes when it is done, so nothing blinks at rest)</DemoLabel>
          <Typewriter text="Ask anything about your notes…" delay={300} className="font-mono text-sm" />
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <DemoLabel>Several lines, space reserved so nothing below jumps</DemoLabel>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Loop
              <Switch size="sm" checked={loop} onCheckedChange={setLoop} aria-label="Loop the lines" />
            </label>
          </div>
          <Typewriter
            key={String(loop)}
            reserve
            loop={loop}
            cursor={loop ? "always" : "typing"}
            text={["Draft a reply to Maya", "Summarise this week's notes", "What is due on Friday?"]}
            hold={900}
            as="p"
            className="text-lg font-medium"
          />
        </div>
      </div>
      <Text size="sm" tone="neutral">
        Under reduced motion the text is simply there: no reveal, no typing, no caret.
      </Text>
    </div>
  );
}
