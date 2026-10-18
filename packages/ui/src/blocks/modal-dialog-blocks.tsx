import * as React from "react";
import {
  RiArrowDownSLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiBuilding2Line,
  RiCheckLine,
  RiCheckboxCircleLine,
  RiDeleteBin6Line,
  RiErrorWarningLine,
  RiGlobalLine,
  RiHeartLine,
  RiKeyboardBoxLine,
  RiLinkM,
  RiLockLine,
  RiLogoutBoxRLine,
  RiSparkling2Line,
  RiStickyNoteLine,
  RiTimeLine,
  RiUserAddLine,
  RiUserMinusLine,
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { toneClasses } from "../lib/tone";
import { useControllableState } from "../hooks/use-controllable-state";
import { useCopy } from "../hooks/use-copy";
import { useAsyncAction as useSharedAsyncAction } from "../hooks/use-async-action";
import { pluralize } from "../lib/format";
import { CopyButton } from "../components/copy-button";
import { Button } from "../components/button";
import { Badge } from "../components/badge";
import { Avatar } from "../components/avatar";
import { Kbd } from "../components/typography";
import { ShortcutKeys, useShortcutRegistry } from "../components/shortcuts";
import { Input, SearchInput } from "../components/input";
import { Textarea } from "../components/textarea";
import { TagInput } from "../components/tag-input";
import { Field, FieldDescription, FieldLabel, FieldGroup, FieldError } from "../components/field";
import { SimpleSelect, type SelectOption } from "../components/select";
import { SegmentedControl } from "../components/segmented-control";
import { Rating } from "../components/rating";
import { DatePicker } from "../components/date-picker";
import { SwitchField } from "../components/switch";
import { CheckboxField } from "../components/checkbox";
import { Steps } from "../components/step-indicator";
import { InlineAlert } from "../components/inline-alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/dropdown-menu";
import { SutraAppIcon, sutraAppMeta, sutraApps, type SutraApp } from "../assets/brand";
import { FeaturedIcon } from "../assets/icons";
import { useBlockAction as useAsyncAction } from "./block-utils";
import { isEmail } from "../lib/validate";

/** Open-state props shared by the dialog blocks. */
export interface BlockDialogBaseProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Element that opens the dialog (rendered with `asChild`). */
  trigger?: React.ReactNode;
  className?: string;
}

function useDialogOpen({ open, defaultOpen = false, onOpenChange }: BlockDialogBaseProps) {
  return useControllableState<boolean>({ value: open, defaultValue: defaultOpen, onChange: onOpenChange });
}

/* ------------------------------------------------------------------ */
/* DeleteConfirmDialog                                                 */
/* ------------------------------------------------------------------ */

export interface DeleteConfirmDialogProps extends BlockDialogBaseProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Text the user must type to enable the delete button. Pass "" to skip. */
  confirmText?: string;
  confirmLabel?: React.ReactNode;
  /** Bullet points describing what will be lost. */
  consequences?: React.ReactNode[];
  onConfirm?: () => unknown;
}

/** Destructive confirmation with a featured warning icon and type-to-confirm input. */
export function DeleteConfirmDialog({
  title = "Delete workspace",
  description = "This will permanently delete the Northwind Studio workspace for everyone. This action cannot be undone.",
  confirmText = "northwind-studio",
  confirmLabel = "Delete workspace",
  consequences = ["12 projects and 348 tasks", "96 notes and their history", "2.4 GB of files"],
  onConfirm,
  trigger,
  className,
  ...openProps
}: DeleteConfirmDialogProps) {
  const [open, setOpen] = useDialogOpen(openProps);
  const [typed, setTyped] = React.useState("");
  const action = useAsyncAction();
  const matches = !confirmText || typed.trim() === confirmText;
  const inputId = React.useId();

  React.useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  const confirm = async () => {
    if (!matches) return;
    const ok = await action.run(onConfirm);
    if (ok) setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={(v) => !action.busy && setOpen(v)}>
      {trigger ? <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger> : null}
      <AlertDialogContent size="md" className={cn("sm:max-w-md", className)}>
        <div className="flex flex-col items-start gap-4 sm:flex-row">
          <FeaturedIcon icon={RiDeleteBin6Line} color="destructive" variant="outline-ring" size="md" />
          <div className="flex min-w-0 flex-col gap-1.5">
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </div>
        </div>
        {consequences.length > 0 && (
          <ul className="flex flex-col gap-1.5 rounded-box border border-destructive/20 bg-destructive-soft/40 px-4 py-3 text-sm text-foreground">
            {consequences.map((c, i) => (
              <li key={i} className="flex items-center gap-2">
                <RiErrorWarningLine aria-hidden className="size-4 shrink-0 text-destructive" />
                {c}
              </li>
            ))}
          </ul>
        )}
        {confirmText ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void confirm();
            }}
            className="flex flex-col gap-2"
          >
            <label htmlFor={inputId} className="text-sm text-muted-foreground">
              Type <span className="rounded-xs bg-muted px-1 py-0.5 font-mono text-[0.85em] font-medium text-foreground">{confirmText}</span>{" "}
              to confirm
            </label>
            <Input
              id={inputId}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder={confirmText}
              disabled={action.busy}
              className="font-mono"
            />
          </form>
        ) : null}
        {action.error ? (
          <InlineAlert variant="destructive" className="border border-destructive/20">
            {action.error}
          </InlineAlert>
        ) : null}
        <AlertDialogFooter className="sm:pt-2">
          <AlertDialogCancel disabled={action.busy}>Cancel</AlertDialogCancel>
          <Button variant="destructive" disabled={!matches} loading={action.busy} onClick={() => void confirm()}>
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
DeleteConfirmDialog.displayName = "DeleteConfirmDialog";

/* ------------------------------------------------------------------ */
/* Shared member row                                                   */
/* ------------------------------------------------------------------ */

export interface DialogMember {
  id: string;
  name: string;
  email: string;
  avatarSrc?: string;
  role: string;
  /** Owners can't be changed or removed. */
  owner?: boolean;
}

function MemberRoleMenu({
  member,
  roles,
  onRoleChange,
  onRemove,
}: {
  member: DialogMember;
  roles: SelectOption[];
  onRoleChange: (role: string) => void;
  onRemove: () => void;
}) {
  if (member.owner) return <span className="px-2 text-sm text-muted-foreground">Owner</span>;
  const current = roles.find((r) => r.value === member.role);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" trailingIcon={<RiArrowDownSLine aria-hidden />} aria-label={`Role for ${member.name}`} className="text-muted-foreground">
          {current?.label ?? member.role}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuRadioGroup value={member.role} onValueChange={onRoleChange}>
          {roles.map((r) => (
            <DropdownMenuRadioItem key={r.value} value={r.value}>
              <span className="flex flex-col">
                <span>{r.label}</span>
                {r.description ? <span className="text-xs text-muted-foreground">{r.description}</span> : null}
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

function MemberList({
  members,
  roles,
  onChange,
  title,
}: {
  members: DialogMember[];
  roles: SelectOption[];
  onChange: (members: DialogMember[]) => void;
  title: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <ul className="-mx-2 flex flex-col">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent/50">
            <Avatar name={m.name} src={m.avatarSrc} size="sm" />
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-sm font-medium text-foreground">{m.name}</div>
              <div className="truncate text-xs text-muted-foreground">{m.email}</div>
            </div>
            <MemberRoleMenu
              member={m}
              roles={roles}
              onRoleChange={(role) => onChange(members.map((x) => (x.id === m.id ? { ...x, role } : x)))}
              onRemove={() => onChange(members.filter((x) => x.id !== m.id))}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

const defaultRoles: SelectOption[] = [
  { value: "admin", label: "Admin", description: "Manage members and billing" },
  { value: "member", label: "Member", description: "Create and edit content" },
  { value: "viewer", label: "Viewer", description: "View and comment only" },
];

const defaultMembers: DialogMember[] = [
  { id: "u1", name: "Maya Patel", email: "maya@sutra.app", role: "admin", owner: true },
  { id: "u2", name: "Diego Alvarez", email: "diego@northwind.co", role: "admin" },
  { id: "u3", name: "Aiko Tanaka", email: "aiko@northwind.co", role: "member" },
  { id: "u4", name: "Noah Kim", email: "noah@northwind.co", role: "viewer" },
];

/* ------------------------------------------------------------------ */
/* InviteMembersDialog                                                 */
/* ------------------------------------------------------------------ */

export interface InviteMembersDialogProps extends BlockDialogBaseProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  roles?: SelectOption[];
  defaultRole?: string;
  /**
   * Controlled member list when paired with `onMembersChange`. Passed alone it only seeds the
   * list (deprecated: use `defaultMembers` for that).
   */
  members?: DialogMember[];
  /** Initial member list when uncontrolled. */
  defaultMembers?: DialogMember[];
  onMembersChange?: (members: DialogMember[]) => void;
  inviteLink?: string;
  onInvite?: (emails: string[], role: string) => unknown;
}

/** Invite people by email with a role, manage current members and copy an invite link. */
export function InviteMembersDialog({
  title = "Invite to Northwind Studio",
  description = "Collaborate on notes, tasks and calendars in this workspace.",
  roles = defaultRoles,
  defaultRole = "member",
  members: membersProp,
  defaultMembers: defaultMembersProp,
  onMembersChange,
  inviteLink = "https://sutra.app/join/northwind-7f3k2q",
  onInvite,
  trigger,
  className,
  ...openProps
}: InviteMembersDialogProps) {
  const [open, setOpen] = useDialogOpen(openProps);
  const [emails, setEmails] = React.useState<string[]>([]);
  const [role, setRole] = React.useState(defaultRole);
  const [rejected, setRejected] = React.useState<string | null>(null);
  const [members, setMembers] = useControllableState<DialogMember[]>({
    value: membersProp && onMembersChange ? membersProp : undefined,
    defaultValue: defaultMembersProp ?? membersProp ?? defaultMembers,
    onChange: onMembersChange,
  });
  const { copied, copy } = useCopy();
  const action = useAsyncAction();

  const invite = async () => {
    if (emails.length === 0) return;
    const ok = await action.run(onInvite ? () => onInvite(emails, role) : undefined);
    if (!ok) return;
    setMembers([
      ...members,
      ...emails.map((email, i) => ({
        id: `invite-${Date.now()}-${i}`,
        name: email.split("@")[0]!.replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        email,
        role,
      })),
    ]);
    setEmails([]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent size="md" className={className}>
        <DialogHeader icon={<RiUserAddLine aria-hidden />} tone="primary">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-6">
          <Field invalid={Boolean(rejected)}>
            <FieldLabel>Email addresses</FieldLabel>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <TagInput
                value={emails}
                onValueChange={(v) => {
                  setEmails(v);
                  setRejected(null);
                }}
                validate={(tag) => isEmail(tag)}
                onReject={(tag, reason) =>
                  setRejected(reason === "invalid" ? `“${tag}” isn't a valid email.` : reason === "duplicate" ? `${tag} is already added.` : null)
                }
                separators={[",", " "]}
                addOnBlur
                placeholder={emails.length ? "Add more…" : "name@company.com"}
                wrapperClassName="flex-1"
              />
              <SimpleSelect options={roles} value={role} onValueChange={setRole} aria-label="Role" className="sm:w-32" />
            </div>
            <FieldError>{rejected}</FieldError>
          </Field>
          <MemberList title={`Members · ${members.length}`} members={members} roles={roles} onChange={setMembers} />
        </DialogBody>
        <DialogFooter bordered className="sm:justify-between">
          <Button
            variant="ghost"
            leadingIcon={copied ? <RiCheckLine aria-hidden className="text-success" /> : <RiLinkM aria-hidden />}
            onClick={() => void copy(inviteLink)}
          >
            {copied ? "Link copied" : "Copy invite link"}
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button disabled={emails.length === 0} loading={action.busy} onClick={() => void invite()}>
              {emails.length > 1 ? `Send ${emails.length} invites` : "Send invite"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
InviteMembersDialog.displayName = "InviteMembersDialog";

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
  /** Name of the shared item. */
  itemName?: string;
  link?: string;
  access?: ShareAccess;
  defaultAccess?: ShareAccess;
  onAccessChange?: (access: ShareAccess) => void;
  /**
   * Controlled people list when paired with `onPeopleChange`. Passed alone it only seeds the
   * list (deprecated: use `defaultPeople` for that).
   */
  people?: DialogMember[];
  /** Initial people list when uncontrolled. */
  defaultPeople?: DialogMember[];
  onPeopleChange?: (people: DialogMember[]) => void;
  /** Called when someone is invited, with the role picked next to the email field. */
  onInvite?: (email: string, role: ShareLinkRole) => unknown;
  /** The signed-in person: their row says "(you)" and offers "Leave" unless they own the item. */
  currentUserId?: string;
  onRoleChange?: (personId: string, role: ShareRole) => void;
  onRemovePerson?: (personId: string) => void;
  onLeave?: () => void;
  /** Role preselected for invites. Default "editor". */
  defaultInviteRole?: ShareLinkRole;
  /** Workspace name for the "Anyone at …" access option. Pass "" to hide that option. */
  workspaceName?: string;
  linkRole?: ShareLinkRole;
  defaultLinkRole?: ShareLinkRole;
  onLinkRoleChange?: (role: ShareLinkRole) => void;
  expiry?: ShareLinkExpiry;
  defaultExpiry?: ShareLinkExpiry;
  /** `expiresAt` is null for "never". */
  onExpiryChange?: (expiry: ShareLinkExpiry, expiresAt: Date | null) => void;
  /** Expiry date for a controlled `custom` expiry (or to show an existing deadline). */
  expiresAt?: Date | null;
  /** Show the "Allow comments on public link" switch for public links. Default true. */
  showAllowComments?: boolean;
  allowComments?: boolean;
  defaultAllowComments?: boolean;
  onAllowCommentsChange?: (allow: boolean) => void;
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

const defaultPeople: DialogMember[] = [
  { id: "p1", name: "Maya Patel", email: "maya@sutra.app", role: "owner", owner: true },
  { id: "p2", name: "Priya Shah", email: "priya@northwind.co", role: "editor" },
  { id: "p3", name: "Lena Okafor", email: "lena@northwind.co", role: "commenter" },
  { id: "p4", name: "Noah Kim", email: "noah@northwind.co", role: "viewer" },
];

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
        <Button variant="ghost" size="sm" leadingIcon={<RiLogoutBoxRLine aria-hidden />} onClick={onLeave}>
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
  itemName = "Q4 Launch Plan",
  link = "https://sutra.app/n/q4-launch-plan-8d2f",
  access,
  defaultAccess = "link",
  onAccessChange,
  people: peopleProp,
  defaultPeople: defaultPeopleProp,
  onPeopleChange,
  onInvite,
  currentUserId = "p1",
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
    defaultValue: defaultPeopleProp ?? peopleProp ?? defaultPeople,
    onChange: onPeopleChange,
  });
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
  const action = useAsyncAction();
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
    setPeople(people.map((p) => (p.id === id ? { ...p, role } : p)));
    onRoleChange?.(id, role);
  };

  const remove = (id: string) => {
    setPeople(people.filter((p) => p.id !== id));
    onRemovePerson?.(id);
  };

  const leave = (id: string) => {
    setPeople(people.filter((p) => p.id !== id));
    onLeave?.();
  };

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!isEmail(value)) return;
    const ok = await action.run(onInvite ? () => onInvite(value, inviteRole) : undefined);
    if (!ok) return;
    setPeople([...people, { id: `p-${Date.now()}`, name: value.split("@")[0]!, email: value, role: inviteRole }]);
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
          <DialogTitle>Share “{itemName}”</DialogTitle>
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
                  <li key={p.id} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent/50">
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
          <CopyButton variant="button" size="md" value={link} label="Copy link" onClick={() => onCopyLink?.(link)} />
          <DialogClose asChild>
            <Button>Done</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
ShareDialog.displayName = "ShareDialog";

/* ------------------------------------------------------------------ */
/* FeedbackDialog                                                      */
/* ------------------------------------------------------------------ */

export interface FeedbackValues {
  rating: number;
  category: string;
  message: string;
  contact: boolean;
}

export interface FeedbackDialogProps extends BlockDialogBaseProps {
  title?: React.ReactNode;
  categories?: { value: string; label: string }[];
  onSubmit?: (values: FeedbackValues) => unknown;
}

const ratingLabels = ["", "Terrible", "Bad", "Okay", "Good", "Amazing"];

/** Collect a star rating, a category and a written message; shows a thank-you state. */
export function FeedbackDialog({
  title = "Share your feedback",
  categories = [
    { value: "idea", label: "Idea" },
    { value: "bug", label: "Bug" },
    { value: "praise", label: "Praise" },
    { value: "other", label: "Other" },
  ],
  onSubmit,
  trigger,
  className,
  ...openProps
}: FeedbackDialogProps) {
  const [open, setOpen] = useDialogOpen(openProps);
  const [rating, setRating] = React.useState(0);
  const [category, setCategory] = React.useState(categories[0]?.value ?? "");
  const [message, setMessage] = React.useState("");
  const [contact, setContact] = React.useState(true);
  const [sent, setSent] = React.useState(false);
  const action = useAsyncAction();

  React.useEffect(() => {
    if (open) return;
    const t = setTimeout(() => {
      setSent(false);
      setRating(0);
      setMessage("");
    }, 200);
    return () => clearTimeout(t);
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating && !message.trim()) return;
    const ok = await action.run(onSubmit ? () => onSubmit({ rating, category, message: message.trim(), contact }) : undefined);
    if (ok) setSent(true);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent size="md" className={className}>
        {sent ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <FeaturedIcon icon={RiHeartLine} color="success" variant="outline-ring" size="lg" className="mb-2" />
            <DialogTitle>Thanks for the feedback!</DialogTitle>
            <DialogDescription className="max-w-sm">
              Every note is read by the Sutra team. We&apos;ll be in touch if we need more details.
            </DialogDescription>
            <DialogClose asChild>
              <Button className="mt-4 min-w-32">Close</Button>
            </DialogClose>
          </div>
        ) : (
          <form onSubmit={submit} className="contents">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>Help us make Sutra better. What&apos;s on your mind?</DialogDescription>
            </DialogHeader>
            <DialogBody>
              <FieldGroup>
                <div className="flex flex-col items-center gap-2 rounded-box border border-border bg-subtle py-5">
                  <span className="text-sm font-medium text-foreground" id="feedback-rating-label">
                    How would you rate your experience?
                  </span>
                  <Rating value={rating} onValueChange={setRating} size="lg" aria-labelledby="feedback-rating-label" />
                  <span className="h-4 text-xs font-medium text-muted-foreground" aria-live="polite">
                    {ratingLabels[Math.round(rating)]}
                  </span>
                </div>
                <Field>
                  <FieldLabel>Category</FieldLabel>
                  <SegmentedControl aria-label="Category" fullWidth value={category} onValueChange={(v) => v && setCategory(v)} options={categories} />
                </Field>
                <Field>
                  <FieldLabel>Message</FieldLabel>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={category === "bug" ? "What happened, and what did you expect?" : "Tell us more…"}
                    autoResize
                    minRows={4}
                    maxRows={10}
                    maxLength={1000}
                    showCount
                  />
                </Field>
                <CheckboxField
                  label="The Sutra team may contact me about this feedback"
                  checked={contact}
                  onCheckedChange={(v) => setContact(v === true)}
                  labelClassName="font-normal text-muted-foreground"
                />
                {action.error ? <InlineAlert variant="destructive">{action.error}</InlineAlert> : null}
              </FieldGroup>
            </DialogBody>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary">Cancel</Button>
              </DialogClose>
              <Button type="submit" loading={action.busy} disabled={!rating && !message.trim()}>
                Send feedback
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
FeedbackDialog.displayName = "FeedbackDialog";

/* ------------------------------------------------------------------ */
/* UpgradeDialog                                                       */
/* ------------------------------------------------------------------ */

export interface UpgradePlan {
  id: string;
  name: string;
  description: string;
  monthly: number;
  yearly: number;
  /** Suffix after the price, e.g. "/ user / mo". */
  unit?: string;
  features: string[];
  popular?: boolean;
  cta?: string;
}

export interface UpgradeDialogProps extends BlockDialogBaseProps {
  plans?: UpgradePlan[];
  currentPlan?: string;
  billing?: "monthly" | "yearly";
  defaultBilling?: "monthly" | "yearly";
  onBillingChange?: (billing: "monthly" | "yearly") => void;
  onSelectPlan?: (planId: string, billing: "monthly" | "yearly") => unknown;
  currency?: string;
}

const defaultPlans: UpgradePlan[] = [
  {
    id: "free",
    name: "Free",
    description: "For getting organized.",
    monthly: 0,
    yearly: 0,
    features: ["Notes, Tasks & Calendar", "2 GB storage", "Sync across 2 devices", "7-day history"],
  },
  {
    id: "pro",
    name: "Pro",
    description: "The full suite for one.",
    monthly: 10,
    yearly: 8,
    popular: true,
    cta: "Upgrade to Pro",
    features: ["All 8 Sutra apps", "100 GB storage", "Unlimited devices", "Unlimited history", "AI summaries & search"],
  },
  {
    id: "team",
    name: "Team",
    description: "Shared workspaces for teams.",
    monthly: 16,
    yearly: 13,
    unit: "/ user / mo",
    cta: "Upgrade to Team",
    features: ["Everything in Pro", "1 TB pooled storage", "Shared calendars & projects", "Admin controls & SSO", "Priority support"],
  },
];

/** Plan comparison dialog with a monthly/yearly toggle and feature checklists. */
export function UpgradeDialog({
  plans = defaultPlans,
  currentPlan = "free",
  billing,
  defaultBilling = "yearly",
  onBillingChange,
  onSelectPlan,
  currency = "$",
  trigger,
  className,
  ...openProps
}: UpgradeDialogProps) {
  const [open, setOpen] = useDialogOpen(openProps);
  const [cycle, setCycle] = useControllableState<"monthly" | "yearly">({
    value: billing,
    defaultValue: defaultBilling,
    onChange: onBillingChange,
  });
  const [chosen, setChosen] = React.useState<string | null>(null);
  // Stays open if `onSelectPlan` throws.
  const choose = useSharedAsyncAction((id: string) => onSelectPlan?.(id, cycle), { onSuccess: () => setOpen(false) });
  const pending = choose.busy ? chosen : null;

  const select = async (id: string) => {
    setChosen(id);
    await choose.run(id);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent size="xl" className={cn("gap-6", className)}>
        <DialogHeader align="center" icon={<RiSparkling2Line aria-hidden />} tone="primary">
          <DialogTitle className="text-xl sm:text-2xl">Upgrade your Sutra plan</DialogTitle>
          <DialogDescription>Unlock every app, more storage and AI features. Cancel anytime.</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center">
          <SegmentedControl
            aria-label="Billing period"
            value={cycle}
            onValueChange={(v) => v && setCycle(v as "monthly" | "yearly")}
            options={[
              { value: "monthly", label: "Monthly" },
              {
                value: "yearly",
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    Yearly
                    <Badge color="success" size="sm">
                      Save 20%
                    </Badge>
                  </span>
                ),
              },
            ]}
          />
        </div>
        <DialogBody>
          <div className="grid gap-4 pb-1 md:grid-cols-3">
            {plans.map((plan) => {
              const price = cycle === "yearly" ? plan.yearly : plan.monthly;
              const isCurrent = plan.id === currentPlan;
              return (
                <div
                  key={plan.id}
                  className={cn(
                    "relative flex flex-col gap-5 rounded-box border bg-card p-5",
                    plan.popular ? "border-primary shadow-md ring-1 ring-primary" : "border-border shadow-xs"
                  )}
                >
                  {plan.popular ? (
                    <Badge color="brand" variant="solid" size="sm" className="absolute -top-2.5 left-5">
                      Most popular
                    </Badge>
                  ) : null}
                  <div className="flex flex-col gap-1">
                    <h3 className="text-base font-semibold text-foreground">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-display-sm font-semibold tracking-tight text-foreground tabular-nums">
                      {currency}
                      {price}
                    </span>
                    <span className="text-sm text-muted-foreground">{price === 0 ? "forever" : plan.unit ?? "/ mo"}</span>
                  </div>
                  {isCurrent ? (
                    <Button variant="secondary" disabled fullWidth>
                      Current plan
                    </Button>
                  ) : (
                    <Button
                      variant={plan.popular ? "primary" : "secondary"}
                      fullWidth
                      loading={pending === plan.id}
                      disabled={pending != null && pending !== plan.id}
                      onClick={() => void select(plan.id)}
                    >
                      {plan.cta ?? `Choose ${plan.name}`}
                    </Button>
                  )}
                  <ul className="flex flex-col gap-2.5 border-t border-border pt-4 text-sm">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-foreground">
                        <span className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
                          <RiCheckLine aria-hidden className="size-3" />
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </DialogBody>
        <p className="text-center text-xs text-muted-foreground">
          Prices in USD. {cycle === "yearly" ? "Billed annually." : "Billed monthly."} Taxes may apply.
        </p>
      </DialogContent>
    </Dialog>
  );
}
UpgradeDialog.displayName = "UpgradeDialog";

/* ------------------------------------------------------------------ */
/* OnboardingDialog                                                    */
/* ------------------------------------------------------------------ */

export interface OnboardingStep {
  title: string;
  description?: React.ReactNode;
  content: React.ReactNode;
}

export interface OnboardingDialogProps extends BlockDialogBaseProps {
  /** Custom steps. Defaults to pick apps → name workspace → preferences. */
  steps?: OnboardingStep[];
  step?: number;
  defaultStep?: number;
  onStepChange?: (step: number) => void;
  onComplete?: () => unknown;
  finishLabel?: React.ReactNode;
}

function AppPicker({ value, onChange }: { value: SutraApp[]; onChange: (v: SutraApp[]) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Apps">
      {sutraApps.map((app) => {
        const on = value.includes(app);
        return (
          <button
            key={app}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((a) => a !== app) : [...value, app])}
            className={cn(
              "relative flex flex-col items-center gap-2 rounded-box border p-4 text-sm font-medium transition-[border-color,background-color,box-shadow]",
              on ? "border-primary bg-primary-soft/40 ring-1 ring-primary" : "border-border hover:border-border-strong hover:bg-accent/50",
              focusRing
            )}
          >
            <SutraAppIcon app={app} size={36} shape="squircle" />
            {sutraAppMeta[app].name}
            {on ? (
              <span className="absolute right-2 top-2 inline-flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <RiCheckLine aria-hidden className="size-3" />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Multi-step onboarding with a step indicator, content slots and Back/Next navigation. */
export function OnboardingDialog({
  steps: stepsProp,
  step,
  defaultStep = 0,
  onStepChange,
  onComplete,
  finishLabel = "Get started",
  trigger,
  className,
  ...openProps
}: OnboardingDialogProps) {
  const [open, setOpen] = useDialogOpen(openProps);
  const [index, setIndex] = useControllableState<number>({ value: step, defaultValue: defaultStep, onChange: onStepChange });
  const [apps, setApps] = React.useState<SutraApp[]>(["notes", "tasks", "calendar"]);
  const [workspace, setWorkspace] = React.useState("Northwind Studio");
  const [theme, setTheme] = React.useState("system");
  const [digest, setDigest] = React.useState(true);
  const action = useAsyncAction();
  const slug = workspace.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const steps: OnboardingStep[] = stepsProp ?? [
    {
      title: "Choose your apps",
      description: "Pick the apps you want in your sidebar. You can add more anytime.",
      content: <AppPicker value={apps} onChange={setApps} />,
    },
    {
      title: "Name your workspace",
      description: "This is where your notes, tasks and files will live.",
      content: (
        <FieldGroup>
          <Field>
            <FieldLabel>Workspace name</FieldLabel>
            <Input value={workspace} onChange={(e) => setWorkspace(e.target.value)} size="lg" autoFocus />
          </Field>
          <Field>
            <FieldLabel>Workspace URL</FieldLabel>
            <Input value={slug} readOnly prefix="sutra.app/" size="lg" />
            <FieldDescription>Share this link to invite people later.</FieldDescription>
          </Field>
        </FieldGroup>
      ),
    },
    {
      title: "Make it yours",
      description: "Set a few preferences. All of these live in Settings too.",
      content: (
        <FieldGroup>
          <Field>
            <FieldLabel>Appearance</FieldLabel>
            <SegmentedControl
              aria-label="Appearance"
              fullWidth
              value={theme}
              onValueChange={(v) => v && setTheme(v)}
              options={[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
                { value: "system", label: "System" },
              ]}
            />
          </Field>
          <div className="rounded-box border border-border p-4">
            <SwitchField
              label="Daily summary"
              description="Get a short morning email with today's tasks and events."
              labelPosition="left"
              checked={digest}
              onCheckedChange={setDigest}
            />
          </div>
        </FieldGroup>
      ),
    },
  ];

  const last = index >= steps.length - 1;
  const current = steps[Math.min(index, steps.length - 1)];

  const next = async () => {
    if (!last) return setIndex(index + 1);
    const ok = await action.run(onComplete);
    if (ok) {
      setOpen(false);
      setIndex(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent size="lg" className={cn("gap-6", className)}>
        <Steps steps={steps.map((s) => ({ title: s.title }))} current={index} variant="bars" onStepClick={setIndex} className="pr-8" />
        <DialogHeader>
          <DialogTitle>{current?.title}</DialogTitle>
          {current?.description ? <DialogDescription>{current.description}</DialogDescription> : null}
        </DialogHeader>
        <DialogBody key={index} className="animate-in fade-in-0 slide-in-from-right-2 duration-200">
          {current?.content}
        </DialogBody>
        <DialogFooter bordered className="sm:justify-between">
          <span className="hidden text-sm text-muted-foreground sm:block">
            Step {index + 1} of {steps.length}
          </span>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {index > 0 ? (
              <Button variant="secondary" leadingIcon={<RiArrowLeftLine aria-hidden />} onClick={() => setIndex(index - 1)}>
                Back
              </Button>
            ) : (
              <DialogClose asChild>
                <Button variant="ghost">Skip for now</Button>
              </DialogClose>
            )}
            <Button
              loading={action.busy}
              trailingIcon={last ? undefined : <RiArrowRightLine aria-hidden />}
              onClick={() => void next()}
            >
              {last ? finishLabel : "Continue"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
OnboardingDialog.displayName = "OnboardingDialog";

/* ------------------------------------------------------------------ */
/* KeyboardShortcutsDialog                                             */
/* ------------------------------------------------------------------ */

export interface ShortcutEntry {
  label: string;
  /** Keys pressed together, e.g. ["⌘", "K"]. Use "then" to show a sequence. */
  keys: string[];
}

export interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutEntry[];
}

export interface KeyboardShortcutsDialogProps extends BlockDialogBaseProps {
  /**
   * Static groups. When omitted inside a `ShortcutProvider`, the dialog lists the live shortcut
   * registry instead (falling back to a default Sutra reference when the registry is empty).
   */
  groups?: ShortcutGroup[];
  title?: React.ReactNode;
}

const defaultShortcutGroups: ShortcutGroup[] = [
  {
    title: "General",
    shortcuts: [
      { label: "Command menu", keys: ["⌘", "K"] },
      { label: "Toggle sidebar", keys: ["⌘", "B"] },
      { label: "Keyboard shortcuts", keys: ["?"] },
      { label: "Settings", keys: ["⌘", ","] },
    ],
  },
  {
    title: "Create",
    shortcuts: [
      { label: "New note", keys: ["⌥", "N"] },
      { label: "New task", keys: ["⌥", "T"] },
      { label: "New event", keys: ["⌥", "E"] },
      { label: "Journal entry", keys: ["⌥", "J"] },
    ],
  },
  {
    title: "Navigation",
    shortcuts: [
      { label: "Go to Home", keys: ["G", "then", "H"] },
      { label: "Go to Inbox", keys: ["G", "then", "I"] },
      { label: "Go to Today", keys: ["G", "then", "T"] },
      { label: "Search", keys: ["/"] },
    ],
  },
  {
    title: "Editor",
    shortcuts: [
      { label: "Bold", keys: ["⌘", "B"] },
      { label: "Italic", keys: ["⌘", "I"] },
      { label: "Insert link", keys: ["⌘", "⇧", "K"] },
      { label: "Checklist", keys: ["⌘", "⇧", "9"] },
    ],
  },
];

/** Searchable reference of keyboard shortcuts, grouped, rendered with Kbd keys. */
export function KeyboardShortcutsDialog({
  groups: groupsProp,
  title = "Keyboard shortcuts",
  trigger,
  className,
  ...openProps
}: KeyboardShortcutsDialogProps) {
  const [open, setOpen] = useDialogOpen(openProps);
  const [query, setQuery] = React.useState("");
  const registry = useShortcutRegistry();
  const useRegistry = !groupsProp && registry.shortcuts.length > 0;
  const groups: { title: string; shortcuts: { id: string; label: string; keys: string[]; spec?: string }[] }[] = useRegistry
    ? registry.groups.map((g) => ({
        title: g.group,
        shortcuts: g.shortcuts.map((s) => ({ id: s.id, label: s.label, keys: [], spec: s.keys })),
      }))
    : (groupsProp ?? defaultShortcutGroups).map((g) => ({
        title: g.title,
        shortcuts: g.shortcuts.map((s) => ({ id: s.label, label: s.label, keys: s.keys })),
      }));
  const q = query.trim().toLowerCase();
  const filtered = groups
    .map((g) => ({ ...g, shortcuts: g.shortcuts.filter((s) => !q || s.label.toLowerCase().includes(q)) }))
    .filter((g) => g.shortcuts.length > 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent size="lg" className={className}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RiKeyboardBoxLine aria-hidden className="size-5 text-muted-foreground" />
            {title}
          </DialogTitle>
          <DialogDescription className="sr-only">All keyboard shortcuts available in Sutra.</DialogDescription>
        </DialogHeader>
        <SearchInput value={query} onChange={(e) => setQuery(e.target.value)} onClear={() => setQuery("")} placeholder="Search shortcuts…" aria-label="Search shortcuts" />
        <DialogBody className="max-h-[60dvh]">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No shortcuts match “{query}”</p>
          ) : (
            <div className="grid gap-x-8 gap-y-6 pb-1 sm:grid-cols-2">
              {filtered.map((group) => (
                <section key={group.title}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.title}</h3>
                  <ul className="flex flex-col divide-y divide-border">
                    {group.shortcuts.map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-4 py-2 text-sm">
                        <span className="text-foreground">{s.label}</span>
                        {s.spec ? (
                          <ShortcutKeys keys={s.spec} size="md" />
                        ) : (
                        <span className="flex shrink-0 items-center gap-1" aria-label={s.keys.join(" ")}>
                          {s.keys.map((k, i) =>
                            k === "then" ? (
                              <span key={i} className="text-xs text-muted-foreground">
                                then
                              </span>
                            ) : (
                              <Kbd key={i} className="h-6 min-w-6 text-xs">
                                {k}
                              </Kbd>
                            )
                          )}
                        </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
KeyboardShortcutsDialog.displayName = "KeyboardShortcutsDialog";

/* ------------------------------------------------------------------ */
/* NewItemDialog                                                       */
/* ------------------------------------------------------------------ */

export interface NewItemValues {
  type: "task" | "note";
  title: string;
  description: string;
  due?: Date;
  priority: string;
  labels: string[];
}

export interface NewItemDialogProps extends BlockDialogBaseProps {
  defaultType?: "task" | "note";
  labelSuggestions?: string[];
  onCreate?: (values: NewItemValues) => unknown;
}

const priorityDot = (cls: string) => <span aria-hidden className={cn("size-2 rounded-full", cls)} />;

const priorities: SelectOption[] = [
  { value: "urgent", label: "Urgent", icon: priorityDot("bg-destructive") },
  { value: "high", label: "High", icon: priorityDot("bg-warning") },
  { value: "medium", label: "Medium", icon: priorityDot("bg-info") },
  { value: "low", label: "Low", icon: priorityDot("bg-muted-foreground") },
];

/** Quick create form for a task or note: title, description, due date, priority and labels. */
export function NewItemDialog({
  defaultType = "task",
  labelSuggestions = ["Design", "Engineering", "Marketing", "Personal", "Health", "Finance", "Reading"],
  onCreate,
  trigger,
  className,
  ...openProps
}: NewItemDialogProps) {
  const [open, setOpen] = useDialogOpen(openProps);
  const empty = React.useCallback(
    (type: "task" | "note"): NewItemValues => ({ type, title: "", description: "", due: undefined, priority: "medium", labels: [] }),
    []
  );
  const [values, setValues] = React.useState<NewItemValues>(() => empty(defaultType));
  const [createMore, setCreateMore] = React.useState(false);
  const [titleError, setTitleError] = React.useState(false);
  const action = useAsyncAction();
  const titleRef = React.useRef<HTMLInputElement>(null);
  const set = <K extends keyof NewItemValues>(key: K, v: NewItemValues[K]) => setValues((s) => ({ ...s, [key]: v }));
  const isTask = values.type === "task";

  React.useEffect(() => {
    if (!open) {
      setValues(empty(defaultType));
      setTitleError(false);
    }
  }, [open, defaultType, empty]);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!values.title.trim()) {
      setTitleError(true);
      titleRef.current?.focus();
      return;
    }
    const ok = await action.run(onCreate ? () => onCreate({ ...values, title: values.title.trim() }) : undefined);
    if (!ok) return;
    if (createMore) {
      setValues((v) => ({ ...empty(v.type), labels: v.labels, priority: v.priority }));
      titleRef.current?.focus();
    } else {
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent size="md" className={className}>
        <form
          onSubmit={submit}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void submit(e);
          }}
          className="contents"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <SutraAppIcon app={isTask ? "tasks" : "notes"} size={24} />
              {isTask ? "New task" : "New note"}
            </DialogTitle>
            <DialogDescription className="sr-only">Create a new {values.type}.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <FieldGroup>
              <SegmentedControl
                aria-label="Item type"
                value={values.type}
                onValueChange={(v) => v && set("type", v as "task" | "note")}
                options={[
                  { value: "task", label: "Task", icon: <RiCheckboxCircleLine aria-hidden /> },
                  { value: "note", label: "Note", icon: <RiStickyNoteLine aria-hidden /> },
                ]}
              />
              <Field invalid={titleError}>
                <FieldLabel required>Title</FieldLabel>
                <Input
                  ref={titleRef}
                  value={values.title}
                  onChange={(e) => {
                    set("title", e.target.value);
                    if (e.target.value.trim()) setTitleError(false);
                  }}
                  placeholder={isTask ? "e.g. Draft launch announcement" : "e.g. Weekly review"}
                  size="lg"
                  autoFocus
                />
                <FieldError>{titleError ? "Give it a title." : null}</FieldError>
              </Field>
              <Field>
                <FieldLabel hint="(optional)">Description</FieldLabel>
                <Textarea
                  value={values.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Add details, links or context…"
                  autoResize
                  minRows={3}
                  maxRows={8}
                />
              </Field>
              {isTask && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>Due date</FieldLabel>
                    <DatePicker value={values.due} onValueChange={(d) => set("due", d)} placeholder="No due date" clearable />
                  </Field>
                  <Field>
                    <FieldLabel>Priority</FieldLabel>
                    <SimpleSelect options={priorities} value={values.priority} onValueChange={(v) => set("priority", v)} />
                  </Field>
                </div>
              )}
              <Field>
                <FieldLabel>Labels</FieldLabel>
                <TagInput
                  value={values.labels}
                  onValueChange={(v) => set("labels", v)}
                  suggestions={labelSuggestions}
                  placeholder="Add labels…"
                  max={5}
                />
              </Field>
              {action.error ? <InlineAlert variant="destructive">{action.error}</InlineAlert> : null}
            </FieldGroup>
          </DialogBody>
          <DialogFooter bordered className="sm:justify-between">
            <SwitchField label="Create more" size="sm" checked={createMore} onCheckedChange={setCreateMore} labelClassName="font-normal text-muted-foreground" />
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <DialogClose asChild>
                <Button variant="secondary">Cancel</Button>
              </DialogClose>
              <Button type="submit" loading={action.busy} trailingIcon={<span className="hidden items-center gap-0.5 opacity-70 sm:inline-flex" aria-hidden>⌘↵</span>}>
                Create {values.type}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
NewItemDialog.displayName = "NewItemDialog";
