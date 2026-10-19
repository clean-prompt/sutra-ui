import * as React from "react";
import {
  DialogProvider,
  useDialogs,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Avatar,
  Badge,
  Button,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  ConfirmDialog,
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  Field,
  FieldDescription,
  FieldLabel,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  InfoTooltip,
  Input,
  Kbd,
  Popover,
  PopoverBody,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverFooter,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
  SimpleSelect,
  SimpleTooltip,
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Switch,
  Text,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  useCommandMenuShortcut,
  useCopy,
} from "@sutra/ui";
import {
  RiArchiveLine,
  RiArrowDownSLine,
  RiBold,
  RiCalendarLine,
  RiCheckLine,
  RiClipboardLine,
  RiDeleteBinLine,
  RiEditLine,
  RiFileCopyLine,
  RiFileAddLine,
  RiFolderAddLine,
  RiHome4Line,
  RiItalic,
  RiLink,
  RiLogoutBoxRLine,
  RiMapPinLine,
  RiMoonLine,
  RiMore2Fill,
  RiScissorsLine,
  RiSettings4Line,
  RiShareForwardLine,
  RiSunLine,
  RiTeamLine,
  RiUnderline,
  RiUserLine,
  RiComputerLine,
  RiMailLine,
  RiSlackLine,
  RiTwitterXLine,
} from "@sutra/ui/icons";
import { Demo, DemoLabel, PageIntro } from "../components/demo";

function PromiseDialogsDemo() {
  const dialogs = useDialogs();
  const [log, setLog] = React.useState("Nothing yet");
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="destructive" onClick={async () => setLog((await dialogs.confirm({ title: "Delete 3 files?", description: "They move to the trash for 30 days.", confirmLabel: "Delete", tone: "destructive" })) ? "Deleted" : "Kept")}>
          Delete files…
        </Button>
        <Button variant="outline" onClick={async () => { const name = await dialogs.prompt({ title: "Rename folder", label: "Name", defaultValue: "Untitled folder", validate: (v) => (v.includes("/") ? "Names can't contain /" : undefined) }); setLog(name === null ? "Rename canceled" : `Renamed to “${name}”`); }}>
          Rename…
        </Button>
        <Button variant="outline" onClick={async () => { const quality = await dialogs.choose({ title: "Export quality", options: [{ value: "high", label: "High", description: "Large files" }, { value: "medium", label: "Medium" }, { value: "low", label: "Low", description: "Small files" }], defaultValue: "medium" }); setLog(quality === null ? "Export canceled" : `Exporting at ${quality}`); }}>
          Export…
        </Button>
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">Result: {log}</p>
    </div>
  );
}

export function OverlaysPage() {
  return (
    <PageIntro
      eyebrow="Components"
      title="Overlays"
      description="Floating surfaces layered above the page: tooltips, popovers, dialogs, sheets, menus and the command palette. All of them portal to the document body and are keyboard accessible."
    >
      <TooltipDemo />
      <InfoTooltipDemo />
      <PopoverDemo />
      <HoverCardDemo />
      <DialogDemo />
      <AlertDialogDemo />
      <SheetDemo />
      <SheetOptionsDemo />
      <DropdownMenuDemo />
      <ContextMenuDemo />
      <CommandDialogDemo />
      <Demo id="promise-dialogs" title="Promise Dialogs" description="confirm(), prompt() and choose() from useDialogs() resolve with the answer, so a flow reads top to bottom. One DialogProvider is mounted once." align="start">
        <DialogProvider>
          <PromiseDialogsDemo />
        </DialogProvider>
      </Demo>
    </PageIntro>
  );
}

/* ------------------------------------------------------------------ */

function TooltipDemo() {
  return (
    <Demo
      id="tooltip"
      title="Tooltip"
      description="Short labels on hover or focus. SimpleTooltip covers the common case; compose Tooltip parts for full control."
      dots
    >
      <div className="flex w-full flex-col items-center gap-8">
        <div className="flex flex-wrap items-center justify-center gap-3">
          {(["top", "right", "bottom", "left"] as const).map((side) => (
            <SimpleTooltip key={side} content={`Tooltip on ${side}`} side={side}>
              <Button variant="secondary" size="sm" className="capitalize">
                {side}
              </Button>
            </SimpleTooltip>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <DemoLabel>With shortcut</DemoLabel>
            <div className="flex items-center gap-1 rounded-box border border-border bg-card p-1 shadow-xs">
              <SimpleTooltip content="Bold" shortcut={["⌘", "B"]}>
                <Button variant="ghost" size="icon-sm" aria-label="Bold">
                  <RiBold />
                </Button>
              </SimpleTooltip>
              <SimpleTooltip content="Italic" shortcut={["⌘", "I"]}>
                <Button variant="ghost" size="icon-sm" aria-label="Italic">
                  <RiItalic />
                </Button>
              </SimpleTooltip>
              <SimpleTooltip content="Underline" shortcut={["⌘", "U"]}>
                <Button variant="ghost" size="icon-sm" aria-label="Underline">
                  <RiUnderline />
                </Button>
              </SimpleTooltip>
              <SimpleTooltip content="Insert link" shortcut="⌘K">
                <Button variant="ghost" size="icon-sm" aria-label="Insert link">
                  <RiLink />
                </Button>
              </SimpleTooltip>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <DemoLabel>Light variant</DemoLabel>
            <SimpleTooltip content="Copied links expire in 7 days" variant="light" shortcut={["⌘", "C"]}>
              <Button variant="outline" size="sm" leadingIcon={<RiFileCopyLine />}>
                Copy link
              </Button>
            </SimpleTooltip>
          </div>
          <div className="flex flex-col items-center gap-2">
            <DemoLabel>Composed</DemoLabel>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="soft" size="sm">
                  Hover me
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="flex items-center gap-2">
                Open settings
                <Kbd className="border-inverse-foreground/20 bg-inverse-foreground/10 text-inverse-foreground/80 shadow-none">
                  ⌘,
                </Kbd>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </Demo>
  );
}

function InfoTooltipDemo() {
  return (
    <Demo
      id="info-tooltip"
      title="Info tooltip"
      description="A small (i) or (?) trigger that explains a nearby label with a title and description."
    >
      <div className="flex w-full max-w-md flex-col gap-4 rounded-box border border-border bg-card p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            Monthly active users
            <InfoTooltip
              title="Monthly active users"
              description="Unique users who signed in at least once during the last 30 days."
            />
          </span>
          <span className="text-sm font-semibold tabular-nums">12,480</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            Churn rate
            <InfoTooltip
              icon="help"
              variant="light"
              side="right"
              title="How is churn calculated?"
              description="Cancelled subscriptions divided by active subscriptions at the start of the period."
            />
          </span>
          <span className="text-sm font-semibold tabular-nums">2.1%</span>
        </div>
        <div className="flex items-center gap-4 border-t border-border pt-4">
          <DemoLabel>Sizes</DemoLabel>
          <InfoTooltip size="sm" description="Small trigger" />
          <InfoTooltip size="md" description="Medium trigger" />
          <InfoTooltip size="lg" description="Large trigger" />
        </div>
      </div>
    </Demo>
  );
}

function PopoverDemo() {
  const { copy, copied } = useCopy();
  const [access, setAccess] = React.useState("edit");

  return (
    <Demo
      id="popover"
      title="Popover"
      description="Click-triggered panels for richer content. Compose header, body and footer with padded={false}."
      dots
    >
      <Popover>
        <PopoverTrigger asChild>
          <Button leadingIcon={<RiShareForwardLine />}>Share</Button>
        </PopoverTrigger>
        <PopoverContent size="lg" padded={false} align="start">
          <PopoverHeader>
            <PopoverTitle>Share “Q3 Roadmap”</PopoverTitle>
            <PopoverDescription>Invite teammates or copy a link to this document.</PopoverDescription>
          </PopoverHeader>
          <PopoverBody className="space-y-4">
            <div className="flex gap-2">
              <Input placeholder="name@company.com" leadingIcon={<RiMailLine />} wrapperClassName="flex-1" />
              <SimpleSelect
                aria-label="Permission"
                value={access}
                onValueChange={setAccess}
                className="w-28"
                options={[
                  { value: "view", label: "Can view" },
                  { value: "edit", label: "Can edit" },
                ]}
              />
            </div>
            <div className="space-y-3">
              {[
                { name: "Maya Chen", email: "maya@acme.co", role: "Owner" },
                { name: "Daniel Ortiz", email: "daniel@acme.co", role: "Can edit" },
              ].map((person) => (
                <div key={person.email} className="flex items-center gap-3">
                  <Avatar size="sm" name={person.name} colorful />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{person.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{person.email}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{person.role}</span>
                </div>
              ))}
            </div>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>Anyone with the link can view</span>
              <Switch size="sm" defaultChecked />
            </label>
          </PopoverBody>
          <PopoverFooter className="justify-between">
            <Button
              variant="ghost"
              size="sm"
              leadingIcon={copied ? <RiCheckLine /> : <RiLink />}
              onClick={() => copy("https://acme.co/docs/q3-roadmap")}
            >
              {copied ? "Copied" : "Copy link"}
            </Button>
            <PopoverClose asChild>
              <Button size="sm">Send invite</Button>
            </PopoverClose>
          </PopoverFooter>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="secondary" trailingIcon={<RiArrowDownSLine />}>
            Dimensions
          </Button>
        </PopoverTrigger>
        <PopoverContent arrow>
          <div className="space-y-3">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold">Dimensions</h4>
              <p className="text-sm text-muted-foreground">Set the size of the selected layer.</p>
            </div>
            {[
              ["Width", "320px"],
              ["Height", "240px"],
              ["Radius", "12px"],
            ].map(([label, value]) => (
              <div key={label} className="grid grid-cols-3 items-center gap-3">
                <span className="text-sm text-muted-foreground">{label}</span>
                <Input size="sm" defaultValue={value} wrapperClassName="col-span-2" />
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </Demo>
  );
}

function HoverCardDemo() {
  return (
    <Demo
      id="hover-card"
      title="Hover card"
      description="Preview content for sighted mouse users when hovering a link or mention."
    >
      <Text size="sm" tone="neutral" className="max-w-md text-center">
        The new onboarding flow was designed by{" "}
        <HoverCard>
          <HoverCardTrigger asChild>
            <a href="#hover-card" className="font-medium text-foreground underline underline-offset-4">
              @mayachen
            </a>
          </HoverCardTrigger>
          <HoverCardContent size="md" arrow>
            <div className="flex gap-3">
              <Avatar name="Maya Chen" size="lg" status="online" colorful />
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">Maya Chen</p>
                  <Badge size="sm" color="brand">
                    Pro
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">@mayachen</p>
                <p className="text-sm text-foreground">
                  Product designer at Acme. Building calm interfaces for busy teams.
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <RiMapPinLine className="size-3.5" /> Lisbon, Portugal
              </span>
              <span className="flex items-center gap-1.5">
                <RiCalendarLine className="size-3.5" /> Joined March 2021
              </span>
            </div>
          </HoverCardContent>
        </HoverCard>{" "}
        and reviewed by the growth team.
      </Text>
    </Demo>
  );
}

function DialogDemo() {
  const [open, setOpen] = React.useState(false);

  return (
    <Demo id="dialog" title="Dialog" description="Modal dialog with a form. Becomes a bottom sheet on small screens.">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button leadingIcon={<RiEditLine />}>Edit profile</Button>
        </DialogTrigger>
        <DialogContent>
          <form
            className="contents"
            onSubmit={(e) => {
              e.preventDefault();
              setOpen(false);
            }}
          >
            <DialogHeader icon={<RiUserLine />}>
              <DialogTitle>Edit profile</DialogTitle>
              <DialogDescription>Update how your name and bio appear to teammates.</DialogDescription>
            </DialogHeader>
            <DialogBody className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>First name</FieldLabel>
                  <Input defaultValue="Maya" />
                </Field>
                <Field>
                  <FieldLabel>Last name</FieldLabel>
                  <Input defaultValue="Chen" />
                </Field>
              </div>
              <Field>
                <FieldLabel>Username</FieldLabel>
                <Input prefix="acme.co/" defaultValue="mayachen" />
              </Field>
              <Field>
                <FieldLabel>Bio</FieldLabel>
                <Textarea rows={3} defaultValue="Product designer. Coffee, type and tidy Figma files." />
                <FieldDescription>Shown on your public profile.</FieldDescription>
              </Field>
            </DialogBody>
            <DialogFooter bordered>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit">Save changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="secondary">Centered, small</Button>
        </DialogTrigger>
        <DialogContent size="sm">
          <DialogHeader align="center" icon={<RiCheckLine />} tone="success">
            <DialogTitle>Payment received</DialogTitle>
            <DialogDescription>Your invoice #1042 has been paid. A receipt is on its way to your inbox.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button className="w-full">Done</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Demo>
  );
}

function AlertDialogDemo() {
  return (
    <Demo
      id="alert-dialog"
      title="Alert dialog"
      description="Interrupting confirmations that can't be dismissed by clicking outside. ConfirmDialog handles async confirms."
    >
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="secondary" leadingIcon={<RiArchiveLine />}>
            Archive project
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader icon={<RiArchiveLine />} tone="warning">
            <AlertDialogTitle>Archive “Website redesign”?</AlertDialogTitle>
            <AlertDialogDescription>
              The project becomes read-only for everyone. You can restore it from Settings at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ConfirmDialog
        trigger={
          <Button variant="destructive" leadingIcon={<RiDeleteBinLine />}>
            Delete workspace
          </Button>
        }
        tone="destructive"
        icon={<RiDeleteBinLine />}
        title="Delete workspace?"
        description="This permanently deletes “Acme Inc.”, its 14 projects and all files. This action cannot be undone."
        confirmLabel="Delete workspace"
        onConfirm={() => new Promise((resolve) => setTimeout(resolve, 1200))}
      />
    </Demo>
  );
}

function SheetDemo() {
  return (
    <Demo id="sheet" title="Sheet" description="Edge-anchored panels for navigation, filters and detail views.">
      {(["right", "left", "top", "bottom"] as const).map((side) => (
        <Sheet key={side}>
          <SheetTrigger asChild>
            <Button variant="secondary" className="capitalize">
              {side}
            </Button>
          </SheetTrigger>
          <SheetContent side={side}>
            <SheetHeader>
              <SheetTitle>Notification settings</SheetTitle>
              <SheetDescription>Choose what you want to hear about and where.</SheetDescription>
            </SheetHeader>
            <SheetBody className="space-y-4">
              {[
                ["Mentions", "When someone @mentions you", true],
                ["Comments", "Replies on threads you follow", true],
                ["Weekly digest", "A summary every Monday morning", false],
              ].map(([label, hint, on]) => (
                <label key={label as string} className="flex items-start justify-between gap-4">
                  <span>
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="block text-xs text-muted-foreground">{hint}</span>
                  </span>
                  <Switch defaultChecked={on as boolean} />
                </label>
              ))}
            </SheetBody>
            <SheetFooter>
              <Button variant="secondary">Reset</Button>
              <Button>Save preferences</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      ))}
    </Demo>
  );
}

function SheetOptionsDemo() {
  const sizes = ["auto", "sm", "md", "lg", "half", "full"] as const;
  return (
    <Demo
      id="sheet-options"
      title="Sheet options"
      description="size (width for side sheets, height for top and bottom), detached, frosted blur, logical start and end sides, dismissible={false} and stacked sheets."
      align="start"
      canvasClassName="gap-6"
    >
      <div className="space-y-2">
        <DemoLabel>Size, side sheet (width)</DemoLabel>
        <div className="flex flex-wrap gap-2">
          {sizes.map((size) => (
            <Sheet key={size}>
              <SheetTrigger asChild>
                <Button variant="secondary" size="sm">
                  {size}
                </Button>
              </SheetTrigger>
              <SheetContent side="end" size={size}>
                <SheetHeader>
                  <SheetTitle>Size: {size}</SheetTitle>
                  <SheetDescription>The panel is {size} wide; on a phone it never exceeds the screen.</SheetDescription>
                </SheetHeader>
              </SheetContent>
            </Sheet>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <DemoLabel>Size, bottom sheet (height)</DemoLabel>
        <div className="flex flex-wrap gap-2">
          {sizes.map((size) => (
            <Sheet key={size}>
              <SheetTrigger asChild>
                <Button variant="secondary" size="sm">
                  {size}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" size={size}>
                <SheetHeader>
                  <SheetTitle>Height: {size}</SheetTitle>
                  <SheetDescription>Bottom sheets take their height from size, or from their content with auto.</SheetDescription>
                </SheetHeader>
              </SheetContent>
            </Sheet>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <DemoLabel>Logical sides, detached, blur</DemoLabel>
        <div className="flex flex-wrap gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="secondary" size="sm">
                Start
              </Button>
            </SheetTrigger>
            <SheetContent side="start">
              <SheetHeader>
                <SheetTitle>Start side</SheetTitle>
                <SheetDescription>Left in left-to-right documents, right when the document is right-to-left.</SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="secondary" size="sm">
                Detached
              </Button>
            </SheetTrigger>
            <SheetContent side="right" detached>
              <SheetHeader>
                <SheetTitle>Detached</SheetTitle>
                <SheetDescription>Floats off the edges with every corner rounded.</SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="secondary" size="sm">
                Detached bottom
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" detached size="md">
              <SheetHeader>
                <SheetTitle>Detached bottom</SheetTitle>
                <SheetDescription>A floating card at the bottom of the screen.</SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="secondary" size="sm">
                Frosted blur
              </Button>
            </SheetTrigger>
            <SheetContent side="right" blur detached>
              <SheetHeader>
                <SheetTitle>Frosted</SheetTitle>
                <SheetDescription>The panel is translucent and blurs what is behind it.</SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <div className="space-y-2">
        <DemoLabel>Not dismissible, and stacked sheets</DemoLabel>
        <div className="flex flex-wrap gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="secondary" size="sm">
                Required step
              </Button>
            </SheetTrigger>
            <SheetContent dismissible={false}>
              <SheetHeader>
                <SheetTitle>Accept the terms</SheetTitle>
                <SheetDescription>Escape and outside clicks do nothing and there is no close button; use the action.</SheetDescription>
              </SheetHeader>
              <SheetFooter>
                <SheetClose asChild>
                  <Button>Accept and continue</Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="secondary" size="sm">
                Stacked
              </Button>
            </SheetTrigger>
            <SheetContent side="right" size="md">
              <SheetHeader>
                <SheetTitle>Project</SheetTitle>
                <SheetDescription>Open a second sheet: this one steps back behind it.</SheetDescription>
              </SheetHeader>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="self-start">
                    Edit members
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" size="sm">
                  <SheetHeader>
                    <SheetTitle>Members</SheetTitle>
                    <SheetDescription>Close this sheet to return to the project.</SheetDescription>
                  </SheetHeader>
                </SheetContent>
              </Sheet>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </Demo>
  );
}

function DropdownMenuDemo() {
  const [showToolbar, setShowToolbar] = React.useState(true);
  const [showStatusBar, setShowStatusBar] = React.useState(false);
  const [theme, setTheme] = React.useState("system");

  return (
    <Demo
      id="dropdown-menu"
      title="Dropdown menu"
      description="Action menus with icons, shortcuts, checkbox and radio items, and nested sub-menus."
      dots
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" className="gap-2 pl-1.5">
            <Avatar size="xs" name="Maya Chen" colorful />
            Maya Chen
            <RiArrowDownSLine className="size-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-60">
          <DropdownMenuLabel>maya@acme.co</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem icon={<RiUserLine />} shortcut="⇧⌘P">
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem icon={<RiSettings4Line />} shortcut="⌘,">
              Settings
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger icon={<RiTeamLine />}>Invite people</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem icon={<RiMailLine />}>Email</DropdownMenuItem>
                <DropdownMenuItem icon={<RiSlackLine />}>Slack</DropdownMenuItem>
                <DropdownMenuItem icon={<RiTwitterXLine />}>X / Twitter</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem icon={<RiLink />}>Copy invite link</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>View</DropdownMenuLabel>
          <DropdownMenuCheckboxItem checked={showToolbar} onCheckedChange={setShowToolbar} shortcut="⌘T">
            Toolbar
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={showStatusBar} onCheckedChange={setShowStatusBar}>
            Status bar
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
            <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem icon={<RiLogoutBoxRLine />} tone="destructive" shortcut="⇧⌘Q">
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="More actions">
            <RiMore2Fill />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuItem icon={<RiEditLine />} description="Change the title and cover">
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem icon={<RiFileCopyLine />} description="Create a copy in this folder">
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem icon={<RiArchiveLine />} description="Hide from the project list" disabled>
            Archive
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem icon={<RiDeleteBinLine />} tone="destructive">
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Demo>
  );
}

function ContextMenuDemo() {
  const [showGrid, setShowGrid] = React.useState(true);

  return (
    <Demo id="context-menu" title="Context menu" description="Right-click (or long-press) the area below.">
      <ContextMenu>
        <ContextMenuTrigger className="flex h-44 w-full max-w-md select-none items-center justify-center rounded-box border-2 border-dashed border-border-strong bg-subtle text-sm text-muted-foreground">
          Right-click here
        </ContextMenuTrigger>
        <ContextMenuContent className="w-60">
          <ContextMenuLabel>Edit</ContextMenuLabel>
          <ContextMenuItem icon={<RiScissorsLine />} shortcut="⌘X">
            Cut
          </ContextMenuItem>
          <ContextMenuItem icon={<RiFileCopyLine />} shortcut="⌘C">
            Copy
          </ContextMenuItem>
          <ContextMenuItem icon={<RiClipboardLine />} shortcut="⌘V">
            Paste
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuSub>
            <ContextMenuSubTrigger icon={<RiFileAddLine />}>New</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem icon={<RiFileAddLine />} shortcut="⌘N">
                File
              </ContextMenuItem>
              <ContextMenuItem icon={<RiFolderAddLine />} shortcut="⇧⌘N">
                Folder
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuCheckboxItem checked={showGrid} onCheckedChange={setShowGrid} shortcut="⌘'">
            Show grid
          </ContextMenuCheckboxItem>
          <ContextMenuSeparator />
          <ContextMenuItem icon={<RiDeleteBinLine />} tone="destructive" shortcut="⌫">
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </Demo>
  );
}

function CommandDialogDemo() {
  const [open, setOpen] = React.useState(false);
  useCommandMenuShortcut(setOpen);

  const run = (action: () => void = () => {}) => () => {
    action();
    setOpen(false);
  };

  return (
    <Demo
      id="command-dialog"
      title="Command dialog"
      description="Searchable command palette. Open it with the button or press ⌘K / Ctrl K."
    >
      <Button variant="secondary" onClick={() => setOpen(true)} className="w-64 justify-between text-muted-foreground">
        Search commands…
        <span className="flex gap-0.5">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </span>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            <CommandItem icon={<RiHome4Line />} shortcut={["G", "H"]} onSelect={run()}>
              Go to dashboard
            </CommandItem>
            <CommandItem icon={<RiTeamLine />} shortcut={["G", "T"]} onSelect={run()}>
              Go to team
            </CommandItem>
            <CommandItem icon={<RiSettings4Line />} shortcut={["⌘", ","]} onSelect={run()}>
              Open settings
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Create">
            <CommandItem icon={<RiFileAddLine />} description="Start from a blank page" shortcut={["⌘", "N"]} onSelect={run()}>
              New document
            </CommandItem>
            <CommandItem icon={<RiFolderAddLine />} description="Group related documents" onSelect={run()}>
              New folder
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Theme">
            <CommandItem icon={<RiSunLine />} onSelect={run()}>
              Light
            </CommandItem>
            <CommandItem icon={<RiMoonLine />} onSelect={run()}>
              Dark
            </CommandItem>
            <CommandItem icon={<RiComputerLine />} onSelect={run()}>
              System
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </Demo>
  );
}
