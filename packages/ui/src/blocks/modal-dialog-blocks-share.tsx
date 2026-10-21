/** ShareDialog: per-person roles, general access, link role and expiry. */
import * as React from "react";
import {
  RiArrowDownSLine,
  RiBuilding2Line,
  RiGlobalLine,
  RiLockLine,
  RiLogoutBoxRLine,
  RiTimeLine,
  RiUserMinusLine,
} from "@remixicon/react";
import { cn } from "../lib/cn";
import { toneClasses } from "../lib/tone";
import { useControllableState } from "../hooks/use-controllable-state";
import { pluralize } from "../lib/format";
import { CopyButton } from "../primitives/copy-button";
import { Button } from "../primitives/button";
import { Avatar } from "../primitives/avatar";
import { Input } from "../primitives/input";
import { SimpleSelect, type SelectOption } from "../primitives/select";
import { DatePicker } from "../primitives/date-picker";
import { SwitchField } from "../primitives/switch";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../primitives/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../primitives/dropdown-menu";
import { useBlockAction } from "./block-utils";
import { isEmail } from "../lib/validate";
import { useFollowListProp } from "../hooks/use-follow-list-prop";
import { type BlockDialogBaseProps, useDialogOpen } from "./modal-dialog-blocks-internal";
import type { DialogMember } from "./modal-dialog-blocks-invite";

/* ------------------------------------------------------------------ */
/* ShareDialog                                                         */
/* ------------------------------------------------------------------ */

export type ShareAccess = "restricted" | "workspace" | "link";
/** Per-person role. Owners can't be changed or removed. */
export type ShareRole = "owner" | "editor" | "commenter" | "viewer";
/** Role granted by an invite or by the public link. */
export type ShareLinkRole = Exclude<ShareRole, "owner">;
/** Link lifetime: a preset counted from now, or a custom date. */
export type ShareLinkExpiry = "never" | "1h" | "1d" | "7d" | "30d" | "custom";

export interface ShareDialogProps extends BlockDialogBaseProps {
  /** Name of the shared item, shown in the title ("Share “Q4 plan”"). Without it the title is "Share". */
  itemName?: string;
  /** The link the "Copy link" button copies. Without it the button is hidden. */
  link?: string;
  /** Controlled who can open the item: `restricted` (invited people), `workspace` or `link` (anyone with the link). Use with `onAccessChange`. */
  access?: ShareAccess;
  /**
   * Initial access when uncontrolled.
   * @default "link"
   */
  defaultAccess?: ShareAccess;
  /** Called with the new access level. */
  onAccessChange?: (access: ShareAccess) => void;
  /**
   * Controlled people list when paired with `onPeopleChange`. Passed alone it only seeds the
   * list (deprecated: use `defaultPeople` for that).
   */
  people?: DialogMember[];
  /** Initial people list when uncontrolled. */
  defaultPeople?: DialogMember[];
  /** Called with the full people list after a role change or removal. */
  onPeopleChange?: (people: DialogMember[]) => void;
  /** Called when someone is invited, with the role picked next to the email field. */
  onInvite?: (email: string, role: ShareLinkRole) => unknown;
  /** Id (in `people`) of the signed-in person: their row says "(you)" and offers "Leave" unless they own the item. */
  currentUserId?: string;
  /** Called with the person id and the new role when a role is changed. */
  onRoleChange?: (personId: string, role: ShareRole) => void;
  /** Called with the person id when they are removed. */
  onRemovePerson?: (personId: string) => void;
  /** Called when the current user chooses "Leave". */
  onLeave?: () => void;
  /** Role preselected for invites. Default "editor". */
  defaultInviteRole?: ShareLinkRole;
  /** Workspace name for the "Anyone at …" access option. Pass "" to hide that option. */
  workspaceName?: string;
  /** Controlled role granted by the link (`editor`, `commenter` or `viewer`). Use with `onLinkRoleChange`. */
  linkRole?: ShareLinkRole;
  /**
   * Initial link role when uncontrolled.
   * @default "viewer"
   */
  defaultLinkRole?: ShareLinkRole;
  /** Called with the new link role. */
  onLinkRoleChange?: (role: ShareLinkRole) => void;
  /** Controlled link expiry: `never`, `1h`, `1d`, `7d`, `30d` or `custom`. */
  expiry?: ShareLinkExpiry;
  /**
   * Initial link expiry when uncontrolled.
   * @default "7d"
   */
  defaultExpiry?: ShareLinkExpiry;
  /** `expiresAt` is null for "never". */
  onExpiryChange?: (expiry: ShareLinkExpiry, expiresAt: Date | null) => void;
  /** Expiry date for a controlled `custom` expiry (or to show an existing deadline). */
  expiresAt?: Date | null;
  /** Show the "Allow comments on public link" switch for public links. Default true. */
  showAllowComments?: boolean;
  /** Controlled state of the "Allow comments on public link" switch. */
  allowComments?: boolean;
  /**
   * Initial state of the comments switch when uncontrolled.
   * @default false
   */
  defaultAllowComments?: boolean;
  /** Called with the new state of the comments switch. */
  onAllowCommentsChange?: (allow: boolean) => void;
  /** Called with the link after the user copies it. */
  onCopyLink?: (link: string) => void;
}

const shareRoles: Array<{ value: ShareRole; label: string; description: string }> = [
  { value: "owner", label: "Owner", description: "Full control, including deleting and transferring" },
  { value: "editor", label: "Editor", description: "Can make any changes and share" },
  { value: "commenter", label: "Commenter", description: "Can view, comment and suggest" },
  { value: "viewer", label: "Viewer", description: "Can view only" },
];

const assignableRoles = shareRoles.filter((r) => r.value !== "owner");

const linkRoleOptions: SelectOption[] = [
  { value: "viewer", label: "Can view" },
  { value: "commenter", label: "Can comment" },
  { value: "editor", label: "Can edit" },
];

/** Older role values (`edit`, `comment`, `view`…) still map onto the new roles. */
const legacyRoles: Record<string, ShareRole> = {
  edit: "editor",
  comment: "commenter",
  view: "viewer",
  admin: "editor",
  member: "editor",
};

function normalizeRole(member: DialogMember): ShareRole {
  if (member.owner) return "owner";
  const r = member.role as ShareRole;
  if (shareRoles.some((x) => x.value === r)) return r;
  return legacyRoles[member.role] ?? "viewer";
}

const expiryOptions: Array<SelectOption & { value: ShareLinkExpiry; hours?: number }> = [
  { value: "never", label: "Never expires" },
  { value: "1h", label: "1 hour", hours: 1 },
  { value: "1d", label: "1 day", hours: 24 },
  { value: "7d", label: "7 days", hours: 24 * 7 },
  { value: "30d", label: "30 days", hours: 24 * 30 },
  { value: "custom", label: "Custom date…" },
];

function expiryDate(expiry: ShareLinkExpiry, custom: Date | null | undefined): Date | null {
  if (expiry === "never") return null;
  if (expiry === "custom") return custom ?? null;
  const hours = expiryOptions.find((o) => o.value === expiry)?.hours ?? 0;
  return new Date(Date.now() + hours * 3_600_000);
}

/** "in 3 hours", "in 7 days", "Expired". */
function formatExpiresIn(date: Date) {
  const ms = date.getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const minutes = Math.round(ms / 60_000);
  const plural = (n: number, unit: string) => `${n} ${pluralize(n, unit)}`;
  if (minutes < 60) return `Expires in ${plural(Math.max(1, minutes), "minute")}`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Expires in ${plural(hours, "hour")}`;
  return `Expires in ${plural(Math.round(hours / 24), "day")}`;
}

function accessMetaFor(access: ShareAccess, workspaceName: string) {
  switch (access) {
    case "restricted":
      return { icon: <RiLockLine aria-hidden />, description: "Only people with access can open this link.", tone: toneClasses.soft.neutral };
    case "workspace":
      return { icon: <RiBuilding2Line aria-hidden />, description: `Anyone in ${workspaceName || "the workspace"} can find and open.`, tone: toneClasses.soft.info };
    default:
      return { icon: <RiGlobalLine aria-hidden />, description: "Anyone on the internet with the link can open.", tone: toneClasses.soft.success };
  }
}

function SharePersonRole({
  person,
  role,
  isSelf,
  onRoleChange,
  onRemove,
  onLeave,
}: {
  person: DialogMember;
  role: ShareRole;
  isSelf: boolean;
  onRoleChange: (role: ShareRole) => void;
  onRemove: () => void;
  onLeave: () => void;
}) {
  const label = shareRoles.find((r) => r.value === role)?.label ?? role;
  if (role === "owner") return <span className="px-2 text-sm text-muted-foreground">Owner</span>;
  if (isSelf) {
    return (
      <span className="flex items-center gap-1">
        <span className="px-2 text-sm text-muted-foreground">{label}</span>
        <Button variant="ghost" size="sm" leadingIcon={<RiLogoutBoxRLine className="rtl:-scale-x-100" aria-hidden />} onClick={onLeave}>
          Leave
        </Button>
      </span>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" trailingIcon={<RiArrowDownSLine aria-hidden />} aria-label={`Role for ${person.name}: ${label}`} className="text-muted-foreground">
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuRadioGroup value={role} onValueChange={(v) => onRoleChange(v as ShareRole)}>
          {assignableRoles.map((r) => (
            <DropdownMenuRadioItem key={r.value} value={r.value}>
              <span className="flex flex-col">
                <span>{r.label}</span>
                <span className="text-xs text-muted-foreground">{r.description}</span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" icon={<RiUserMinusLine aria-hidden />} onSelect={onRemove}>
          Remove access
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Share an item: invite with a role, per-person roles, general access, link role + expiry, and copy link. */
export function ShareDialog({
  itemName,
  link,
  access,
  defaultAccess = "link",
  onAccessChange,
  people: peopleProp,
  defaultPeople: defaultPeopleProp,
  onPeopleChange,
  onInvite,
  currentUserId,
  onRoleChange,
  onRemovePerson,
  onLeave,
  defaultInviteRole = "editor",
  workspaceName = "Northwind Studio",
  linkRole: linkRoleProp,
  defaultLinkRole = "viewer",
  onLinkRoleChange,
  expiry: expiryProp,
  defaultExpiry = "7d",
  onExpiryChange,
  expiresAt: expiresAtProp,
  showAllowComments = true,
  allowComments: allowCommentsProp,
  defaultAllowComments = false,
  onAllowCommentsChange,
  onCopyLink,
  trigger,
  className,
  ...openProps
}: ShareDialogProps) {
  const [open, setOpen] = useDialogOpen(openProps);
  const [general, setGeneral] = useControllableState<ShareAccess>({
    value: access,
    defaultValue: defaultAccess,
    onChange: onAccessChange,
  });
  const [people, setPeople] = useControllableState<DialogMember[]>({
    value: peopleProp && onPeopleChange ? peopleProp : undefined,
    defaultValue: defaultPeopleProp ?? peopleProp ?? [],
    onChange: onPeopleChange,
  });
  useFollowListProp(peopleProp, setPeople, !onPeopleChange);
  const [linkRole, setLinkRole] = useControllableState<ShareLinkRole>({
    value: linkRoleProp,
    defaultValue: defaultLinkRole,
    onChange: onLinkRoleChange,
  });
  const [expiry, setExpiryState] = React.useState<ShareLinkExpiry>(expiryProp ?? defaultExpiry);
  const currentExpiry = expiryProp ?? expiry;
  const [expiresAtState, setExpiresAt] = React.useState<Date | null>(() =>
    expiresAtProp !== undefined ? expiresAtProp : expiryDate(expiryProp ?? defaultExpiry, null)
  );
  const expiresAt = expiresAtProp !== undefined ? expiresAtProp : expiresAtState;
  const [allowComments, setAllowComments] = useControllableState<boolean>({
    value: allowCommentsProp,
    defaultValue: defaultAllowComments,
    onChange: onAllowCommentsChange,
  });
  const [email, setEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<ShareLinkRole>(defaultInviteRole);
  const action = useBlockAction();
  const meta = accessMetaFor(general, workspaceName);
  const expiryId = React.useId();

  const accessOptions: SelectOption[] = [
    { value: "restricted", label: "Restricted" },
    ...(workspaceName ? [{ value: "workspace", label: `Anyone at ${workspaceName}` }] : []),
    { value: "link", label: "Anyone with the link" },
  ];

  const changeExpiry = (next: ShareLinkExpiry) => {
    const date = expiryDate(next, next === "custom" ? expiresAt : null);
    setExpiryState(next);
    setExpiresAt(date);
    onExpiryChange?.(next, date);
  };

  const changeCustomDate = (date: Date | undefined) => {
    const end = date ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59) : null;
    setExpiresAt(end);
    onExpiryChange?.("custom", end);
  };

  const changeRole = (id: string, role: ShareRole) => {
    setPeople((list) => list.map((p) => (p.id === id ? { ...p, role } : p)));
    onRoleChange?.(id, role);
  };

  const remove = (id: string) => {
    setPeople((list) => list.filter((p) => p.id !== id));
    onRemovePerson?.(id);
  };

  const leave = (id: string) => {
    setPeople((list) => list.filter((p) => p.id !== id));
    onLeave?.();
  };

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!isEmail(value)) return;
    const ok = await action.run(onInvite ? () => onInvite(value, inviteRole) : undefined);
    if (!ok) return;
    // The address is the id of an invited person, so inviting the same address twice does not add a second row.
    const id = `invite:${value.toLowerCase()}`;
    setPeople((list) =>
      list.some((p) => p.id === id || p.email.toLowerCase() === value.toLowerCase())
        ? list
        : [...list, { id, name: value.split("@")[0]!, email: value, role: inviteRole }]
    );
    setEmail("");
  };

  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent size="md" className={className}>
        <DialogHeader>
          <DialogTitle>{itemName ? `Share “${itemName}”` : "Share"}</DialogTitle>
          <DialogDescription className="sr-only">Manage who can access this item.</DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-6">
          <form onSubmit={invite} className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Add people by email"
              aria-label="Email address"
              wrapperClassName="flex-1"
              className="flex-1"
            />
            <div className="flex gap-2">
              <SimpleSelect
                aria-label="Invite role"
                value={inviteRole}
                onValueChange={(v) => setInviteRole(v as ShareLinkRole)}
                options={assignableRoles.map((r) => ({ value: r.value, label: r.label, description: r.description }))}
                className="flex-1 sm:w-32"
                contentClassName="w-64"
              />
              <Button type="submit" disabled={!isEmail(email)} loading={action.busy}>
                Invite
              </Button>
            </div>
          </form>

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-foreground">People with access</h3>
            <ul className="-mx-2 flex flex-col">
              {people.map((p) => {
                const isSelf = p.id === currentUserId;
                return (
                  <li key={p.id} className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent/50">
                    <Avatar name={p.name} src={p.avatarSrc} size="sm" />
                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="truncate text-sm font-medium text-foreground">
                        {p.name}
                        {isSelf ? <span className="font-normal text-muted-foreground"> (you)</span> : null}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">{p.email}</div>
                    </div>
                    <SharePersonRole
                      person={p}
                      role={normalizeRole(p)}
                      isSelf={isSelf}
                      onRoleChange={(role) => changeRole(p.id, role)}
                      onRemove={() => remove(p.id)}
                      onLeave={() => leave(p.id)}
                    />
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-medium text-foreground">General access</h3>
            <div className="flex items-start gap-3">
              <span className={cn("mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full [&_svg]:size-[18px]", meta.tone)}>
                {meta.icon}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <SimpleSelect
                    aria-label="General access"
                    size="sm"
                    value={general}
                    onValueChange={(v) => setGeneral(v as ShareAccess)}
                    className="w-fit min-w-44 border-transparent px-2 font-medium shadow-none hover:bg-accent"
                    options={accessOptions}
                  />
                  {general !== "restricted" && (
                    <SimpleSelect
                      aria-label="Link permission"
                      size="sm"
                      value={linkRole}
                      onValueChange={(v) => setLinkRole(v as ShareLinkRole)}
                      className="w-fit min-w-32 border-transparent px-2 text-muted-foreground shadow-none hover:bg-accent"
                      options={linkRoleOptions}
                    />
                  )}
                </div>
                <p className="px-2 text-xs text-muted-foreground">{meta.description}</p>
              </div>
            </div>

            {general === "link" && (
              <div className="flex flex-col gap-3 rounded-box border border-border bg-subtle/60 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <span id={expiryId} className="flex items-center gap-2 text-sm font-medium text-foreground sm:w-28">
                    <RiTimeLine aria-hidden className="size-4 text-muted-foreground" />
                    Link expiry
                  </span>
                  <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                    <SimpleSelect
                      aria-labelledby={expiryId}
                      size="sm"
                      value={currentExpiry}
                      onValueChange={(v) => changeExpiry(v as ShareLinkExpiry)}
                      options={expiryOptions.map(({ value, label }) => ({ value, label }))}
                      className="sm:w-40"
                    />
                    {currentExpiry === "custom" && (
                      <DatePicker
                        aria-label="Expiry date"
                        size="sm"
                        value={expiresAt ?? undefined}
                        onValueChange={changeCustomDate}
                        disabledDates={{ before: today }}
                        placeholder="Pick a date"
                        className="sm:w-44"
                      />
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground" data-slot="share-expiry-summary">
                  {currentExpiry === "never" || !expiresAt
                    ? currentExpiry === "custom"
                      ? "Pick the last day the link should work."
                      : "This link never expires. It works until you turn off link sharing."
                    : `${formatExpiresIn(expiresAt)} · ${expiresAt.toLocaleDateString(undefined, { dateStyle: "medium" })}`}
                </p>
                {showAllowComments && (
                  <SwitchField
                    size="sm"
                    label="Allow comments on public link"
                    description="Visitors can leave comments without an account."
                    checked={allowComments}
                    onCheckedChange={setAllowComments}
                  />
                )}
              </div>
            )}
          </section>
        </DialogBody>
        <DialogFooter bordered className="sm:justify-between">
          {link ? <CopyButton variant="button" size="md" value={link} label="Copy link" onClick={() => onCopyLink?.(link)} /> : null}
          <DialogClose asChild>
            <Button className="ms-auto">Done</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
ShareDialog.displayName = "ShareDialog";
