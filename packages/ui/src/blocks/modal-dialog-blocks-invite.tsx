/** InviteMembersDialog and the shared member row type. */
import * as React from "react";
import { RiArrowDownSLine, RiCheckLine, RiLinkM, RiUserAddLine, RiUserMinusLine } from "@remixicon/react";
import { useControllableState } from "../hooks/use-controllable-state";
import { useCopy } from "../hooks/use-copy";
import { Button } from "../primitives/button";
import { Avatar } from "../primitives/avatar";
import { TagInput } from "../primitives/tag-input";
import { Field, FieldLabel, FieldError } from "../primitives/field";
import { SimpleSelect, type SelectOption } from "../primitives/select";
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
import { useBlockAction as useAsyncAction } from "./block-utils";
import { isEmail } from "../lib/validate";
import { useFollowListProp } from "../hooks/use-follow-list-prop";
import { type BlockDialogBaseProps, useDialogOpen } from "./modal-dialog-blocks-internal";

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
  useFollowListProp(membersProp, setMembers, !onMembersChange);
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
