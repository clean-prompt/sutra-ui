import * as React from "react";
import {
  AgentRoom,
  IdentityAvatar,
  SegmentedControl,
  Switch,
  mascotCharacterLabels,
  mascotCharacters,
  type AgentRoomMember,
  type AgentRoomMessage,
  type IdentityAvatarKind,
  type IdentityAvatarPresence,
  type IdentityAvatarPresenceStyle,
  type IdentityAvatarSize,
  type SutraApp,
} from "@sutra/ui";
import { DemoLabel } from "../components/demo";

const photo = (n: number) => `https://i.pravatar.cc/128?img=${n}`;
const presences: IdentityAvatarPresence[] = ["online", "busy", "away", "offline"];
const sizes: IdentityAvatarSize[] = ["xs", "sm", "md", "lg", "xl"];

/** One row of the kinds-by-presence grid. */
interface Row {
  label: string;
  kind: IdentityAvatarKind;
  name: string;
  seed?: string;
  src?: string;
  app?: SutraApp;
}

const rows: Row[] = [
  { label: "Person", kind: "person", name: "Asha Rao" },
  { label: "Photo", kind: "person", name: "Mei Chen", src: photo(47) },
  { label: "Agent", kind: "agent", name: "Ada", seed: "agent:ada" },
  { label: "Machine", kind: "machine", name: "pi-kitchen", seed: "node:pi-kitchen" },
  { label: "App", kind: "app", name: "Notes", app: "notes" },
];

/** The kinds down the side, presence across: one table per style. */
function KindsGrid({ presenceStyle, animated }: { presenceStyle: IdentityAvatarPresenceStyle; animated: boolean }) {
  return (
    <div className="grid min-w-max grid-cols-[auto_repeat(5,minmax(3rem,1fr))] items-center gap-x-2 gap-y-3">
      <span />
      {["None", "Online", "Busy", "Away", "Offline"].map((h) => (
        <span key={h} className="text-center font-mono text-2xs text-muted-foreground">
          {h}
        </span>
      ))}
      {rows.map((r) => (
        <React.Fragment key={r.label}>
          <span className="pe-2 font-mono text-2xs uppercase tracking-wide text-muted-foreground">{r.label}</span>
          {[null, ...presences].map((p) => (
            <span key={p ?? "none"} className="flex justify-center">
              <IdentityAvatar
                kind={r.kind}
                name={r.name}
                seed={r.seed}
                src={r.src}
                app={r.app}
                presence={p}
                presenceStyle={presenceStyle}
                animated={animated}
                size="lg"
              />
            </span>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
}

/** A stack of avatars that overlap, with a +N count, ringed in the surface colour. */
function Group({ size, presenceStyle }: { size: IdentityAvatarSize; presenceStyle: IdentityAvatarPresenceStyle }) {
  const ring = "rounded-full ring-2 ring-background";
  return (
    <div role="group" aria-label="Launch team, 9 members" className="flex items-center -space-x-1.5">
      <IdentityAvatar name="Asha Rao" src={photo(32)} size={size} className={ring} presenceStyle={presenceStyle} />
      <IdentityAvatar name="Ravi Kumar" size={size} className={ring} />
      <IdentityAvatar kind="agent" name="Ada" seed="agent:ada" size={size} className={ring} />
      <IdentityAvatar name="Mei Chen" src={photo(47)} size={size} className={ring} />
      <IdentityAvatar name="Sana Mir" size={size} className={ring} />
      <span
        className="relative inline-flex shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground ring-2 ring-background"
        style={{ width: size === "md" ? 32 : 24, height: size === "md" ? 32 : 24, fontSize: size === "md" ? 12 : 10 }}
        role="img"
        aria-label="4 more"
      >
        +4
      </span>
    </div>
  );
}

const roomMembers: AgentRoomMember[] = [
  { id: "you", name: "You", kind: "human", avatarUrl: photo(12) },
  { id: "ada", name: "Ada", kind: "agent", role: "Planner", status: "thinking" },
  { id: "scout", name: "Scout", kind: "agent", role: "Finds sources" },
  { id: "critic", name: "Critic", kind: "agent", role: "Pokes holes", status: "holding" },
];
const roomMessages: AgentRoomMessage[] = [
  { id: "1", authorId: "you", text: "@Ada turn the notes into a launch checklist, @Scout find three comparable launches." },
  { id: "2", authorId: "scout", text: "Found three. Sending the numbers to Ada." },
  { id: "3", authorId: "critic", text: "The checklist has no rollback step." },
];

/** The member list of a room: presence on the avatar, a role line, no presence words. */
function MemberList({ presenceStyle }: { presenceStyle: IdentityAvatarPresenceStyle }) {
  const members: (Row & { presence: IdentityAvatarPresence; role: string })[] = [
    { label: "", kind: "person", name: "Asha Rao", src: photo(32), presence: "online", role: "Design" },
    { label: "", kind: "person", name: "Ravi Kumar", presence: "busy", role: "In a meeting until 11:30" },
    { label: "", kind: "person", name: "Mei Chen", src: photo(47), presence: "away", role: "Research" },
    { label: "", kind: "person", name: "Ellen Okafor", presence: "offline", role: "Engineering" },
    { label: "", kind: "agent", name: "Ada", seed: "agent:ada", presence: "online", role: "Planner" },
    { label: "", kind: "agent", name: "Scout", seed: "agent:scout", presence: "busy", role: "Reading 12 sources" },
    { label: "", kind: "machine", name: "gpu-01", seed: "node:gpu-01", presence: "offline", role: "Machine" },
  ];
  return (
    <ul className="flex max-w-xs flex-col gap-1">
      {members.map((m) => (
        <li key={m.name} className="flex items-center gap-2.5 rounded-control px-2 py-1 hover:bg-accent">
          <IdentityAvatar kind={m.kind} name={m.name} seed={m.seed} src={m.src} presence={m.presence} presenceStyle={presenceStyle} size="sm" />
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-medium">{m.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{m.role}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function IdentityAvatarDemo() {
  const [presenceStyle, setPresenceStyle] = React.useState<IdentityAvatarPresenceStyle>("mark");
  const [animated, setAnimated] = React.useState(false);
  return (
    <div className="w-full min-w-0 space-y-8">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <SegmentedControl
          size="sm"
          aria-label="Presence style"
          value={presenceStyle}
          onValueChange={(v) => v && setPresenceStyle(v as IdentityAvatarPresenceStyle)}
          options={[
            { value: "mark", label: "Mark" },
            { value: "bead", label: "Bead" },
          ]}
        />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch checked={animated} onCheckedChange={setAnimated} aria-label="Animate the agents" />
          Animate the agents
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="min-w-0 space-y-3 overflow-x-auto rounded-box border border-border bg-background p-4">
          <DemoLabel>Stock style: the seed tint, status hues</DemoLabel>
          <KindsGrid presenceStyle={presenceStyle} animated={animated} />
        </div>
        <div data-style="paper" className="min-w-0 space-y-3 overflow-x-auto rounded-box border border-border bg-background p-4 text-foreground">
          <DemoLabel>Paper style (pinned): one ink</DemoLabel>
          <KindsGrid presenceStyle={presenceStyle} animated={animated} />
        </div>
      </div>

      <div className="space-y-2">
        <DemoLabel>Sizes, xs to xl (20 to 64 px)</DemoLabel>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
          {sizes.map((s) => (
            <div key={s} className="flex flex-col items-center gap-2">
              <div className="flex items-end gap-2">
                <IdentityAvatar name="Asha Rao" presence="online" presenceStyle={presenceStyle} size={s} />
                <IdentityAvatar kind="agent" name="Ada" seed="agent:ada" presence="busy" presenceStyle={presenceStyle} size={s} animated={animated} />
                <IdentityAvatar kind="app" app="calendar" size={s} />
              </div>
              <span className="font-mono text-2xs text-muted-foreground">{s}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <DemoLabel>Agents wear a Sutra mascot (picked by the seed, or chosen with character)</DemoLabel>
        <div className="flex flex-wrap gap-4">
          {mascotCharacters.map((c) => (
            <div key={c} className="flex flex-col items-center gap-1.5">
              <IdentityAvatar kind="agent" name={mascotCharacterLabels[c]} character={c} size="lg" animated={animated} />
              <span className="text-2xs text-muted-foreground">{mascotCharacterLabels[c]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <DemoLabel>A group</DemoLabel>
          <Group size="md" presenceStyle={presenceStyle} />
          <Group size="sm" presenceStyle={presenceStyle} />
          <DemoLabel>Initials: drawn (default) or text; other scripts fall back to text</DemoLabel>
          <div className="flex flex-wrap items-center gap-3">
            <IdentityAvatar name="Jonas Weber" size="lg" />
            <IdentityAvatar name="Jonas Weber" monogram="text" size="lg" />
            <IdentityAvatar name="Zoë Åberg" size="lg" />
            <IdentityAvatar name="अनन्या शर्मा" size="lg" />
            <IdentityAvatar name="王 小明" size="lg" />
          </div>
        </div>
        <div className="space-y-3">
          <DemoLabel>A member list</DemoLabel>
          <MemberList presenceStyle={presenceStyle} />
        </div>
      </div>

      <div className="space-y-2">
        <DemoLabel>A room: AgentRoom draws its people and agents with IdentityAvatar</DemoLabel>
        <AgentRoom members={roomMembers} messages={roomMessages} round={1} currentSpeakerId="ada" turnOrder={["scout", "ada", "critic"]} className="max-w-3xl" />
      </div>
    </div>
  );
}
