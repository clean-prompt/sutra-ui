import * as React from "react";
import {
  RiAddLine,
  RiArrowDownLine,
  RiArrowDownSLine,
  RiArrowUpLine,
  RiCloseLine,
  RiMailSendLine,
  RiInboxArchiveLine,
  RiVolumeMuteLine,
  RiVolumeUpLine,
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { escapeRegExp } from "../lib/text";
import { IdentityMark, identityColor } from "./identity-mark";
import { Avatar } from "./avatar";
import { Button } from "./button";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type AgentRoomMemberKind = "agent" | "human";
export type AgentRoomMemberStatus = "idle" | "typing" | "thinking" | "holding" | "speaking";

export interface AgentRoomMember {
  id: string;
  name: string;
  kind: AgentRoomMemberKind;
  /** Name / avatar color. Defaults to a hash of the id for agents. */
  color?: string;
  avatarUrl?: string;
  /** Role line, e.g. "Researcher". */
  role?: string;
  muted?: boolean;
  status?: AgentRoomMemberStatus;
  /** Shown while holding. Default "Holding — waiting to be mentioned". */
  holdReason?: string;
}

export interface AgentRoomNotice {
  direction: "outgoing" | "incoming";
  /** The other agent's name. */
  agent: string;
  payload: string;
}

export interface AgentRoomMessage {
  id: string;
  authorId: string;
  text?: string;
  createdAt?: Date | number | string;
  /** System line ("Round 2 started") or an agent-to-agent notice. */
  kind?: "message" | "system" | "notice";
  notice?: AgentRoomNotice;
}

const memberColor = (m: AgentRoomMember) => m.color ?? (m.kind === "agent" ? identityColor(m.id) : undefined);

/* ------------------------------------------------------------------ */
/* AgentMessageNotice                                                  */
/* ------------------------------------------------------------------ */

export interface AgentMessageNoticeProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  direction: "outgoing" | "incoming";
  /** The other agent. */
  agent: string;
  /** Full message body, revealed on expand. */
  payload: string;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

/** Transcript row for an agent-to-agent message ("Messaged Researcher: …" / "Message from Planner") with an expandable payload. */
export const AgentMessageNotice = React.forwardRef<HTMLDivElement, AgentMessageNoticeProps>(
  ({ direction, agent, payload, defaultExpanded = false, expanded: expandedProp, onExpandedChange, className, ...props }, ref) => {
    const [expanded, setExpanded] = useControllableState({ value: expandedProp, defaultValue: defaultExpanded, onChange: onExpandedChange });
    const bodyId = React.useId();
    const preview = payload.split("\n")[0]!.slice(0, 80);
    const Icon = direction === "outgoing" ? RiMailSendLine : RiInboxArchiveLine;
    return (
      <div ref={ref} data-slot="agent-message-notice" data-direction={direction} className={cn("text-sm", className)} {...props}>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={bodyId}
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "flex w-full min-w-0 items-center gap-2 rounded-control px-2 py-1 text-left text-muted-foreground hover:bg-accent hover:text-foreground",
            focusRing
          )}
        >
          <Icon aria-hidden className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">
            {direction === "outgoing" ? (
              <>
                Messaged <span className="font-medium text-foreground">{agent}</span>
                {!expanded && preview && <span>: {preview}{payload.length > preview.length ? "…" : ""}</span>}
              </>
            ) : (
              <>
                Message from <span className="font-medium text-foreground">{agent}</span>
              </>
            )}
          </span>
          <RiArrowDownSLine aria-hidden className={cn("size-4 shrink-0 transition-transform", expanded && "rotate-180")} />
        </button>
        {expanded && (
          <div id={bodyId} className="ml-8 mt-1 whitespace-pre-wrap rounded-lg border border-border bg-subtle px-3 py-2 font-mono text-xs text-foreground">
            {payload}
          </div>
        )}
      </div>
    );
  }
);
AgentMessageNotice.displayName = "AgentMessageNotice";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Split text into plain strings and `@Name` mentions of known members. */
export function parseAgentMentions(text: string, members: AgentRoomMember[]): Array<string | { mention: AgentRoomMember; text: string }> {
  const names = [...members].sort((a, b) => b.name.length - a.name.length);
  if (!names.length) return [text];
  const re = new RegExp(`@(${names.map((m) => escapeRegExp(m.name)).join("|")})\\b`, "gi");
  const out: Array<string | { mention: AgentRoomMember; text: string }> = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(text.slice(last, idx));
    const member = names.find((n) => n.name.toLowerCase() === m[1]!.toLowerCase())!;
    out.push({ mention: member, text: m[0] });
    last = idx + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function MemberAvatar({ member, size = "sm" }: { member: AgentRoomMember; size?: "xs" | "sm" }) {
  if (member.kind === "human") return <Avatar size={size} src={member.avatarUrl} name={member.name} aria-hidden />;
  return (
    <IdentityMark
      seed={member.id}
      kind="machine"
      size={size}
      color={memberColor(member)}
      decorative
      state={member.status === "thinking" || member.status === "typing" ? "busy" : undefined}
    />
  );
}

function ThinkingDots() {
  return (
    <span aria-hidden className="inline-flex gap-0.5">
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-1 rounded-full bg-current motion-safe:animate-dot-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* AgentRoom                                                           */
/* ------------------------------------------------------------------ */

export interface AgentRoomProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  members: AgentRoomMember[];
  messages: AgentRoomMessage[];
  title?: React.ReactNode;
  /** Current round number (1-based). */
  round?: number;
  /** Speaking order (member ids). Defaults to agents in `members` order. */
  turnOrder?: string[];
  /** Whose turn it is. */
  currentSpeakerId?: string;
  /** Composer node rendered under the transcript (e.g. `MessageComposer` or `PromptInput`). */
  composer?: React.ReactNode;
  /** Header actions. */
  actions?: React.ReactNode;
  /** Hide the members rail. */
  hideMembers?: boolean;
}

/** Multi-agent group chat: speaker-attributed transcript, round / turn indicator, hold state, mentions and typing indicators. */
export const AgentRoom = React.forwardRef<HTMLDivElement, AgentRoomProps>(
  (
    { members, messages, title = "Agent room", round, turnOrder, currentSpeakerId, composer, actions, hideMembers, className, ...props },
    ref
  ) => {
    const byId = React.useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
    const order = (turnOrder ?? members.filter((m) => m.kind === "agent").map((m) => m.id)).filter((id) => byId.has(id));
    const currentIdx = currentSpeakerId ? order.indexOf(currentSpeakerId) : -1;
    const current = currentSpeakerId ? byId.get(currentSpeakerId) : undefined;
    const active = members.filter((m) => m.status === "typing" || m.status === "thinking");
    const logRef = React.useRef<HTMLDivElement>(null);
    const titleId = React.useId();

    React.useEffect(() => {
      const el = logRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }, [messages.length]);

    return (
      <div
        ref={ref}
        data-slot="agent-room"
        role="region"
        aria-labelledby={titleId}
        className={cn("flex min-h-0 flex-col overflow-hidden rounded-box border border-border bg-card shadow-xs", className)}
        {...props}
      >
        <div className="flex flex-col gap-2 border-b border-border px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <h2 id={titleId} className="text-sm font-semibold text-foreground">
              {title}
            </h2>
            {actions}
          </div>
          {(round != null || current) && (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-medium text-muted-foreground" data-slot="agent-room-turn" aria-live="polite">
                {round != null && <>Round {round}</>}
                {round != null && current && " · "}
                {current && (
                  <span className="text-foreground">
                    {current.kind === "human" ? "Your turn" : `${current.name}'s turn`}
                  </span>
                )}
              </p>
              {order.length > 0 && (
                <ol aria-label="Turn order" className="flex flex-wrap items-center gap-1">
                  {order.map((id, i) => {
                    const m = byId.get(id)!;
                    const state = currentIdx < 0 ? "upcoming" : i < currentIdx ? "done" : i === currentIdx ? "current" : "upcoming";
                    return (
                      <li
                        key={id}
                        data-state={state}
                        aria-current={state === "current" ? "step" : undefined}
                        className={cn(
                          "inline-flex h-6 items-center gap-1 rounded-control border px-1.5 text-2xs font-medium",
                          state === "current" && "border-primary bg-primary-soft text-primary-soft-foreground",
                          state === "done" && "border-transparent bg-muted text-muted-foreground line-through decoration-muted-foreground/40",
                          state === "upcoming" && "border-border text-muted-foreground",
                          m.muted && "opacity-50"
                        )}
                      >
                        <span className="tabular-nums opacity-60">{i + 1}</span>
                        {m.name}
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          )}
        </div>
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <div className="flex min-h-0 flex-1 flex-col">
            <div
              ref={logRef}
              role="log"
              aria-label="Transcript"
              aria-live="polite"
              className="scrollbar-thin flex min-h-48 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
            >
              {messages.map((msg, i) => {
                const author = byId.get(msg.authorId);
                if (msg.kind === "system") {
                  return (
                    <p key={msg.id} className="self-center rounded-full bg-muted px-2.5 py-0.5 text-2xs font-medium text-muted-foreground">
                      {msg.text}
                    </p>
                  );
                }
                if (msg.kind === "notice" && msg.notice) {
                  return <AgentMessageNotice key={msg.id} {...msg.notice} />;
                }
                const human = author?.kind === "human";
                const prev = messages[i - 1];
                const grouped = prev && prev.authorId === msg.authorId && (prev.kind ?? "message") === "message";
                const color = author ? memberColor(author) : undefined;
                return (
                  <div
                    key={msg.id}
                    data-author={msg.authorId}
                    data-kind={human ? "human" : "agent"}
                    className={cn("flex max-w-[85%] gap-2.5", human ? "flex-row-reverse self-end" : "self-start", grouped && "-mt-1.5")}
                  >
                    <span className={cn("mt-0.5 shrink-0", grouped && "invisible")}>
                      {author ? <MemberAvatar member={author} /> : null}
                    </span>
                    <div className={cn("flex min-w-0 flex-col gap-0.5", human && "items-end")}>
                      {!grouped && (
                        <span className="text-xs font-semibold" style={color ? { color } : undefined}>
                          {author?.name ?? "Unknown"}
                          {author?.role && <span className="ml-1.5 font-normal text-muted-foreground">{author.role}</span>}
                        </span>
                      )}
                      <div
                        className={cn(
                          "whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm",
                          human ? "rounded-tr-md bg-primary text-primary-foreground" : "rounded-tl-md border border-border bg-background text-foreground"
                        )}
                      >
                        {parseAgentMentions(msg.text ?? "", members).map((part, k) =>
                          typeof part === "string" ? (
                            <React.Fragment key={k}>{part}</React.Fragment>
                          ) : (
                            <span
                              key={k}
                              data-mention={part.mention.id}
                              className={cn(
                                "rounded px-0.5 font-medium",
                                human ? "bg-primary-foreground/20" : "bg-primary-soft text-primary-soft-foreground"
                              )}
                            >
                              {part.text}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {active.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 pb-2 text-xs text-muted-foreground" aria-live="polite">
                {active.map((m) => (
                  <span key={m.id} data-indicator={m.id} className="inline-flex items-center gap-1.5">
                    <ThinkingDots />
                    <span style={{ color: memberColor(m) }} className="font-medium">
                      {m.name}
                    </span>{" "}
                    {m.status === "thinking" ? "is thinking…" : "is typing…"}
                  </span>
                ))}
              </div>
            )}
            {composer && <div className="border-t border-border p-3">{composer}</div>}
          </div>
          {!hideMembers && (
            <aside aria-label="Members" className="border-t border-border p-3 md:w-56 md:shrink-0 md:border-l md:border-t-0">
              <ul className="flex flex-col gap-2">
                {members.map((m) => (
                  <li key={m.id} data-member={m.id} data-status={m.status ?? "idle"} className="flex items-start gap-2">
                    <MemberAvatar member={m} size="xs" />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1 truncate text-xs font-medium text-foreground">
                        {m.name}
                        {m.kind === "human" && <span className="font-normal text-muted-foreground">(you)</span>}
                        {m.muted && <RiVolumeMuteLine aria-label="Muted" className="size-3 text-muted-foreground" />}
                      </p>
                      <p
                        className={cn(
                          "truncate text-2xs",
                          m.status === "holding" ? "text-warning" : m.id === currentSpeakerId ? "text-primary" : "text-muted-foreground"
                        )}
                      >
                        {m.status === "holding"
                          ? (m.holdReason ?? "Holding — waiting to be mentioned")
                          : m.status === "thinking"
                            ? "Thinking…"
                            : m.status === "typing"
                              ? "Typing…"
                              : m.id === currentSpeakerId || m.status === "speaking"
                                ? "Speaking"
                                : (m.role ?? "Idle")}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </div>
      </div>
    );
  }
);
AgentRoom.displayName = "AgentRoom";

/* ------------------------------------------------------------------ */
/* AgentRoomMembers                                                    */
/* ------------------------------------------------------------------ */

export interface AgentRoomMembersProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue"> {
  /** Members in turn order. */
  value?: AgentRoomMember[];
  defaultValue?: AgentRoomMember[];
  onValueChange?: (members: AgentRoomMember[]) => void;
  /** Agents that can be added. Ones already in the room are hidden. */
  available?: AgentRoomMember[];
}

/** Room member manager: add / remove agents, reorder the turn order (buttons or Alt+Arrow) and mute. */
export const AgentRoomMembers = React.forwardRef<HTMLDivElement, AgentRoomMembersProps>(
  ({ value, defaultValue = [], onValueChange, available = [], className, ...props }, ref) => {
    const [members, setMembers] = useControllableState<AgentRoomMember[]>({ value, defaultValue, onChange: onValueChange });
    const rowRefs = React.useRef(new Map<string, HTMLLIElement>());
    const addable = available.filter((a) => !members.some((m) => m.id === a.id));

    const move = (i: number, d: -1 | 1) => {
      const j = i + d;
      if (j < 0 || j >= members.length) return;
      const next = [...members];
      [next[i], next[j]] = [next[j]!, next[i]!];
      setMembers(next);
      const id = next[j]!.id;
      requestAnimationFrame(() => rowRefs.current.get(id)?.focus());
    };

    return (
      <div ref={ref} data-slot="agent-room-members" className={cn("flex flex-col gap-3", className)} {...props}>
        <ol aria-label="Turn order" className="flex flex-col divide-y divide-border overflow-hidden rounded-box border border-border bg-card">
          {members.map((m, i) => (
            <li
              key={m.id}
              ref={(el) => {
                if (el) rowRefs.current.set(m.id, el);
                else rowRefs.current.delete(m.id);
              }}
              tabIndex={-1}
              aria-label={`${i + 1}. ${m.name}`}
              data-member={m.id}
              onKeyDown={(e) => {
                if (e.altKey && e.key === "ArrowUp") {
                  e.preventDefault();
                  move(i, -1);
                } else if (e.altKey && e.key === "ArrowDown") {
                  e.preventDefault();
                  move(i, 1);
                }
              }}
              className={cn("flex items-center gap-2 px-3 py-2 outline-none focus-visible:bg-accent", m.muted && "opacity-60")}
            >
              <span className="w-4 text-center text-2xs tabular-nums text-muted-foreground">{i + 1}</span>
              <MemberAvatar member={m} size="xs" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{m.name}</p>
                {m.role && <p className="truncate text-xs text-muted-foreground">{m.role}</p>}
              </div>
              <Button variant="ghost" size="icon-xs" aria-label={`Move ${m.name} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                <RiArrowUpLine aria-hidden />
              </Button>
              <Button variant="ghost" size="icon-xs" aria-label={`Move ${m.name} down`} disabled={i === members.length - 1} onClick={() => move(i, 1)}>
                <RiArrowDownLine aria-hidden />
              </Button>
              {m.kind === "agent" && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Mute ${m.name}`}
                  aria-pressed={Boolean(m.muted)}
                  onClick={() => setMembers(members.map((x) => (x.id === m.id ? { ...x, muted: !x.muted } : x)))}
                >
                  {m.muted ? <RiVolumeMuteLine aria-hidden /> : <RiVolumeUpLine aria-hidden />}
                </Button>
              )}
              {m.kind === "agent" && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Remove ${m.name}`}
                  onClick={() => setMembers(members.filter((x) => x.id !== m.id))}
                >
                  <RiCloseLine aria-hidden />
                </Button>
              )}
            </li>
          ))}
        </ol>
        {addable.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Add:</span>
            {addable.map((a) => (
              <Button
                key={a.id}
                size="xs"
                variant="outline"
                leadingIcon={<RiAddLine aria-hidden />}
                aria-label={`Add ${a.name}`}
                onClick={() => setMembers([...members, a])}
              >
                {a.name}
              </Button>
            ))}
          </div>
        )}
      </div>
    );
  }
);
AgentRoomMembers.displayName = "AgentRoomMembers";
