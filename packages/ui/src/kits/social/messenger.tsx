/** Messenger: the MessengerHeader and GroupInfoPanel, plus re-exports of the message model, bubble, list and composer, one module per family. */
import * as React from "react";
import {
  RiArrowLeftSLine,
  RiInformationLine,
  RiLogoutBoxRLine,
  RiPhoneLine,
  RiUserAddLine,
  RiVideoOnLine,
} from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Avatar, type AvatarStatus } from "../../primitives/avatar";
import { AvatarGroup } from "../../primitives/avatar-group";
import { Button } from "../../primitives/button";
import { Switch } from "../../primitives/switch";
import { formatLastSeen } from "./messenger-model";

export * from "./messenger-model";
export * from "./messenger-bubble";
export * from "./messenger-list";
export * from "./messenger-composer";

/* ------------------------------------------------------------------ */
/* MessengerHeader                                                     */
/* ------------------------------------------------------------------ */

export interface MessengerHeaderMember {
  name: string;
  src?: string;
}

export interface MessengerHeaderProps extends React.HTMLAttributes<HTMLElement> {
  /** Conversation or contact name, shown as the title. */
  name: string;
  /** Avatar image URL for one-to-one chats; initials are shown when unset. */
  avatarSrc?: string;
  /** Group members: renders stacked avatars instead of a single one. */
  members?: MessengerHeaderMember[];
  /** `"online"`, a last-seen time, or any custom string. */
  presence?: "online" | Date | number | (string & {});
  /** Shows "typing…" in place of the presence line. */
  typing?: boolean;
  /** Called when the user presses the back button (small screens); the button is hidden when unset. */
  onBack?: () => void;
  /** Called when the user presses the voice call button; the button is hidden when unset. */
  onVoiceCall?: () => void;
  /** Called when the user presses the video call button; the button is hidden when unset. */
  onVideoCall?: () => void;
  /** Called when the user presses the info button; the button is hidden when unset. */
  onInfo?: () => void;
  /** Reference time for the last-seen label; set it in tests and SSR for stable output. */
  now?: Date;
}

/** Conversation header: avatar(s), name, presence or typing, call and info buttons. */
export const MessengerHeader = React.forwardRef<HTMLElement, MessengerHeaderProps>(
  ({ name, avatarSrc, members, presence, typing, onBack, onVoiceCall, onVideoCall, onInfo, now, className, children, ...props }, ref) => {
    const online = presence === "online";
    const subtitle = typing
      ? "typing…"
      : members && members.length > 0 && presence === undefined
        ? `${members.length} members`
        : online
          ? "online"
          : presence instanceof Date || typeof presence === "number"
            ? formatLastSeen(presence, now)
            : presence;
    const status: AvatarStatus | undefined = online ? "online" : undefined;

    return (
      <header ref={ref} className={cn("flex items-center gap-2 border-b border-border bg-background px-2 py-2", className)} data-slot="messenger-header" {...props}>
        {onBack ? (
          <Button variant="ghost" size="icon" aria-label="Back" onClick={onBack}>
            <RiArrowLeftSLine className="rtl:-scale-x-100" aria-hidden />
          </Button>
        ) : null}
        {members && members.length > 0 ? (
          <AvatarGroup size="sm" max={3}>
            {members.map((m) => (
              <Avatar key={m.name} name={m.name} src={m.src} />
            ))}
          </AvatarGroup>
        ) : (
          <Avatar size="md" name={name} src={avatarSrc} status={status} />
        )}
        <div className="min-w-0 flex-1 px-1">
          <p className="truncate text-sm font-semibold text-foreground">{name}</p>
          {subtitle ? (
            <p className={cn("truncate text-xs", typing || online ? "text-success" : "text-muted-foreground")}>{subtitle}</p>
          ) : null}
        </div>
        {children}
        {onVoiceCall ? (
          <Button variant="ghost" size="icon" aria-label="Voice call" onClick={onVoiceCall}>
            <RiPhoneLine aria-hidden />
          </Button>
        ) : null}
        {onVideoCall ? (
          <Button variant="ghost" size="icon" aria-label="Video call" onClick={onVideoCall}>
            <RiVideoOnLine aria-hidden />
          </Button>
        ) : null}
        {onInfo ? (
          <Button variant="ghost" size="icon" aria-label="Conversation info" onClick={onInfo}>
            <RiInformationLine aria-hidden />
          </Button>
        ) : null}
      </header>
    );
  }
);
MessengerHeader.displayName = "MessengerHeader";

/** Alias of `MessengerHeader`. @deprecated Use `MessengerHeader` (the AI `Chat*` components are a separate family). */
export const ChatHeader = MessengerHeader;
/** @deprecated Use `MessengerHeaderProps`. */
export type ChatHeaderProps = MessengerHeaderProps;
/** @deprecated Use `MessengerHeaderMember`. */
export type ChatHeaderMember = MessengerHeaderMember;

/* ------------------------------------------------------------------ */
/* GroupInfoPanel                                                      */
/* ------------------------------------------------------------------ */

export interface GroupMember {
  id: string;
  name: string;
  src?: string;
  /** e.g. "owner", "admin", "member". Non-member roles render a badge. */
  role?: string;
  status?: AvatarStatus;
  subtitle?: string;
}

export interface GroupMediaItem {
  id: string;
  src?: string;
  alt: string;
  /** Fallback content when there is no image (icon, file type…). */
  preview?: React.ReactNode;
}

export interface GroupInfoPanelProps extends React.HTMLAttributes<HTMLElement> {
  /** Group name, shown as the heading. */
  name: string;
  /** Group description under the name. */
  description?: React.ReactNode;
  /** Group avatar image URL. */
  avatarSrc?: string;
  /** Members to list, each with a name, role and presence. */
  members: GroupMember[];
  /** Id of the signed-in member; that row is marked "you". */
  currentUserId?: string;
  /** Shared media shown as a thumbnail grid. */
  media?: GroupMediaItem[];
  /** Called with the item when the user opens a thumbnail. */
  onMediaClick?: (item: GroupMediaItem) => void;
  /** Controlled state of the mute switch. */
  muted?: boolean;
  /** Initial mute state when `muted` is not controlled. */
  defaultMuted?: boolean;
  /** Called with the new state when the user flips the mute switch. */
  onMutedChange?: (muted: boolean) => void;
  /** Called when the user presses Add member; the button is hidden when unset. */
  onAddMember?: () => void;
  /** Called with the member when the user opens a member row. */
  onMemberClick?: (member: GroupMember) => void;
  /** Called when the user presses the leave button; the button is hidden when unset. */
  onLeave?: () => void;
  /** Label of the leave button. Default "Leave group". */
  leaveLabel?: string;
}

/** Side panel for a group chat: members with roles, shared media grid, mute and leave. */
export const GroupInfoPanel = React.forwardRef<HTMLElement, GroupInfoPanelProps>(
  (
    {
      name,
      description,
      avatarSrc,
      members,
      currentUserId,
      media,
      onMediaClick,
      muted: mutedProp,
      defaultMuted = false,
      onMutedChange,
      onAddMember,
      onMemberClick,
      onLeave,
      leaveLabel = "Leave group",
      className,
      ...props
    },
    ref
  ) => {
    const [muted, setMuted] = useControllableState({ value: mutedProp, defaultValue: defaultMuted, onChange: onMutedChange });
    const muteId = React.useId();
    const roleRank = (r?: string) => (r === "owner" ? 0 : r === "admin" ? 1 : 2);
    const sorted = [...members].sort((a, b) => roleRank(a.role) - roleRank(b.role) || a.name.localeCompare(b.name));

    return (
      <aside ref={ref} aria-label={`${name} info`} className={cn("flex w-full flex-col gap-5 bg-background p-4", className)} data-slot="group-info-panel" {...props}>
        <div className="flex flex-col items-center gap-2 text-center">
          <Avatar size="2xl" name={name} src={avatarSrc} shape="square" />
          <div>
            <h2 className="text-base font-semibold text-foreground">{name}</h2>
            <p className="text-xs text-muted-foreground">{members.length} members</p>
          </div>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>

        <div className="flex items-center justify-between rounded-box border border-border px-3 py-2.5">
          <label htmlFor={muteId} className="text-sm font-medium text-foreground">
            Mute notifications
          </label>
          <Switch id={muteId} size="sm" checked={muted} onCheckedChange={setMuted} />
        </div>

        {media && media.length > 0 ? (
          <section className="space-y-2">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Shared media</h3>
            <ul className="grid grid-cols-3 gap-1.5">
              {media.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    aria-label={m.alt}
                    onClick={() => onMediaClick?.(m)}
                    className={cn("flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground", focusRing)}
                  >
                    {m.src ? <img src={m.src} alt="" className="size-full object-cover" /> : m.preview}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="space-y-1">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Members</h3>
            {onAddMember ? (
              <Button variant="ghost" size="xs" leadingIcon={<RiUserAddLine aria-hidden />} onClick={onAddMember}>
                Add
              </Button>
            ) : null}
          </div>
          <ul className="-mx-2">
            {sorted.map((m) => {
              const body = (
                <>
                  <Avatar size="sm" name={m.name} src={m.src} status={m.status} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {m.name}
                      {m.id === currentUserId ? <span className="font-normal text-muted-foreground"> (you)</span> : null}
                    </span>
                    {m.subtitle ? <span className="block truncate text-xs text-muted-foreground">{m.subtitle}</span> : null}
                  </span>
                  {m.role && m.role !== "member" ? (
                    <span className="rounded-full bg-primary-soft px-2 py-0.5 text-2xs font-medium text-primary-soft-foreground capitalize">{m.role}</span>
                  ) : null}
                </>
              );
              return (
                <li key={m.id}>
                  {onMemberClick ? (
                    <button
                      type="button"
                      onClick={() => onMemberClick(m)}
                      className={cn("flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-start hover:bg-accent", focusRing)}
                    >
                      {body}
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 px-2 py-1.5">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {onLeave ? (
          <Button variant="destructive-soft" leadingIcon={<RiLogoutBoxRLine className="rtl:-scale-x-100" aria-hidden />} onClick={onLeave}>
            {leaveLabel}
          </Button>
        ) : null}
      </aside>
    );
  }
);
GroupInfoPanel.displayName = "GroupInfoPanel";
