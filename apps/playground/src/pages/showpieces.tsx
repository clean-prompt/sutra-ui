import * as React from "react";
import {
  AnimatedNumber,
  Avatar,
  AvatarGroup,
  Badge,
  Button,
  CheckBurst,
  Checkbox,
  ExpandCard,
  MorphDialog,
  PanSurface,
  SwipeDeck,
  Text,
  type CheckBurstApi,
} from "@cleanprompt/sutra-ui";
import {
  RiCalendarEventLine,
  RiDownloadLine,
  RiFileImageLine,
  RiFilePdf2Line,
  RiFileTextLine,
  RiFireFill,
  RiMapPinLine,
  RiRefreshLine,
  RiShareLine,
  RiVideoChatLine,
} from "@cleanprompt/sutra-ui/icons";
import { Demo, DemoLabel, PageIntro } from "../components/demo";

/* ------------------------------------------------------------------ */
/* CheckBurst                                                          */
/* ------------------------------------------------------------------ */

const todo = [
  { id: "invoice", label: "Send the invoice" },
  { id: "review", label: "Review the pull request" },
  { id: "plants", label: "Water the plants" },
  { id: "call", label: "Call the dentist" },
];

function TaskChecks() {
  const [done, setDone] = React.useState<Record<string, boolean>>({ invoice: true });
  const count = Object.values(done).filter(Boolean).length;
  return (
    <div className="w-full max-w-sm space-y-3">
      <ul className="divide-y divide-border rounded-box border border-border bg-card">
        {todo.map((t) => (
          <li key={t.id}>
            <label className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm">
              <CheckBurst active={!!done[t.id]} radius={24}>
                <Checkbox checked={!!done[t.id]} onCheckedChange={(v) => setDone((d) => ({ ...d, [t.id]: v === true }))} />
              </CheckBurst>
              <span className={done[t.id] ? "text-muted-foreground line-through" : undefined}>{t.label}</span>
            </label>
          </li>
        ))}
      </ul>
      <Text size="sm" tone="neutral" role="status">
        {count} of {todo.length} done
      </Text>
    </div>
  );
}

function Streak() {
  const [streak, setStreak] = React.useState(6);
  return (
    <div className="flex w-full max-w-sm items-center gap-4 rounded-box border border-border bg-card p-4">
      <CheckBurst burstKey={streak} radius={34} count={12} className="rounded-full bg-warning-soft p-3 text-warning-soft-foreground">
        <RiFireFill aria-hidden className="size-7" />
      </CheckBurst>
      <div className="min-w-0 flex-1">
        <p className="text-display-xs font-semibold tabular-nums">
          <AnimatedNumber value={streak} /> days
        </p>
        <p className="text-sm text-muted-foreground">Your current streak</p>
      </div>
      <Button size="sm" onClick={() => setStreak((s) => s + 1)}>
        Log today
      </Button>
    </div>
  );
}

function Variants() {
  const refs = [React.useRef<CheckBurstApi>(null), React.useRef<CheckBurstApi>(null), React.useRef<CheckBurstApi>(null)];
  const cells = [
    { label: "Multi", props: {} },
    { label: "Success dashes", props: { tone: "success", shape: "dashes", count: 8 } },
    { label: "Primary dots, wide", props: { tone: "primary", shape: "dots", count: 14, radius: 40 } },
  ] as const;
  return (
    <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
      {cells.map((cell, i) => (
        <div key={cell.label} className="flex flex-col items-center gap-4 rounded-box border border-border bg-card p-6">
          <CheckBurst apiRef={refs[i]} {...cell.props}>
            <span className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground">
              <RiRefreshLine aria-hidden className="size-5" />
            </span>
          </CheckBurst>
          <DemoLabel>{cell.label}</DemoLabel>
          <Button size="sm" variant="outline" onClick={() => refs[i]!.current?.burst()}>
            Replay
          </Button>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SwipeDeck                                                           */
/* ------------------------------------------------------------------ */

interface Mail {
  id: number;
  from: string;
  time: string;
  tag: string;
  subject: string;
  preview: string;
}
const inbox: Mail[] = [
  { id: 1, from: "Maya Chen", time: "9:41", tag: "Design", subject: "Final cut of the onboarding flow", preview: "Attached is the last round of changes: the progress bar now moves with each step, and the empty states are done." },
  { id: 2, from: "Ledgerly", time: "8:10", tag: "Billing", subject: "Invoice 2041 is ready", preview: "Your October invoice for the Team plan is ready. It will be charged to the card ending in 4242 on Friday." },
  { id: 3, from: "Tomas Rey", time: "Yesterday", tag: "Eng", subject: "Can you review the cache PR?", preview: "It is small, I promise. The only risky part is the invalidation on logout, I would love a second pair of eyes." },
  { id: 4, from: "Northwind", time: "Yesterday", tag: "News", subject: "Five things we shipped this month", preview: "Dark mode for every chart, keyboard shortcuts in the sidebar, and a faster export, plus two smaller fixes." },
  { id: 5, from: "Priya Nair", time: "Mon", tag: "People", subject: "Intro: Alex from the Lisbon office", preview: "Alex is joining the platform group next month and would like a coffee chat before they start. Free this week?" },
  { id: 6, from: "Calendar", time: "Mon", tag: "Event", subject: "Offsite agenda, draft two", preview: "Day one is workshops, day two is the roadmap review. Please add anything you want to cover before Thursday." },
];

function MailCard({ mail }: { mail: Mail }) {
  return (
    <div className="flex h-full flex-col gap-3 p-5 text-start">
      <div className="flex items-center gap-3">
        <Avatar name={mail.from} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={mail.from}>
            {mail.from}
          </p>
          <p className="text-xs text-muted-foreground">{mail.time}</p>
        </div>
        <Badge>{mail.tag}</Badge>
      </div>
      <h3 className="text-base font-semibold leading-snug">{mail.subject}</h3>
      <p className="line-clamp-4 text-sm text-muted-foreground">{mail.preview}</p>
    </div>
  );
}

function Triage() {
  const [index, setIndex] = React.useState(0);
  const [decided, setDecided] = React.useState<Record<number, "start" | "end">>({});
  const kept = Object.values(decided).filter((s) => s === "end").length;
  const skipped = Object.values(decided).filter((s) => s === "start").length;
  return (
    <div className="mx-auto w-full max-w-sm">
      <SwipeDeck
        items={inbox}
        getKey={(m) => m.id}
        getLabel={(m) => m.subject}
        renderCard={(m) => <MailCard mail={m} />}
        index={index}
        onIndexChange={setIndex}
        onSwipe={(side, m) => setDecided((d) => ({ ...d, [m.id]: side }))}
        onUndo={(m) =>
          setDecided((d) => {
            const { [m.id]: _gone, ...rest } = d;
            return rest;
          })
        }
        startLabel="Archive"
        endLabel="Keep"
        cardClassName="h-64"
        label="Inbox triage"
        emptyState={
          <>
            <p className="font-medium text-foreground">Inbox cleared</p>
            <p>
              {kept} kept, {skipped} archived
            </p>
            <Button size="sm" variant="outline" onClick={() => (setDecided({}), setIndex(0))}>
              Start over
            </Button>
          </>
        }
      />
      <p className="mt-3 text-center text-xs text-muted-foreground" role="status">
        {kept} kept, {skipped} archived, {Math.max(0, inbox.length - index)} to go
      </p>
    </div>
  );
}

function DeckStates() {
  return (
    <div className="grid w-full grid-cols-1 gap-8 md:grid-cols-2">
      <div className="space-y-2">
        <DemoLabel>Loading</DemoLabel>
        <SwipeDeck items={inbox} getKey={(m) => m.id} renderCard={(m) => <MailCard mail={m} />} loading label="Loading deck" cardClassName="h-64" />
      </div>
      <div className="space-y-2">
        <DemoLabel>Empty</DemoLabel>
        <SwipeDeck items={[]} getKey={(m: Mail) => m.id} renderCard={(m) => <MailCard mail={m} />} label="Empty deck" cardClassName="h-64" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PanSurface                                                          */
/* ------------------------------------------------------------------ */

const columns = [
  { title: "Ideas", tone: "bg-subtle", cards: ["Voice notes", "Offline mode", "Public roadmap", "Widgets", "Template gallery", "Import from Notion"] },
  { title: "Backlog", tone: "bg-muted", cards: ["Search filters", "Export to CSV", "Audit log", "Dark charts", "Saved views", "Bulk edit"] },
  { title: "In progress", tone: "bg-info-soft", cards: ["Billing page", "Team invites", "Onboarding tour", "Usage limits"] },
  { title: "In review", tone: "bg-warning-soft", cards: ["Cache invalidation", "Keyboard map", "Mobile nav"] },
  { title: "Shipped", tone: "bg-success-soft", cards: ["Dark mode", "Sidebar shortcuts", "Faster export", "Status page", "Slack alerts"] },
];

function Board() {
  const [picked, setPicked] = React.useState<string | null>(null);
  return (
    <div className="w-full space-y-3">
      <PanSurface label="Roadmap board" className="h-80" contentClassName="p-12" home="start">
        <div className="flex w-max gap-6">
          {columns.map((col) => (
            <section key={col.title} aria-label={col.title} className="w-60 shrink-0 space-y-3">
              <h3 className={`rounded-control px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${col.tone}`}>{col.title}</h3>
              {col.cards.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={picked === c}
                  onClick={() => setPicked(picked === c ? null : c)}
                  className="block w-full rounded-box border border-border bg-card p-3 text-start text-sm shadow-xs aria-pressed:border-primary aria-pressed:ring-2 aria-pressed:ring-primary/30"
                >
                  {c}
                </button>
              ))}
            </section>
          ))}
        </div>
      </PanSurface>
      <Text size="sm" tone="neutral" role="status">
        {picked ? `Selected: ${picked}` : "Drag the board, flick it, use the wheel or the arrow keys. A drag never selects a card."}
      </Text>
    </div>
  );
}

function Diagram() {
  const nodes = [
    { x: 120, y: 120, label: "Edge" },
    { x: 420, y: 80, label: "Auth" },
    { x: 700, y: 160, label: "API" },
    { x: 980, y: 120, label: "Queue" },
    { x: 260, y: 420, label: "Cache" },
    { x: 600, y: 480, label: "Database" },
    { x: 940, y: 460, label: "Workers" },
  ];
  const links = [[0, 1], [1, 2], [2, 3], [2, 5], [4, 5], [1, 4], [3, 6], [5, 6]] as const;
  return (
    <PanSurface zoom label="Service map" className="h-96" minScale={0.5} maxScale={3} contentSize={{ width: 1200, height: 640 }}>
      <svg width={1200} height={640} viewBox="0 0 1200 640" role="img" aria-label="Seven services and how they connect" className="text-foreground">
        <defs>
          <pattern id="pan-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" className="stroke-border" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="1200" height="640" fill="url(#pan-grid)" />
        {links.map(([a, b]) => (
          <line key={`${a}-${b}`} x1={nodes[a]!.x} y1={nodes[a]!.y} x2={nodes[b]!.x} y2={nodes[b]!.y} className="stroke-border-strong" strokeWidth="2" />
        ))}
        {nodes.map((n) => (
          <g key={n.label}>
            <rect x={n.x - 56} y={n.y - 24} width="112" height="48" rx="12" className="fill-card stroke-border-strong" strokeWidth="1.5" />
            <text x={n.x} y={n.y + 5} textAnchor="middle" className="fill-foreground text-sm font-medium">
              {n.label}
            </text>
          </g>
        ))}
      </svg>
    </PanSurface>
  );
}

/* ------------------------------------------------------------------ */
/* ExpandCard and MorphDialog                                          */
/* ------------------------------------------------------------------ */

const events = [
  { id: "sync", title: "Design sync", time: "10:00 to 10:45", where: "Studio, room 2", color: "border-s-primary", people: ["Maya Chen", "Tomas Rey", "Priya Nair"], note: "Walk through the onboarding flow, decide on the empty states and agree who ships what before Friday." },
  { id: "lunch", title: "Lunch with Alex", time: "12:30 to 13:30", where: "Cafe Alma", color: "border-s-success", people: ["Alex Costa"], note: "First chat before Alex joins the platform group. Ask about the Lisbon office and the migration." },
  { id: "review", title: "Quarterly review", time: "15:00 to 16:30", where: "Video call", color: "border-s-warning", people: ["Dana Wu", "Sam Ortiz", "Lee Park", "Noor Haddad"], note: "Metrics first, then the roadmap. Bring the churn numbers and the three open questions from last time." },
];

function Calendar() {
  return (
    <div className="w-full max-w-md space-y-3">
      {events.map((e) => (
        <ExpandCard
          key={e.id}
          title={e.title}
          description={`${e.time}, ${e.where}`}
          className={`border-s-4 ${e.color}`}
          panelClassName={`border-s-4 ${e.color}`}
          detail={({ close }) => (
            <div className="space-y-4">
              <p className="text-muted-foreground">{e.note}</p>
              <div className="flex items-center gap-3">
                <AvatarGroup>
                  {e.people.map((p) => (
                    <Avatar key={p} name={p} size="sm" />
                  ))}
                </AvatarGroup>
                <span className="text-xs text-muted-foreground">{e.people.length} going</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" leadingIcon={<RiVideoChatLine aria-hidden />}>
                  Join
                </Button>
                <Button size="sm" variant="outline" onClick={close}>
                  Close
                </Button>
              </div>
            </div>
          )}
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <RiCalendarEventLine aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 truncate">{e.title}</span>
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">{e.time}</span>
          <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <RiMapPinLine aria-hidden className="size-3.5 shrink-0" />
            {e.where}
          </span>
        </ExpandCard>
      ))}
    </div>
  );
}

const files = [
  { id: "plan", name: "Roadmap Q4.pdf", size: "2.4 MB", kind: "PDF", Icon: RiFilePdf2Line, pages: "12 pages", by: "Maya Chen" },
  { id: "hero", name: "Launch hero.png", size: "840 KB", kind: "Image", Icon: RiFileImageLine, pages: "2400 x 1350", by: "Tomas Rey" },
  { id: "notes", name: "Offsite notes.md", size: "14 KB", kind: "Text", Icon: RiFileTextLine, pages: "310 words", by: "Priya Nair" },
];

function Files() {
  return (
    <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
      {files.map((f) => (
        <ExpandCard
          key={f.id}
          title={f.name}
          description={`${f.kind}, ${f.size}`}
          size="lg"
          detail={
            <div className="space-y-4">
              <div className="grid aspect-video place-items-center rounded-control bg-muted text-muted-foreground">
                <f.Icon aria-hidden className="size-12" />
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
                <dt className="text-muted-foreground">Type</dt>
                <dd>{f.kind}</dd>
                <dt className="text-muted-foreground">Size</dt>
                <dd>{f.size}</dd>
                <dt className="text-muted-foreground">Details</dt>
                <dd>{f.pages}</dd>
                <dt className="text-muted-foreground">Added by</dt>
                <dd>{f.by}</dd>
              </dl>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" leadingIcon={<RiDownloadLine aria-hidden />}>
                  Download
                </Button>
                <Button size="sm" variant="outline" leadingIcon={<RiShareLine aria-hidden />}>
                  Share
                </Button>
              </div>
            </div>
          }
        >
          <span className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-control bg-muted text-muted-foreground">
              <f.Icon aria-hidden className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium" title={f.name}>
                {f.name}
              </span>
              <span className="block text-xs text-muted-foreground">{f.size}</span>
            </span>
          </span>
        </ExpandCard>
      ))}
    </div>
  );
}

function AnyOrigin() {
  const [open, setOpen] = React.useState<"dialog" | "sheet" | null>(null);
  const dialogButton = React.useRef<HTMLButtonElement>(null);
  const sheetButton = React.useRef<HTMLButtonElement>(null);
  return (
    <>
      <Button ref={dialogButton} onClick={() => setOpen("dialog")}>
        Open as a dialog
      </Button>
      <Button ref={sheetButton} variant="outline" onClick={() => setOpen("sheet")}>
        Open as a sheet
      </Button>
      <MorphDialog
        open={open === "dialog"}
        onOpenChange={(o) => !o && setOpen(null)}
        origin={dialogButton}
        title="Invite your team"
        description="Send an invitation by email"
        variant="dialog"
        showTitle
        size="sm"
      >
        <div className="space-y-3 p-4 pt-2 text-sm">
          <p className="text-muted-foreground">The panel grew out of the button you pressed and shrinks back into it when you close it.</p>
          <Button size="sm" onClick={() => setOpen(null)}>
            Done
          </Button>
        </div>
      </MorphDialog>
      <MorphDialog open={open === "sheet"} onOpenChange={(o) => !o && setOpen(null)} origin={sheetButton} title="Filters" variant="sheet" showTitle>
        <div className="space-y-3 p-4 pt-2 text-sm">
          <p className="text-muted-foreground">A sheet docks to the bottom edge and still comes out of its own button.</p>
          <Button size="sm" onClick={() => setOpen(null)}>
            Apply
          </Button>
        </div>
      </MorphDialog>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

/** Showpieces: pointer-driven and morphing components built on the gesture and flight hooks. */
export function ShowpiecesPage() {
  return (
    <PageIntro eyebrow="Patterns" title="Showpieces" description="Tactile components built on the gesture and motion foundations: a celebratory burst, a swipeable card deck, an inertial canvas and a card that grows into its dialog. Each has a keyboard path, respects reduced motion and mirrors in right-to-left text.">
      <Demo id="check-burst" title="Check burst" description="A ring of particles flies out of a checkbox when a task is completed. Decoration only: the state is in the checkbox and the count." align="start">
        <TaskChecks />
      </Demo>
      <Demo id="check-burst-streak" title="Check burst, streak" description="burstKey plays a burst whenever the value changes; the number rolls with AnimatedNumber." align="start">
        <Streak />
      </Demo>
      <Demo id="check-burst-variants" title="Check burst, variants" description="Tone, shape, count and reach. Replay uses apiRef.burst()." align="start">
        <Variants />
      </Demo>
      <Demo id="swipe-deck" title="Swipe deck" description="Drag the top card, or use Archive and Keep, the arrow keys and Enter on the focused deck. Undo (or Ctrl or Command + Z) brings the last card back. Sides follow the reading direction." align="start">
        <Triage />
      </Demo>
      <Demo id="swipe-deck-states" title="Swipe deck, loading and empty" description="A skeleton stack while the cards load, and the empty state with no cards." align="start">
        <DeckStates />
      </Demo>
      <Demo id="pan-surface" title="Pan surface" description="An inertial canvas: drag and flick, wheel, arrow keys, Page Up and Down, Home. It stops at its edges with a bounce, and a recenter button appears once it has moved." align="start">
        <Board />
      </Demo>
      <Demo id="pan-surface-zoom" title="Pan surface, zoom" description="zoom composes useZoomPan: Ctrl or Command with the wheel (or a trackpad pinch), the buttons, + and - and 0." align="start">
        <Diagram />
      </Demo>
      <Demo id="expand-card-calendar" title="Expand card, calendar events" description="The card is the button and the origin: the dialog grows out of its rectangle and shrinks back into it. A sheet below 640 px." align="start">
        <Calendar />
      </Demo>
      <Demo id="expand-card-files" title="Expand card, file previews" description="The same flight for a grid of file cards, with a larger panel." align="start">
        <Files />
      </Demo>
      <Demo id="morph-dialog" title="Morph dialog" description="MorphDialog takes any origin (an element, a ref or a rectangle) and a variant: a centred dialog or a bottom sheet." align="center">
        <AnyOrigin />
      </Demo>
    </PageIntro>
  );
}
