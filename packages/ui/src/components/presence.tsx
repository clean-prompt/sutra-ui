import * as React from "react";
import { RiLoader4Line, RiWifiOffLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { formatList, pluralize } from "../lib/format";
import { colorForSeed } from "../lib/hash";
import { toneClasses, type Tone } from "../lib/tone";
import { Avatar, type AvatarSize } from "./avatar";
import { SimpleTooltip } from "./tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

/* ------------------------------------------------------------------ */
/* Shared                                                              */
/* ------------------------------------------------------------------ */

export type PresenceStatus = "active" | "idle";

export interface PresenceUser {
  id: string;
  name: string;
  avatarSrc?: string;
  /** Cursor/ring color; derived from `id` when omitted. */
  color?: string;
  status?: PresenceStatus;
  /** Extra line in the overflow list (e.g. "Editing · Section 2"). */
  detail?: React.ReactNode;
}

/** Deterministic collaborator color for an id (stable across sessions and clients). */
export function getPresenceColor(id: string) {
  return colorForSeed(id);
}

const statusTone: Record<PresenceStatus, Tone> = { active: "success", idle: "warning" };
const statusDot = (status: PresenceStatus) => toneClasses.dot[statusTone[status]];

const statusText: Record<PresenceStatus, string> = { active: "Active", idle: "Idle" };

/* ------------------------------------------------------------------ */
/* PresenceAvatars                                                     */
/* ------------------------------------------------------------------ */

export interface PresenceAvatarsProps extends React.HTMLAttributes<HTMLDivElement> {
  users: PresenceUser[];
  /** Avatars shown before the "+N" overflow. Default 4. */
  max?: number;
  /** Avatar size. Defaults to "sm" (not "md"): presence stacks sit in dense toolbars. */
  size?: Extract<AvatarSize, "xs" | "sm" | "md">;
  /** Show the active/idle dot. Default true. */
  showStatus?: boolean;
  /** Mark the current user ("(you)") in tooltips and the list. */
  currentUserId?: string;
  onUserClick?: (user: PresenceUser) => void;
}

const overflowSize: Record<"xs" | "sm" | "md", string> = {
  xs: "size-7 text-[10px]",
  sm: "size-9 text-xs",
  md: "size-11 text-sm",
};

function PresenceFace({
  user,
  size,
  showStatus,
}: {
  user: PresenceUser;
  size: "xs" | "sm" | "md";
  showStatus: boolean;
}) {
  const color = user.color ?? getPresenceColor(user.id);
  return (
    <span
      data-slot="presence-avatar"
      className="relative inline-flex rounded-full p-0.5 ring-2 ring-background"
      style={{ backgroundColor: color, opacity: user.status === "idle" ? 0.7 : undefined }}
    >
      <Avatar name={user.name} src={user.avatarSrc} size={size} ring={false} frameClassName="ring-2 ring-background" />
      {showStatus && user.status ? (
        <span
          aria-hidden
          className={cn("absolute bottom-0 right-0 block size-2.5 rounded-full ring-2 ring-background", statusDot(user.status))}
        />
      ) : null}
    </span>
  );
}

/** Live collaborator stack: colored rings, status dots, tooltips and a "+N" popover listing everyone. */
export const PresenceAvatars = React.forwardRef<HTMLDivElement, PresenceAvatarsProps>(
  ({ users, max = 4, size = "sm", showStatus = true, currentUserId, onUserClick, className, ...props }, ref) => {
    const visible = users.slice(0, Math.max(0, max));
    const hidden = users.length - visible.length;
    const nameOf = (u: PresenceUser) => (u.id === currentUserId ? `${u.name} (you)` : u.name);
    const tooltipFor = (u: PresenceUser) => (u.status ? `${nameOf(u)} · ${statusText[u.status]}` : nameOf(u));

    return (
      <div
        ref={ref}
        role="group"
        aria-label={`${users.length} ${pluralize(users.length, "person", "people")} here`}
        data-slot="presence-avatars"
        className={cn("flex items-center -space-x-1.5", className)}
        {...props}
      >
        {visible.map((u) => (
          <SimpleTooltip key={u.id} content={tooltipFor(u)}>
            {onUserClick ? (
              <button
                type="button"
                onClick={() => onUserClick(u)}
                aria-label={tooltipFor(u)}
                className={cn("relative rounded-full transition-transform hover:z-10 hover:-translate-y-0.5", focusRing)}
              >
                <PresenceFace user={u} size={size} showStatus={showStatus} />
              </button>
            ) : (
              <span className="relative inline-flex rounded-full transition-transform hover:z-10 hover:-translate-y-0.5">
                <PresenceFace user={u} size={size} showStatus={showStatus} />
              </span>
            )}
          </SimpleTooltip>
        ))}
        {hidden > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={`Show all ${users.length} people`}
                className={cn(
                  "relative z-[1] inline-flex shrink-0 items-center justify-center rounded-full bg-muted font-semibold tabular-nums text-muted-foreground ring-2 ring-background transition-colors hover:bg-accent hover:text-foreground",
                  overflowSize[size],
                  focusRing
                )}
              >
                +{hidden > 99 ? 99 : hidden}
              </button>
            </PopoverTrigger>
            <PopoverContent size="sm" padded={false} align="end" className="p-1.5">
              <p className="px-2 pb-1 pt-1.5 text-xs font-medium text-muted-foreground">{users.length} people here</p>
              <ul className="max-h-72 overflow-y-auto scrollbar-thin" aria-label="Everyone here">
                {users.map((u) => (
                  <li key={u.id} className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
                    <span
                      className="inline-flex rounded-full p-0.5"
                      style={{ backgroundColor: u.color ?? getPresenceColor(u.id) }}
                    >
                      <Avatar name={u.name} src={u.avatarSrc} size="xs" frameClassName="ring-2 ring-popover" />
                    </span>
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate text-sm font-medium text-foreground">{nameOf(u)}</span>
                      {u.detail ? <span className="block truncate text-xs text-muted-foreground">{u.detail}</span> : null}
                    </span>
                    {u.status ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span aria-hidden className={cn("size-2 rounded-full", statusDot(u.status))} />
                        {statusText[u.status]}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        )}
      </div>
    );
  }
);
PresenceAvatars.displayName = "PresenceAvatars";

/* ------------------------------------------------------------------ */
/* PresenceIndicator                                                   */
/* ------------------------------------------------------------------ */

export type PresenceConnection = "live" | "offline" | "reconnecting" | "connecting";

export interface PresenceIndicatorProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: PresenceConnection;
  /** Override the label for the current status. */
  label?: React.ReactNode;
  /** Local changes waiting to sync (shown when offline/reconnecting). */
  pending?: number;
}

const connectionLabel: Record<PresenceConnection, string> = {
  live: "Live",
  offline: "Offline · changes saved locally",
  reconnecting: "Reconnecting…",
  connecting: "Connecting…",
};

const connectionTone: Record<PresenceConnection, string> = {
  live: cn(toneClasses.soft.success, "border-success/25"),
  offline: cn(toneClasses.soft.neutral, "border-border"),
  reconnecting: cn(toneClasses.soft.warning, "border-warning/30"),
  connecting: cn(toneClasses.soft.neutral, "border-border"),
};

/** Connection-mode chip for collaborative editors: pulsing "Live", "Offline · saved locally", "Reconnecting…". */
export const PresenceIndicator = React.forwardRef<HTMLSpanElement, PresenceIndicatorProps>(
  ({ status, label, pending, className, ...props }, ref) => (
    <span
      ref={ref}
      role="status"
      aria-live="polite"
      data-status={status}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-control border px-2.5 text-xs font-medium",
        connectionTone[status],
        className
      )}
      {...props}
    >
      {status === "live" ? (
        <span aria-hidden className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />
          <span className="relative inline-flex size-2 rounded-full bg-success" />
        </span>
      ) : status === "offline" ? (
        <RiWifiOffLine aria-hidden className="size-3.5" />
      ) : (
        <RiLoader4Line aria-hidden className="size-3.5 animate-spin motion-reduce:animate-none" />
      )}
      <span>{label ?? connectionLabel[status]}</span>
      {pending && status !== "live" ? (
        <span className="tabular-nums opacity-80">
          · {pending} {pluralize(pending, "change")} pending
        </span>
      ) : null}
    </span>
  )
);
PresenceIndicator.displayName = "PresenceIndicator";

/* ------------------------------------------------------------------ */
/* RemoteCursor                                                        */
/* ------------------------------------------------------------------ */

export interface RemoteCursorProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "color"> {
  /** Position inside the nearest positioned ancestor (px number or any CSS length). */
  x: number | string;
  y: number | string;
  name: string;
  /** Defaults to a color derived from `id ?? name`. */
  color?: string;
  id?: string;
  /** `arrow` for canvases, `caret` for text editors. */
  variant?: "arrow" | "caret";
  /** Caret height in px. Default 20. */
  caretHeight?: number;
  /** Hide the name label after this many ms without movement. Default 3000; 0 keeps it. */
  idleTimeout?: number;
}

/** Colored pointer/caret with a name label for another collaborator; the label fades when idle. */
export const RemoteCursor = React.forwardRef<HTMLDivElement, RemoteCursorProps>(
  ({ x, y, name, color: colorProp, id, variant = "arrow", caretHeight = 20, idleTimeout = 3000, className, style, ...props }, ref) => {
    const color = colorProp ?? getPresenceColor(id ?? name);
    const [awake, setAwake] = React.useState(true);

    React.useEffect(() => {
      setAwake(true);
      if (!idleTimeout) return;
      const t = setTimeout(() => setAwake(false), idleTimeout);
      return () => clearTimeout(t);
    }, [x, y, idleTimeout]);

    const toCss = (v: number | string) => (typeof v === "number" ? `${v}px` : v);

    return (
      <div
        ref={ref}
        aria-hidden
        data-slot="remote-cursor"
        data-idle={!awake || undefined}
        className={cn("pointer-events-none absolute left-0 top-0 z-20 transition-[left,top] duration-100 ease-linear", className)}
        style={{ left: toCss(x), top: toCss(y), ...style }}
        {...props}
      >
        {variant === "arrow" ? (
          <svg width="18" height="20" viewBox="0 0 18 20" className="block drop-shadow-sm" style={{ color }}>
            <path d="M1.5 1.5 16 9.2l-6.6 1.7-3.1 6.6L1.5 1.5Z" fill="currentColor" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        ) : (
          <span className="block w-0.5 rounded-full" style={{ height: caretHeight, backgroundColor: color }} />
        )}
        <span
          className={cn(
            "absolute whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-semibold leading-tight text-white shadow-sm transition-opacity duration-500",
            variant === "arrow" ? "left-3.5 top-4" : "-top-5 left-0 rounded-bl-none",
            awake ? "opacity-100" : "opacity-0"
          )}
          style={{ backgroundColor: color }}
        >
          {name}
        </span>
      </div>
    );
  }
);
RemoteCursor.displayName = "RemoteCursor";

/* ------------------------------------------------------------------ */
/* TypingIndicator                                                     */
/* ------------------------------------------------------------------ */

export interface TypingIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  /** People currently typing: names or presence users. */
  users: Array<string | Pick<PresenceUser, "name">>;
  /** Names listed before "and N others". Default 2. */
  maxNames?: number;
  /** Hide the animated dots. */
  hideDots?: boolean;
}

/** British-English list style: "Aiko, Ben and Chen" (no serial comma). */
const typingList = { locale: "en-GB" } as const;

/** "Aiko is typing…" / "Aiko and Ben are typing…" / "Aiko, Ben and 3 others are typing…". */
export function formatTypingText(names: string[], maxNames = 2) {
  if (names.length === 0) return "";
  if (names.length === 1) return `${names[0]} is typing…`;
  if (names.length <= maxNames + 1 && names.length <= 3) return `${formatList(names, typingList)} are typing…`;
  const shown = names.slice(0, maxNames);
  const rest = names.length - shown.length;
  return `${formatList([...shown, `${rest} ${pluralize(rest, "other")}`], typingList)} are typing…`;
}

/** Polite live region announcing who is typing, with bouncing dots. */
export const TypingIndicator = React.forwardRef<HTMLDivElement, TypingIndicatorProps>(
  ({ users, maxNames = 2, hideDots, className, ...props }, ref) => {
    const names = users.map((u) => (typeof u === "string" ? u : u.name));
    const text = formatTypingText(names, maxNames);
    return (
      <div
        ref={ref}
        role="status"
        aria-live="polite"
        data-slot="typing-indicator"
        className={cn("inline-flex min-h-5 items-center gap-2 text-xs text-muted-foreground", className)}
        {...props}
      >
        {text && !hideDots ? (
          <span aria-hidden className="inline-flex items-center gap-0.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-1.5 rounded-full bg-current animate-dot-bounce motion-reduce:animate-none"
                style={{ animationDelay: `${i * 0.16}s` }}
              />
            ))}
          </span>
        ) : null}
        {text ? <span>{text}</span> : null}
      </div>
    );
  }
);
TypingIndicator.displayName = "TypingIndicator";
