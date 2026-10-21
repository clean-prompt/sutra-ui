import * as React from "react";
import {
  AppLauncher,
  AppLauncherMenu,
  Button,
  CallScreen,
  MessengerHeader,
  Checklist,
  ContextMenuItem,
  Countdown,
  GroupInfoPanel,
  IncomingCall,
  InstallButton,
  MessageComposer,
  MessageList,
  RecurrencePicker,
  ReorderableList,
  StatusCycle,
  Stopwatch,
  TallyCounter,
  TextLink,
  describeRecurrence,
  toRRule,
  type AppLauncherItem,
  type ChecklistEntry,
  type MessengerMessage,
  type RecurrenceRule,
  type StatusCycleOption,
} from "@sutra/ui";
import {
  RiBookOpenLine,
  RiBookReadLine,
  RiCheckboxCircleLine,
  RiFilePdf2Line,
  RiKey2Line,
  RiPushpinLine,
  RiStickyNoteLine,
  RiTerminalBoxLine,
} from "@sutra/ui/icons";
import { Demo, DemoLabel, PageIntro } from "../components/demo";
import { IdentityAvatarDemo } from "../demos/identity-avatar-demos";

/* ------------------------------------------------------------------ */
/* Launcher                                                            */
/* ------------------------------------------------------------------ */

const launcherItems: AppLauncherItem[] = [
  { id: "notes", label: "Notes", app: "notes", badge: 2 },
  { id: "tasks", label: "Tasks", app: "tasks", badge: 12 },
  { id: "calendar", label: "Calendar", app: "calendar" },
  { id: "mail", label: "Mail", app: "mail", badge: 128, keywords: ["inbox", "email"] },
  { id: "files", label: "Files", app: "files" },
  { id: "journal", label: "Journal", app: "journal" },
  { id: "finance", label: "Finance", app: "finance", keywords: ["money", "budget"] },
  { id: "habits", label: "Habits", app: "habits" },
  { id: "terminal", label: "Terminal", icon: <TerminalIcon />, keywords: ["shell"] },
];

function TerminalIcon() {
  return (
    <span className="flex size-[52px] items-center justify-center rounded-[30%] bg-gradient-to-br from-zinc-600 to-zinc-900 text-white">
      <RiTerminalBoxLine className="size-6" />
    </span>
  );
}

function LauncherDemo() {
  const [last, setLast] = React.useState<string | null>(null);
  return (
    <div className="@container w-full">
      <div className="grid grid-cols-1 gap-8 @2xl:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <DemoLabel>Grid · arrow keys move focus · right-click (long-press on touch) a tile for its menu</DemoLabel>
          <AppLauncher
            items={launcherItems}
            columns={4}
            searchable
            onSelect={(item) => setLast(item.label)}
            renderMenu={(item) => (
              <>
                <ContextMenuItem onSelect={() => setLast(`${item.label} (new window)`)}>Open in new window</ContextMenuItem>
                <ContextMenuItem onSelect={() => setLast(`${item.label} pinned`)}>Pin to dock</ContextMenuItem>
              </>
            )}
            className="max-w-md"
          />
          <p className="text-xs text-muted-foreground">Last opened: {last ?? "nothing yet"}</p>
        </div>
        <div className="space-y-6">
          <div className="space-y-2">
            <DemoLabel>Waffle menu</DemoLabel>
            <AppLauncherMenu
              items={launcherItems}
              onSelect={(item) => setLast(item.label)}
              footer={
                <Button variant="ghost" size="sm" fullWidth>
                  All apps
                </Button>
              }
            />
          </div>
          <div className="space-y-2">
            <DemoLabel>Dock</DemoLabel>
            <AppLauncher variant="dock" items={launcherItems.slice(0, 5)} onSelect={(item) => setLast(item.label)} label="Dock" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Calls                                                               */
/* ------------------------------------------------------------------ */

function IncomingCallDemo() {
  const [state, setState] = React.useState<"ringing" | "accepted" | "declined" | "missed" | "message">("ringing");
  const [overlay, setOverlay] = React.useState(false);
  return (
    <div className="flex flex-col items-center gap-4">
      {state === "ringing" ? (
        <IncomingCall
          name="Ana Lima"
          type="video"
          subtitle="Sutra Messenger"
          ringFor={30000}
          onAccept={() => setState("accepted")}
          onDecline={() => setState("declined")}
          onTimeout={() => setState("missed")}
          onMessage={() => setState("message")}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Call {state === "message" ? "declined with a quick message" : state}.{" "}
          <TextLink variant="subtle" onClick={() => setState("ringing")}>Ring again</TextLink>
        </p>
      )}
      <Button variant="secondary" size="sm" onClick={() => setOverlay(true)}>
        Show as full-screen overlay
      </Button>
      {overlay ? (
        <IncomingCall
          variant="overlay"
          name="Bo Chen"
          type="audio"
          ringFor={15000}
          onAccept={() => setOverlay(false)}
          onDecline={() => setOverlay(false)}
        />
      ) : null}
    </div>
  );
}

function CallScreenDemo() {
  const [ended, setEnded] = React.useState(false);
  const [startedAt] = React.useState(() => Date.now() - 83_000);
  if (ended) {
    return (
      <p className="text-sm text-muted-foreground">
        Call ended. <TextLink variant="subtle" onClick={() => setEnded(false)}>Rejoin</TextLink>
      </p>
    );
  }
  return (
    <CallScreen
      name="Ana Lima"
      startedAt={startedAt}
      quality="good"
      remote={<div className="size-full bg-[radial-gradient(circle_at_30%_30%,#a684ff,transparent_55%),radial-gradient(circle_at_70%_70%,#00d3f2,transparent_50%),linear-gradient(135deg,#1e1a4d,#052f4a)]" />}
      local={<div className="size-full bg-gradient-to-br from-amber-300 to-rose-500" />}
      onEndCall={() => setEnded(true)}
      className="aspect-video min-h-0 w-full max-w-3xl"
    />
  );
}

/* ------------------------------------------------------------------ */
/* Messenger                                                           */
/* ------------------------------------------------------------------ */

function SharedCard({ icon, title, meta, tone }: { icon: React.ReactNode; title: string; meta: string; tone: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-2.5 text-foreground">
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg text-white ${tone} [&_svg]:size-5`}>{icon}</span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{meta}</span>
      </span>
    </div>
  );
}

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);

const initialMessages: MessengerMessage[] = [
  { id: "m1", senderId: "ana", text: "Morning! Did you see the trip plan?", createdAt: minutesAgo(26 * 60) },
  { id: "m2", senderId: "me", text: "Not yet — send it over?", createdAt: minutesAgo(26 * 60 - 2), status: "read" },
  {
    id: "m3",
    senderId: "ana",
    createdAt: minutesAgo(26 * 60 - 3),
    attachment: <SharedCard icon={<RiStickyNoteLine />} title="Lisbon trip plan" meta="Shared note · 4 sections" tone="bg-amber-500" />,
    text: "Here you go",
    reactions: [{ emoji: "🎉", count: 1, reacted: true }],
  },
  { id: "m4", senderId: "me", text: "Perfect, thanks!", createdAt: minutesAgo(26 * 60 - 4), status: "read" },
  { id: "m5", senderId: "ana", text: "Can you share the airline login?", createdAt: minutesAgo(40) },
  {
    id: "m6",
    senderId: "me",
    createdAt: minutesAgo(38),
    status: "read",
    attachment: <SharedCard icon={<RiKey2Line />} title="TAP Air Portugal" meta="Shared password · expires in 24h" tone="bg-indigo-500" />,
    replyTo: { senderName: "Ana", text: "Can you share the airline login?" },
  },
  {
    id: "m7",
    senderId: "ana",
    createdAt: minutesAgo(12),
    attachment: <SharedCard icon={<RiFilePdf2Line />} title="boarding-passes.pdf" meta="File · 284 KB" tone="bg-rose-500" />,
  },
  { id: "m8", senderId: "ana", text: "Boarding passes 👆", createdAt: minutesAgo(11), edited: true },
  { id: "m9", senderId: "ana", text: "See you at the gate!", createdAt: minutesAgo(10) },
  { id: "m10", senderId: "me", text: "On my way", createdAt: minutesAgo(2), status: "failed" },
];

function MessengerDemo() {
  const [messages, setMessages] = React.useState(initialMessages);
  const setStatus = (id: string, status: MessengerMessage["status"]) =>
    setMessages((list) => list.map((m) => (m.id === id ? { ...m, status } : m)));

  const deliver = (id: string) => {
    setStatus(id, "sending");
    setTimeout(() => setStatus(id, "sent"), 600);
    setTimeout(() => setStatus(id, "delivered"), 1400);
    setTimeout(() => setStatus(id, "read"), 2600);
  };

  return (
    <div className="mx-auto flex h-[640px] w-full max-w-md flex-col overflow-hidden rounded-box border border-border bg-subtle">
      <MessengerHeader
        name="Ana Lima"
        presence="online"
        onBack={() => {}}
        onVoiceCall={() => {}}
        onVideoCall={() => {}}
        onInfo={() => {}}
      />
      <MessageList
        className="flex-1"
        messages={messages}
        currentUserId="me"
        firstUnreadId="m7"
        onRetry={(m) => deliver(m.id)}
        onReactionToggle={(m, emoji, reacted) =>
          setMessages((list) =>
            list.map((x) =>
              x.id === m.id
                ? { ...x, reactions: (x.reactions ?? []).map((r) => (r.emoji === emoji ? { ...r, reacted, count: r.count + (reacted ? 1 : -1) } : r)) }
                : x
            )
          )
        }
      />
      <MessageComposer
        onAttach={() => {}}
        onSend={(text) => {
          const id = `local-${Date.now()}`;
          setMessages((list) => [...list, { id, senderId: "me", text, createdAt: new Date(), status: "sending" }]);
          deliver(id);
        }}
      />
    </div>
  );
}

function GroupInfoDemo() {
  return (
    <div className="mx-auto w-full max-w-sm rounded-box border border-border">
      <MessengerHeader
        name="Lisbon crew"
        members={[{ name: "Ana Lima" }, { name: "Bo Chen" }, { name: "Chandra Rao" }, { name: "Dmitri V" }]}
        presence={minutesAgo(5)}
        onInfo={() => {}}
      />
      <GroupInfoPanel
        name="Lisbon crew"
        description="Planning the October trip."
        currentUserId="me"
        members={[
          { id: "me", name: "You Self", role: "owner", status: "online" },
          { id: "ana", name: "Ana Lima", role: "admin", status: "online", subtitle: "Booking flights" },
          { id: "bo", name: "Bo Chen", status: "away" },
          { id: "ch", name: "Chandra Rao" },
          { id: "dm", name: "Dmitri V", status: "busy" },
        ]}
        media={[
          { id: "1", alt: "Beach", preview: <span className="text-2xl">🏖️</span> },
          { id: "2", alt: "Tram 28", preview: <span className="text-2xl">🚋</span> },
          { id: "3", alt: "Pastel de nata", preview: <span className="text-2xl">🥮</span> },
          { id: "4", alt: "Itinerary", preview: <RiStickyNoteLine className="size-6" /> },
          { id: "5", alt: "Boarding passes", preview: <RiFilePdf2Line className="size-6" /> },
          { id: "6", alt: "Sunset", preview: <span className="text-2xl">🌅</span> },
        ]}
        onAddMember={() => {}}
        onMemberClick={() => {}}
        onLeave={() => {}}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Reorder & checklist                                                 */
/* ------------------------------------------------------------------ */

function ReorderDemo() {
  const [items, setItems] = React.useState(["Write the brief", "Review designs", "Ship beta", "Collect feedback", "Plan v2"]);
  return (
    <div className="mx-auto w-full max-w-md space-y-2">
      <DemoLabel>Drag the handle · or focus it, press Space, use ↑/↓, Space to drop, Esc to cancel · or use the arrows</DemoLabel>
      <ReorderableList
        label="Roadmap"
        items={items}
        getKey={(i) => i}
        getLabel={(i) => i}
        moveButtons
        onReorder={setItems}
        itemClassName="border border-border px-1 shadow-xs"
        renderItem={(i, { index }) => (
          <span className="flex items-center gap-2 py-1.5 text-sm">
            <span className="w-4 text-xs text-muted-foreground tabular-nums">{index + 1}</span>
            {i}
          </span>
        )}
      />
    </div>
  );
}

const subtasks: ChecklistEntry[] = [
  { id: "1", text: "Book flights", done: true },
  { id: "2", text: "Reserve hotel", done: true },
  { id: "3", text: "Renew passport", done: false },
  { id: "4", text: "Travel insurance", done: false },
  { id: "5", text: "Pack chargers", done: false },
];

/* ------------------------------------------------------------------ */
/* Status & recurrence                                                 */
/* ------------------------------------------------------------------ */

const paperStatuses: StatusCycleOption[] = [
  { value: "unread", label: "Unread", icon: <RiBookOpenLine />, color: "neutral" },
  { value: "reading", label: "Reading", icon: <RiBookReadLine />, color: "info" },
  { value: "read", label: "Read", icon: <RiCheckboxCircleLine />, color: "success" },
];

const taskStatuses: StatusCycleOption[] = [
  { value: "todo", label: "To do", color: "neutral" },
  { value: "doing", label: "In progress", color: "primary" },
  { value: "blocked", label: "Blocked", color: "destructive" },
  { value: "done", label: "Done", icon: <RiCheckboxCircleLine />, color: "success" },
];

function StatusDemo() {
  const [paper, setPaper] = React.useState("unread");
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <StatusCycle statuses={paperStatuses} value={paper} onValueChange={setPaper} label="Reading status" />
        <StatusCycle statuses={taskStatuses} defaultValue="doing" size="sm" label="Task status" />
        <StatusCycle statuses={paperStatuses} defaultValue="read" showMenu={false} loop={false} />
      </div>
      <p className="text-xs text-muted-foreground">Click to advance · Shift+click or ← to go back · chevron to pick directly. Current: {paper}</p>
    </div>
  );
}

function RecurrenceDemo() {
  const [rule, setRule] = React.useState<RecurrenceRule>({ freq: "weekly", byWeekday: ["MO", "WE"] });
  const rrule = toRRule(rule, { prefix: true });
  return (
    <div className="@container w-full">
      <div className="grid grid-cols-1 w-full gap-6 @2xl:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
        <RecurrencePicker value={rule} onValueChange={setRule} />
        <div className="space-y-3 rounded-box border border-border bg-subtle p-4">
          <DemoLabel>describeRecurrence()</DemoLabel>
          <p className="text-sm font-medium">{describeRecurrence(rule)}</p>
          <DemoLabel>toRRule()</DemoLabel>
          <code className="block break-all rounded-md bg-muted px-2 py-1.5 font-mono text-xs">{rrule || "(none)"}</code>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function SocialPage() {
  const [newYear] = React.useState(() => new Date(new Date().getFullYear() + 1, 0, 1));
  const [soon, setSoon] = React.useState(() => Date.now() + 15_000);
  const [done, setDone] = React.useState(false);

  return (
    <PageIntro
      eyebrow="Components"
      title="Apps & Social"
      description="Launchers, identity avatars, install prompts, calls, messaging, reordering, counters, status pills and repeat rules."
    >
      <Demo id="app-launcher" title="App Launcher" description="Home-screen grid with badges, search, arrow-key navigation, a context menu slot, a dock and a waffle menu. Each tile adopts its app's accent via data-app." align="start">
        <LauncherDemo />
      </Demo>

      <Demo id="identity-avatar" title="Identity Avatar" description="One family for a room: people are a photo or drawn initials, agents and machines wear a Sutra mascot whose face follows their presence, apps are their Bead tiles. Presence is a shaped mark (solid, barred, half, hollow) or a bead on a thread round the face. Ink in the paper style, the seed tint in the stock style." align="start">
        <IdentityAvatarDemo />
      </Demo>

      <Demo id="text-button" title="Text Button" description="TextLink as an inline action: a button with onClick and no href, a link when given an href. (TextButton is a deprecated alias.)">
        <p className="max-w-md text-sm text-muted-foreground">
          Your draft was saved. You can <TextLink variant="subtle" onClick={() => {}}>start from the beginning</TextLink>, open{" "}
          <TextLink href="#text-button" variant="muted">settings</TextLink>, or <TextLink variant="destructive" onClick={() => {}}>discard it</TextLink>.
        </p>
      </Demo>

      <Demo
        id="install-button"
        title="Install Button"
        description="Captures beforeinstallprompt and hides itself when the app is not installable or is already installed, so the default one below is usually invisible in the playground. The second is forced to the iOS variant, which shows Share → Add to Home Screen steps."
      >
        <div className="flex flex-col items-center gap-1">
          <DemoLabel>Auto (hidden unless installable)</DemoLabel>
          <div className="flex min-h-9 items-center">
            <InstallButton appName="Sutra" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <DemoLabel>Forced iOS instructions</DemoLabel>
          <InstallButton appName="Sutra" platform="ios" />
        </div>
      </Demo>

      <Demo id="incoming-call" title="Incoming Call" description="Ringing card with ping rings, Accept / Decline / Message and an auto-timeout. Esc declines. No ringtone included." dots>
        <IncomingCallDemo />
      </Demo>

      <Demo id="call-screen" title="Call Screen" description="In-call layout with a draggable, mirrored self-view (drag to a corner or focus it and use arrow keys), timer, connection quality and controls. Gradients stand in for MediaStreams here.">
        <CallScreenDemo />
      </Demo>

      <Demo id="messenger" title="Messenger" description="MessengerHeader + MessageList + MessageComposer: grouped bubbles, day separators, an unread divider, delivery ticks, a failed message with retry, replies, reactions and shared-item previews." align="start" dots>
        <MessengerDemo />
      </Demo>

      <Demo id="group-info-panel" title="Group Info Panel" description="Members sorted by role, shared media grid, mute and leave." align="start">
        <GroupInfoDemo />
      </Demo>

      <Demo id="reorderable-list" title="Reorderable List" description="Accessible reordering without a DnD library, with live announcements like “Moved X to position 3 of 5”." align="start">
        <ReorderDemo />
      </Demo>

      <Demo id="checklist" title="Checklist" description="Subtasks with add, inline edit (click the text), delete, reorder, an n/m count with a thin bar, and a hide-completed toggle." align="start">
        <div className="mx-auto w-full max-w-md">
          <Checklist label="Subtasks" defaultItems={subtasks} addPlaceholder="Add a subtask" moveButtons />
        </div>
      </Demo>

      <Demo id="countdown" title="Countdown" description="Segments or compact text, optional flip animation (skipped with reduced motion), role=timer and onComplete.">
        <div className="flex flex-col items-center gap-6">
          {/* The md segments need about 300px: phones get the sm size. */}
          <Countdown target={newYear} flip size="sm" className="sm:hidden" />
          <Countdown target={newYear} flip className="hidden sm:inline-flex" />
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">Compact:</span>
            <Countdown target={newYear} format="compact" />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
            <Countdown target={soon} size="sm" onComplete={() => setDone(true)} />
            <span className="text-muted-foreground">{done ? "Done!" : "until onComplete"}</span>
            <Button
              size="xs"
              variant="secondary"
              onClick={() => {
                setDone(false);
                setSoon(Date.now() + 15_000);
              }}
            >
              Restart
            </Button>
          </div>
        </div>
      </Demo>

      <Demo id="stopwatch" title="Stopwatch" description="useStopwatch powers start / pause, laps (fastest in green, slowest in red) and reset.">
        <Stopwatch />
      </Demo>

      <Demo id="tally-counter" title="Tally Counter" description="Press and hold + or − to repeat. Goal ring, step and an entry log with undo." align="start">
        <div className="@container w-full">
          <div className="grid grid-cols-1 gap-8 @lg:grid-cols-2">
            <TallyCounter label="Glasses of water" goal={8} />
            <TallyCounter label="Push-ups" step={5} goal={100} defaultValue={35} />
          </div>
        </div>
      </Demo>

      <Demo id="status-cycle" title="Status Cycle" description="A pill that advances through ordered statuses, each with its own icon and color.">
        <StatusDemo />
      </Demo>

      <Demo id="recurrence-picker" title="Recurrence Picker" description="Daily, weekly with weekday toggles, monthly by day or “first Monday”, yearly, custom intervals and an end condition. Outputs an RRULE and a plain-English summary." align="start">
        <RecurrenceDemo />
      </Demo>

      <Demo id="pinned-note" title="Shared item previews" description="The cards used as MessageBubble attachments are plain slots: any node works.">
        <div className="grid w-full max-w-md grid-cols-1 gap-2">
          <SharedCard icon={<RiStickyNoteLine />} title="Lisbon trip plan" meta="Shared note" tone="bg-amber-500" />
          <SharedCard icon={<RiKey2Line />} title="Wi-Fi password" meta="Shared password · view once" tone="bg-indigo-500" />
          <SharedCard icon={<RiPushpinLine />} title="Pinned: meet at gate 14" meta="Pinned message" tone="bg-emerald-600" />
        </div>
      </Demo>
    </PageIntro>
  );
}

export default SocialPage;
