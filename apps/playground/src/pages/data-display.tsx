import * as React from "react";
import {
  Avatar,
  AvatarGroup,
  AvatarLabelGroup,
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  DataTable,
  EmptyState,
  FilterBar,
  FilterBarActive,
  FilterBarChip,
  FilterBarClear,
  FilterBarSearch,
  FilterBarToken,
  Pagination,
  Separator,
  Skeleton,
  StatusBadge,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  type AvatarSize,
  type DataTableColumn,
  type DataTableSort,
  type StatusBadgeStatus,
} from "@cleanprompt/sutra-ui";
import { RiCheckboxCircleLine, RiDownloadLine, RiTimeLine, RiUserLine } from "@cleanprompt/sutra-ui/icons";
import { Demo, DemoLabel, PageIntro } from "../components/demo";

const avatarSizes: AvatarSize[] = ["xs", "sm", "md", "lg", "xl", "2xl"];

const photo = (n: number) => `https://i.pravatar.cc/80?img=${n}`;

const team = [
  { name: "Olivia Rhye", img: 47 },
  { name: "Phoenix Baker", img: 12 },
  { name: "Lana Steiner", img: 45 },
  { name: "Demi Wilkinson", img: 32 },
  { name: "Candice Wu", img: 44 },
  { name: "Natali Craig", img: 26 },
  { name: "Drew Cano", img: 59 },
  { name: "Orlando Diggs", img: 53 },
  { name: "Kate Morrison", img: 29 },
];

/* ------------------------------------------------------------------ */
/* FilterBar                                                           */
/* ------------------------------------------------------------------ */

type TaskStatus = "Backlog" | "In progress" | "In review" | "Done";

interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  assignee: string;
  priority: "Low" | "Medium" | "High";
}

const tasks: Task[] = [
  { id: "SUT-142", title: "Migrate billing webhooks to v2", status: "In progress", assignee: "Olivia Rhye", priority: "High" },
  { id: "SUT-139", title: "Dark mode for the invoice PDF", status: "In review", assignee: "Phoenix Baker", priority: "Medium" },
  { id: "SUT-137", title: "Onboarding checklist copy pass", status: "Backlog", assignee: "Lana Steiner", priority: "Low" },
  { id: "SUT-131", title: "Rate-limit the public search API", status: "Done", assignee: "Olivia Rhye", priority: "High" },
  { id: "SUT-128", title: "Keyboard shortcuts cheat sheet", status: "In progress", assignee: "Demi Wilkinson", priority: "Low" },
  { id: "SUT-125", title: "Fix timezone drift in reminders", status: "Backlog", assignee: "Phoenix Baker", priority: "High" },
  { id: "SUT-120", title: "Audit log export to CSV", status: "Done", assignee: "Lana Steiner", priority: "Medium" },
];

const statusOptions: TaskStatus[] = ["Backlog", "In progress", "In review", "Done"];
const priorityOptions = ["Low", "Medium", "High"];

function FilterBarDemo() {
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<string[]>(["In progress"]);
  const [assignee, setAssignee] = React.useState<string[]>([]);
  const [priority, setPriority] = React.useState<string[]>([]);

  const assigneeOptions = React.useMemo(
    () =>
      Array.from(new Set(tasks.map((t) => t.assignee))).map((name) => ({
        value: name,
        label: name,
        icon: <Avatar size="xs" name={name} src={photo(team.find((m) => m.name === name)?.img ?? 1)} />,
        count: tasks.filter((t) => t.assignee === name).length,
      })),
    []
  );

  const results = tasks.filter(
    (t) =>
      (!query || `${t.id} ${t.title}`.toLowerCase().includes(query.toLowerCase())) &&
      (status.length === 0 || status.includes(t.status)) &&
      (assignee.length === 0 || assignee.includes(t.assignee)) &&
      (priority.length === 0 || priority.includes(t.priority))
  );

  const hasFilters = query || status.length > 0 || assignee.length > 0 || priority.length > 0;
  const clearAll = () => {
    setQuery("");
    setStatus([]);
    setAssignee([]);
    setPriority([]);
  };

  return (
    <div className="flex w-full flex-col gap-3">
      <FilterBar>
        <FilterBarSearch value={query} onValueChange={setQuery} placeholder="Search issues…" />
        <FilterBarChip
          label="Status"
          icon={<RiCheckboxCircleLine />}
          options={statusOptions.map((s) => ({
            value: s,
            label: s,
            count: tasks.filter((t) => t.status === s).length,
          }))}
          value={status}
          onValueChange={setStatus}
        />
        <FilterBarChip
          label="Assignee"
          icon={<RiUserLine />}
          options={assigneeOptions}
          value={assignee}
          onValueChange={setAssignee}
          searchable
        />
        <FilterBarChip label="Priority" options={priorityOptions} value={priority} onValueChange={setPriority} />
        {hasFilters ? <FilterBarClear onClick={clearAll} /> : null}
      </FilterBar>

      {priority.length > 0 || query ? (
        <FilterBarActive>
          {query ? (
            <FilterBarToken label="Text" onRemove={() => setQuery("")} removeLabel="Remove search">
              “{query}”
            </FilterBarToken>
          ) : null}
          {priority.length > 0 ? (
            <FilterBarToken label="Priority" onRemove={() => setPriority([])} removeLabel="Remove priority filter">
              {priority.join(", ")}
            </FilterBarToken>
          ) : null}
        </FilterBarActive>
      ) : null}

      <div className="divide-y divide-border rounded-box border border-border bg-card">
        {results.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No issues match these filters.</p>
        ) : (
          results.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">{t.id}</span>
              <span className="min-w-0 flex-1 truncate">{t.title}</span>
              <Badge
                size="sm"
                variant="soft"
                color={t.priority === "High" ? "destructive" : t.priority === "Medium" ? "warning" : "neutral"}
              >
                {t.priority}
              </Badge>
              <span className="hidden w-24 text-xs text-muted-foreground sm:block">{t.status}</span>
              <Avatar size="xs" name={t.assignee} src={photo(team.find((m) => m.name === t.assignee)?.img ?? 1)} />
            </div>
          ))
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Showing {results.length} of {tasks.length} issues
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Table                                                               */
/* ------------------------------------------------------------------ */

const invoices: Array<{ id: string; client: string; date: string; status: StatusBadgeStatus; label: string; amount: number }> = [
  { id: "INV-3066", client: "Acme Corp", date: "Jan 6, 2026", status: "success", label: "Paid", amount: 1250 },
  { id: "INV-3065", client: "Northwind Traders", date: "Jan 4, 2026", status: "pending", label: "Pending", amount: 640 },
  { id: "INV-3064", client: "Lumen Studio", date: "Jan 2, 2026", status: "success", label: "Paid", amount: 3200 },
  { id: "INV-3063", client: "Orbit Labs", date: "Dec 28, 2025", status: "error", label: "Overdue", amount: 980 },
  { id: "INV-3062", client: "Halcyon Health", date: "Dec 22, 2025", status: "draft", label: "Draft", amount: 450 },
];

const currency = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

/* ------------------------------------------------------------------ */
/* DataTable                                                           */
/* ------------------------------------------------------------------ */

interface Member {
  id: string;
  name: string;
  email: string;
  img: number;
  role: "Owner" | "Admin" | "Editor" | "Viewer";
  status: StatusBadgeStatus;
  projects: number;
  lastActive: Date;
}

const memberNames = [
  "Olivia Rhye", "Phoenix Baker", "Lana Steiner", "Demi Wilkinson", "Candice Wu",
  "Natali Craig", "Drew Cano", "Orlando Diggs", "Kate Morrison", "Koray Okumus",
  "Amélie Laurent", "Zahir Mays", "Ava Wright", "Joshua Wilson", "Sienna Hewitt",
  "Lily-Rose Chedjou", "Eduard Franz", "Mollie Hall", "Ethan Campbell", "Priya Natarajan",
];
const roles: Member["role"][] = ["Owner", "Admin", "Editor", "Editor", "Viewer"];
const memberStatuses: StatusBadgeStatus[] = ["active", "active", "away", "inactive", "pending"];

const members: Member[] = memberNames.map((name, i) => ({
  id: `m${i + 1}`,
  name,
  email: `${name.split(" ")[0]!.toLowerCase().normalize("NFD").replace(/[^a-z-]/g, "")}@sutra.app`,
  img: (i * 7) % 70 + 1,
  role: i === 0 ? "Owner" : roles[(i % 4) + 1]!,
  status: memberStatuses[(i * 3) % memberStatuses.length]!,
  projects: (i * 5) % 17 + 1,
  lastActive: new Date(Date.UTC(2026, 9, 18 - ((i * 4) % 30), 9 + (i % 8))),
}));

const roleColor = { Owner: "brand", Admin: "purple", Editor: "blue", Viewer: "neutral" } as const;

const memberColumns: DataTableColumn<Member>[] = [
  {
    key: "name",
    header: "Member",
    sortable: true,
    cell: (m) => <AvatarLabelGroup size="sm" name={m.name} supportingText={m.email} src={photo(m.img)} />,
  },
  {
    key: "role",
    header: "Role",
    sortable: true,
    cell: (m) => (
      <Badge size="sm" color={roleColor[m.role]}>
        {m.role}
      </Badge>
    ),
  },
  { key: "status", header: "Status", cell: (m) => <StatusBadge status={m.status} size="sm" variant="plain" /> },
  { key: "projects", header: "Projects", sortable: true, align: "right", className: "tabular-nums" },
  {
    key: "lastActive",
    header: "Last active",
    sortable: true,
    align: "right",
    className: "text-muted-foreground tabular-nums",
    cell: (m) => m.lastActive.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  },
];

function compare(a: Member, b: Member, key: string) {
  const av = a[key as keyof Member];
  const bv = b[key as keyof Member];
  if (av instanceof Date && bv instanceof Date) return av.getTime() - bv.getTime();
  if (typeof av === "number" && typeof bv === "number") return av - bv;
  return String(av).localeCompare(String(bv));
}

function DataTableDemo() {
  const [sort, setSort] = React.useState<DataTableSort | null>({ key: "name", direction: "asc" });
  const [selected, setSelected] = React.useState<string[]>(["m2", "m5"]);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(5);

  // Sort the full data set, then slice the page, so sorting spans every page.
  const sorted = React.useMemo(() => {
    if (!sort) return members;
    const dir = sort.direction === "asc" ? 1 : -1;
    return [...members].sort((a, b) => compare(a, b, sort.key) * dir);
  }, [sort]);
  const totalPages = Math.ceil(sorted.length / pageSize);
  const rows = sorted.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex min-h-8 items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {selected.length > 0 ? `${selected.length} of ${members.length} selected` : `${members.length} members`}
        </p>
        {selected.length > 0 ? (
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
              Clear
            </Button>
            <Button size="sm" variant="secondary" leadingIcon={<RiDownloadLine />}>
              Export
            </Button>
          </div>
        ) : null}
      </div>
      <DataTable
        columns={memberColumns}
        data={rows}
        selectable
        selectedRowIds={selected}
        onSelectionChange={setSelected}
        sort={sort}
        onSortChange={(next) => {
          setSort(next);
          setPage(1);
        }}
        manualSorting
      />
      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        size="sm"
        pageSize={pageSize}
        pageSizeOptions={[5, 10, 20]}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </div>
  );
}

function DataTableStatesDemo() {
  const [loading, setLoading] = React.useState(true);
  return (
    <div className="grid grid-cols-1 w-full gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <DemoLabel>Loading</DemoLabel>
          <Button size="xs" variant="ghost" onClick={() => setLoading((l) => !l)}>
            {loading ? "Show data" : "Show loading"}
          </Button>
        </div>
        <DataTable
          columns={memberColumns.slice(0, 3)}
          data={members.slice(0, 3)}
          loading={loading}
          loadingRows={3}
          density="compact"
        />
      </div>
      <div className="flex flex-col gap-2">
        <DemoLabel>Empty</DemoLabel>
        <DataTable columns={memberColumns.slice(0, 3)} data={[]} density="compact" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function CardDemo() {
  return (
    <Demo
      id="card"
      title="Card"
      description="A surface with composable parts: header (title, description, action), content and footer. size, as and the plain or panel footer; the old padded prop still works."
      align="start"
      canvasClassName="gap-8"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <DemoLabel>Default, with action and a plain footer</DemoLabel>
          <Card as="article" aria-labelledby="card-demo-plan">
            <CardHeader>
              <CardTitle as="h3" id="card-demo-plan">
                Team plan
              </CardTitle>
              <CardDescription>Billed yearly, renews on 14 March.</CardDescription>
              <CardAction>
                <Button size="sm" variant="ghost">
                  Edit
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">12 of 15 seats used. Guests and viewers are free.</CardContent>
            <CardFooter>
              <Button size="sm">Add seats</Button>
              <Button size="sm" variant="secondary">
                View invoices
              </Button>
            </CardFooter>
          </Card>
        </div>
        <div className="min-w-0 space-y-2">
          <DemoLabel>Panel footer, size="sm"</DemoLabel>
          <Card size="sm" as="section" aria-labelledby="card-demo-usage">
            <CardHeader>
              <CardTitle as="h3" id="card-demo-usage">
                API usage
              </CardTitle>
              <CardDescription>This billing period</CardDescription>
              <CardAction>
                <Badge color="blue">Live</Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">8.2M of 10M requests.</CardContent>
            <CardFooter variant="panel" className="justify-between">
              <span className="text-xs text-muted-foreground">Resets in 9 days</span>
              <Button size="xs" variant="secondary">
                Upgrade
              </Button>
            </CardFooter>
          </Card>
        </div>
        <div className="min-w-0 space-y-2">
          <DemoLabel>Content only, and the padded prop</DemoLabel>
          <div className="space-y-3">
            <Card>
              <CardContent className="text-sm text-muted-foreground">Content alone gets even padding on every side.</CardContent>
            </Card>
            <Card padded className="text-sm text-muted-foreground">
              <code>padded</code> pads the card itself, as before.
            </Card>
          </div>
        </div>
        <div className="min-w-0 space-y-2">
          <DemoLabel>As list items</DemoLabel>
          <ul className="space-y-2">
            {["Design review", "Launch checklist"].map((title) => (
              <Card as="li" size="sm" key={title} className="list-none">
                <CardHeader>
                  <CardTitle>{title}</CardTitle>
                  <CardDescription>Due Friday</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </ul>
        </div>
        <div className="min-w-0 space-y-2">
          <DemoLabel>Loading (skeleton in the real layout)</DemoLabel>
          <Card aria-busy="true">
            <span className="sr-only">Loading plan</span>
            <CardHeader>
              <Skeleton shape="text" className="w-1/3" />
              <Skeleton shape="text" className="w-2/3" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        </div>
        <div className="min-w-0 space-y-2">
          <DemoLabel>Empty</DemoLabel>
          <Card>
            <CardHeader>
              <CardTitle as="h3">Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState size="sm" title="No invoices yet" description="They show up after the first payment." />
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="max-w-[260px] space-y-2">
        <DemoLabel>Narrow container (260px): the header action stays beside the wrapped title</DemoLabel>
        <Card>
          <CardHeader>
            <CardTitle as="h3">A long card title that has to wrap onto two lines</CardTitle>
            <CardDescription>Supporting text stays in the first column.</CardDescription>
            <CardAction>
              <Button size="sm" variant="secondary">
                Edit
              </Button>
            </CardAction>
          </CardHeader>
          <CardFooter variant="panel">
            <Button size="sm">Save</Button>
            <Button size="sm" variant="ghost">
              Cancel
            </Button>
          </CardFooter>
        </Card>
      </div>
    </Demo>
  );
}

export function DataDisplayPage() {
  return (
    <PageIntro
      eyebrow="Components"
      title="Data display"
      description="Avatars, dividers, filter toolbars and tables for presenting people and records."
    >
      <Demo id="avatar" title="Avatar" description="Image with initials fallback, status dot and verified badge." align="start">
        <div className="space-y-6">
          <div className="space-y-3">
            <DemoLabel>Sizes</DemoLabel>
            <div className="flex flex-wrap items-end gap-4">
              {avatarSizes.map((size, i) => (
                <Avatar key={size} size={size} src={photo(team[i]!.img)} name={team[i]!.name} />
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <DemoLabel>Initials fallback (colour derived from name)</DemoLabel>
            <div className="flex flex-wrap items-center gap-3">
              {["Olivia Rhye", "Phoenix Baker", "Lana Steiner", "Demi Wilkinson", "Koray Okumus"].map((name) => (
                <Avatar key={name} name={name} />
              ))}
              <Avatar name="Neutral User" colorful={false} />
              <Avatar />
              <Avatar name="Broken Image" src="data:image/png;base64,broken" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-3">
              <DemoLabel>Status</DemoLabel>
              <div className="flex flex-wrap items-center gap-4">
                <Avatar size="lg" src={photo(47)} name="Olivia Rhye" status="online" />
                <Avatar size="lg" src={photo(12)} name="Phoenix Baker" status="away" />
                <Avatar size="lg" src={photo(45)} name="Lana Steiner" status="busy" />
                <Avatar size="lg" name="Demi Wilkinson" status="offline" />
              </div>
            </div>
            <div className="space-y-3">
              <DemoLabel>Square &amp; verified</DemoLabel>
              <div className="flex flex-wrap items-center gap-4">
                <Avatar size="lg" shape="square" src={photo(44)} name="Candice Wu" />
                <Avatar size="lg" shape="square" name="Acme Corp" status="online" />
                <Avatar size="lg" src={photo(26)} name="Natali Craig" verified />
                <Avatar size="lg" shape="square" src={photo(59)} name="Drew Cano" verified />
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <DemoLabel>Avatar label group</DemoLabel>
            <div className="flex flex-wrap items-center gap-8">
              <AvatarLabelGroup size="sm" name="Olivia Rhye" supportingText="olivia@sutra.app" src={photo(47)} />
              <AvatarLabelGroup size="md" name="Phoenix Baker" supportingText="Product designer" src={photo(12)} status="online" />
              <AvatarLabelGroup size="lg" name="Lana Steiner" supportingText="Engineering lead" src={photo(45)} verified />
            </div>
          </div>
        </div>
      </Demo>

      <Demo id="avatar-group" title="Avatar group" description="Overlapping stack with an overflow count and an add button." align="start">
        <div className="space-y-6">
          <div className="space-y-3">
            <DemoLabel>max=4 with overflow</DemoLabel>
            <AvatarGroup max={4}>
              {team.map((m) => (
                <Avatar key={m.name} src={photo(m.img)} name={m.name} />
              ))}
            </AvatarGroup>
          </div>
          <div className="space-y-3">
            <DemoLabel>total overrides the count (only 5 of 128 loaded) · tight spacing · onAdd</DemoLabel>
            <AvatarGroup size="lg" spacing="tight" max={5} total={128} onAdd={() => {}} addLabel="Invite teammate">
              {team.slice(0, 5).map((m) => (
                <Avatar key={m.name} src={photo(m.img)} name={m.name} />
              ))}
            </AvatarGroup>
          </div>
          <div className="flex flex-wrap items-center gap-10">
            <div className="space-y-3">
              <DemoLabel>Small, initials</DemoLabel>
              <AvatarGroup size="sm" max={3}>
                {team.slice(0, 6).map((m) => (
                  <Avatar key={m.name} name={m.name} />
                ))}
              </AvatarGroup>
            </div>
            <div className="space-y-3">
              <DemoLabel>Square</DemoLabel>
              <AvatarGroup shape="square" max={4}>
                {team.slice(2, 8).map((m) => (
                  <Avatar key={m.name} src={photo(m.img)} name={m.name} />
                ))}
              </AvatarGroup>
            </div>
          </div>
        </div>
      </Demo>

      <Demo id="separator" title="Separator" description="Horizontal or vertical rules, solid or dashed, with an optional label." align="start">
        <div className="space-y-8">
          <div className="space-y-3">
            <DemoLabel>Horizontal</DemoLabel>
            <div className="space-y-4 text-sm">
              <p>Account settings</p>
              <Separator />
              <p>Notifications</p>
              <Separator variant="dashed" />
              <p>Billing</p>
            </div>
          </div>
          <div className="space-y-3">
            <DemoLabel>With label</DemoLabel>
            <div className="space-y-5">
              <Separator label="OR" />
              <Separator label="Today" labelPosition="start" />
              <Separator label="Older messages" labelPosition="end" variant="dashed" />
            </div>
          </div>
          <div className="space-y-3">
            <DemoLabel>Vertical</DemoLabel>
            <div className="flex h-6 items-center gap-4 text-sm">
              <a href="#separator" className="flex min-h-6 items-center hover:underline">Docs</a>
              <Separator orientation="vertical" />
              <a href="#separator" className="flex min-h-6 items-center hover:underline">Changelog</a>
              <Separator orientation="vertical" />
              <a href="#separator" className="flex min-h-6 items-center hover:underline">Support</a>
            </div>
          </div>
        </div>
      </Demo>

      <Demo
        id="filter-bar"
        title="Filter bar"
        description="Search, multi-select filter chips, applied tokens and a clear action, all wired to live state."
        align="start"
      >
        <FilterBarDemo />
      </Demo>

      <Demo id="table" title="Table" description="Compound table primitives: header, body, footer and caption." align="start">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Issued</TableHead>
              <TableHead>Status</TableHead>
              <TableHead align="right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="whitespace-nowrap font-medium">{inv.id}</TableCell>
                <TableCell>{inv.client}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{inv.date}</TableCell>
                <TableCell>
                  <StatusBadge status={inv.status} label={inv.label} size="sm" />
                </TableCell>
                <TableCell align="right" className="tabular-nums">
                  {currency(inv.amount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={4}>Total</TableCell>
              <TableCell align="right" className="tabular-nums">
                {currency(invoices.reduce((sum, inv) => sum + inv.amount, 0))}
              </TableCell>
            </TableRow>
          </TableFooter>
          <TableCaption>Invoices issued in the last 30 days.</TableCaption>
        </Table>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <DemoLabel>density="compact" · striped</DemoLabel>
            <Table density="compact" striped>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead align="right">Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.slice(0, 5).map((m, i) => (
                  <TableRow key={m.name}>
                    <TableCell>{m.name}</TableCell>
                    <TableCell align="right" className="tabular-nums">
                      {32 + ((i * 7) % 11)}h
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="space-y-2">
            <DemoLabel>stickyHeader · maxHeight={200}</DemoLabel>
            <Table stickyHeader maxHeight={200} density="compact">
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead align="right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  "Deployed v2.14.0", "Invoice INV-3066 paid", "Olivia joined Design", "API key rotated",
                  "Backup completed", "Webhook retried", "Plan upgraded to Pro", "SSO enabled",
                  "Export generated", "Phoenix left Marketing",
                ].map((event, i) => (
                  <TableRow key={event}>
                    <TableCell>
                      <span className="inline-flex items-center gap-2">
                        <RiTimeLine className="size-4 text-muted-foreground" aria-hidden />
                        {event}
                      </span>
                    </TableCell>
                    <TableCell align="right" className="text-muted-foreground tabular-nums">
                      {String(9 + Math.floor(i / 2)).padStart(2, "0")}:{String((i * 17) % 60).padStart(2, "0")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </Demo>

      <Demo
        id="data-table"
        title="Data table"
        description="Column definitions with sorting and row selection. Paginated with Pagination: the full set is sorted (manualSorting) and then sliced."
        align="start"
      >
        <DataTableDemo />
      </Demo>

      <CardDemo />

      <Demo title="Data table states" description="Built-in skeleton loading and empty states." align="start">
        <DataTableStatesDemo />
      </Demo>
    </PageIntro>
  );
}
