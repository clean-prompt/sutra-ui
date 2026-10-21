import * as React from "react";
import {
  Badge,
  Button,
  CheckboxField,
  CodeBlock,
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  InlineAlert,
  InlineAlertDescription,
  InlineAlertTitle,
  InlineCode,
  Input,
  SearchInput,
  SimpleSelect,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
  Textarea,
  isEmail,
  isHttpUrl,
  useAsyncAction,
} from "@cleanprompt/sutra-ui";
import { buildSizingRows, describeRow, TARGET_PX } from "../../../../packages/ui/scripts/docs/sizing.mjs";
import { Demo, PageIntro } from "../components/demo";
import { useApiData, useNotesData, type ApiEntry } from "../components/demo-panels";

/* ---------------------------------------------------------------------------------------------- */
/* Shared: the filter row and the "show more" page size                                             */
/* ---------------------------------------------------------------------------------------------- */

const LAYERS = [
  { value: "all", label: "All layers" },
  { value: "primitives", label: "Primitives" },
  { value: "patterns", label: "Patterns" },
  { value: "kits", label: "Kits" },
  { value: "blocks", label: "Blocks" },
  { value: "assets", label: "Assets" },
];
const PAGE = 80;

function FilterBar({
  query,
  onQuery,
  layer,
  onLayer,
  label,
  summary,
}: {
  query: string;
  onQuery: (q: string) => void;
  layer: string;
  onLayer: (l: string) => void;
  label: string;
  summary: string;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <div className="min-w-0 flex-1 basis-64">
        <SearchInput aria-label={label} placeholder={label} value={query} onChange={(e) => onQuery(e.target.value)} clearable onClear={() => onQuery("")} />
      </div>
      <div className="w-40 shrink-0">
        <SimpleSelect aria-label="Filter by layer" value={layer} onValueChange={onLayer} options={LAYERS} />
      </div>
      <Text size="xs" tone="neutral" className="basis-full" role="status">
        {summary}
      </Text>
    </div>
  );
}

function Loading() {
  return (
    <div className="w-full space-y-2" aria-label="Loading the reference" aria-busy="true">
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

function NotGenerated() {
  return (
    <Text size="sm" tone="neutral">
      The reference is not generated yet: run <InlineCode>pnpm docs:gen</InlineCode>.
    </Text>
  );
}

const importPath = (entry: string) => (entry === "index" ? "@cleanprompt/sutra-ui" : `@cleanprompt/sutra-ui/${entry}`);

/* ---------------------------------------------------------------------------------------------- */
/* Styling hooks                                                                                    */
/* ---------------------------------------------------------------------------------------------- */

const SLOT_CSS = `/* Style a part from your stylesheet. The attribute is the contract; the class names are not. */
[data-slot="field-error"] {
  font-weight: 500;
}

/* Scoped to one place, so the rest of the app is untouched */
.settings-page [data-slot="sheet-content"] {
  --dialog: var(--card);
}`;

const SLOT_TSX = `// Tailwind arbitrary variants reach a slot inside a component you render
<Field className="[&_[data-slot=field-error]]:text-sm">…</Field>

// State is on the element too: data-state, data-disabled, data-side, data-nested …
<SheetContent className="data-[nested]:opacity-40" />`;

const THEME_HOOKS: [string, string][] = [
  ["--sutra-shadow-<name>", "Theme shadows: a style (data-style) redefines them; plain Tailwind theme shadows are inlined at build time."],
  ["--sutra-radius-action", "Radius of Button size xl (rounded-action)."],
  ["--dialog", "Surface of dialog, sheet and drawer (bg-dialog); equals --background in the stock theme."],
  ["--chart-1 … --chart-8", "The data-viz palette: charts, meters and the memory map read them."],
  ["--sutra-ease, --sutra-duration-*", "The motion tokens (fast 150 ms, 200 ms, slow 300 ms, fill 500 ms); a style retunes them."],
  ["--sutra-spring-gentle | snappy | bouncy", "Spring curves for transform properties, each with a -duration partner."],
  ["--sutra-drag-x, --sutra-drag-y", "Live offset of a gesture component (SwipeRow, SlideToConfirm, Drawer), written without React renders."],
  ["--sutra-progress", "Scroll progress (0 to 1) written by useScrollProgress where there is no native scroll timeline."],
  ["--sutra-accent", "The categorical colour of a section or metric (accentStyle); children inherit it."],
];

function slotNotes(notes: ReturnType<typeof useNotesData>, component: string): Map<string, string> {
  const out = new Map<string, string>();
  if (!notes) return out;
  const key = notes.index[component];
  for (const line of key ? (notes.notes[key]?.slots ?? []) : []) {
    const m = /^`([^`]+)`:?\s*(.*)$/.exec(line);
    if (m) out.set(m[1]!, m[2]!);
  }
  return out;
}

interface SlotRow {
  name: string;
  entry: ApiEntry;
  slots: string[];
}

function SlotTable() {
  const api = useApiData();
  const notes = useNotesData();
  const [query, setQuery] = React.useState("");
  const [layer, setLayer] = React.useState("all");
  const [limit, setLimit] = React.useState(PAGE);
  const deferred = React.useDeferredValue(query);
  const all = React.useMemo<SlotRow[]>(() => {
    if (!api) return [];
    return Object.entries(api.components)
      .map(([name, entry]) => ({ name, entry, slots: entry.slots ?? (entry.slot ? [entry.slot] : []) }))
      .filter((r) => r.slots.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [api]);
  const rows = React.useMemo(() => {
    const q = deferred.trim().toLowerCase();
    return all.filter((r) => (layer === "all" || r.entry.layer === layer) && (!q || r.name.toLowerCase().includes(q) || r.slots.some((s) => s.toLowerCase().includes(q))));
  }, [all, deferred, layer]);
  React.useEffect(() => setLimit(PAGE), [deferred, layer]);

  if (api === false) return <NotGenerated />;
  if (!api) return <Loading />;
  const slotCount = rows.reduce((n, r) => n + r.slots.length, 0);
  return (
    <div className="min-w-0 space-y-3">
      <FilterBar
        query={query}
        onQuery={setQuery}
        layer={layer}
        onLayer={setLayer}
        label="Filter by component or slot"
        summary={`${rows.length} of ${all.length} components with slots, ${slotCount} ${slotCount === 1 ? "slot" : "slots"} shown`}
      />
      <Table aria-label="data-slot names by component" density="compact" containerClassName="bg-background">
        <TableHeader>
          <TableRow>
            <TableHead className="w-px whitespace-nowrap">Component</TableHead>
            <TableHead className="min-w-56">data-slot</TableHead>
            <TableHead className="w-px whitespace-nowrap">Import</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.slice(0, limit).map((r) => {
            const described = slotNotes(notes, r.name);
            return (
              <TableRow key={r.name}>
                <TableCell className="align-top whitespace-nowrap">
                  <InlineCode>{r.name}</InlineCode>
                </TableCell>
                <TableCell className="align-top whitespace-normal">
                  <ul className="space-y-1">
                    {r.slots.map((slot) => (
                      <li key={slot} className="min-w-0 break-words text-sm">
                        <InlineCode>{slot}</InlineCode>
                        {described.get(slot) && <span className="text-muted-foreground"> {described.get(slot)}</span>}
                      </li>
                    ))}
                  </ul>
                </TableCell>
                <TableCell className="align-top whitespace-nowrap text-xs text-muted-foreground">{importPath(r.entry.entry)}</TableCell>
              </TableRow>
            );
          })}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                No component or slot matches “{deferred}”.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {rows.length > limit && (
        <Button variant="secondary" size="sm" onClick={() => setLimit((l) => l + PAGE)}>
          Show {Math.min(PAGE, rows.length - limit)} more
        </Button>
      )}
    </div>
  );
}

export function StylingHooksPage() {
  return (
    <PageIntro
      eyebrow="Foundations"
      title="Styling Hooks"
      description="Every data-slot a component renders, plus the CSS variables a style can retune. Reach a part from outside with an attribute selector; nothing has to be found through a parent selector."
    >
      <Demo
        id="usage"
        title="How to use the hooks"
        description="data-slot values are public for the components listed below: a rename is a breaking change, so they are safe to select. Class names inside components are not."
        align="start"
        props={false}
        code={false}
      >
        <div className="min-w-0 space-y-3">
          <CodeBlock code={SLOT_CSS} language="css" theme="light" filename="app.css" />
          <CodeBlock code={SLOT_TSX} language="tsx" theme="light" filename="usage.tsx" />
          <Text size="sm" tone="neutral" className="max-w-3xl">
            Where a part needs its own prop the component has one (<InlineCode>className</InlineCode>, <InlineCode>contentClassName</InlineCode>, <InlineCode>overlayClassName</InlineCode>, <InlineCode>wrapperClassName</InlineCode>); a note under a
            component's demo lists what each of its slots is. Portalled layers render into <InlineCode>&lt;body&gt;</InlineCode>, so put a theme or style attribute on <InlineCode>&lt;html&gt;</InlineCode> to reach them.
          </Text>
        </div>
      </Demo>
      <Demo
        id="reference"
        title="data-slot by component"
        description="Generated from the source by pnpm docs:gen. Search matches a component or a slot name."
        align="start"
        props={false}
        code={false}
      >
        <SlotTable />
      </Demo>
      <Demo id="variables" title="Theme and motion variables" description="Custom properties a style or an app can set. They are documented in CONVENTIONS and covered by tests." align="start" props={false} code={false}>
        <Table aria-label="Public CSS variables" density="compact" containerClassName="bg-background">
          <TableHeader>
            <TableRow>
              <TableHead className="w-px whitespace-nowrap">Variable</TableHead>
              <TableHead className="min-w-56">What it does</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {THEME_HOOKS.map(([name, text]) => (
              <TableRow key={name}>
                <TableCell className="align-top whitespace-nowrap">
                  <InlineCode>{name}</InlineCode>
                </TableCell>
                <TableCell className="align-top whitespace-normal text-sm">{text}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Demo>
    </PageIntro>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* Sizing                                                                                           */
/* ---------------------------------------------------------------------------------------------- */

function SizingTable() {
  const api = useApiData();
  const [query, setQuery] = React.useState("");
  const [layer, setLayer] = React.useState("all");
  const [limit, setLimit] = React.useState(PAGE * 2);
  const deferred = React.useDeferredValue(query);
  const all = React.useMemo(() => (api ? buildSizingRows(api) : []), [api]);
  const rows = React.useMemo(() => {
    const q = deferred.trim().toLowerCase();
    return all.filter((r) => (layer === "all" || r.layer === layer) && (!q || r.component.toLowerCase().includes(q) || r.size.toLowerCase().includes(q)));
  }, [all, deferred, layer]);
  React.useEffect(() => setLimit(PAGE * 2), [deferred, layer]);

  if (api === false) return <NotGenerated />;
  if (!api) return <Loading />;
  const components = new Set(rows.map((r) => r.component)).size;
  return (
    <div className="min-w-0 space-y-3">
      <FilterBar
        query={query}
        onQuery={setQuery}
        layer={layer}
        onLayer={setLayer}
        label="Filter by component or size"
        summary={`${rows.length} of ${all.length} sizes, ${components} ${components === 1 ? "component" : "components"} shown`}
      />
      <Table aria-label="Sizes by component" density="compact" containerClassName="bg-background">
        <TableHeader>
          <TableRow>
            <TableHead className="w-px whitespace-nowrap">Component</TableHead>
            <TableHead className="w-px whitespace-nowrap">Size</TableHead>
            <TableHead className="whitespace-nowrap">Box</TableHead>
            <TableHead className="whitespace-nowrap">Padding</TableHead>
            <TableHead className="whitespace-nowrap">Text</TableHead>
            <TableHead className="whitespace-nowrap">Icon</TableHead>
            <TableHead className="min-w-40">Target</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.slice(0, limit).map((r, i, shown) => {
            const d = describeRow(r);
            const first = shown[i - 1]?.component !== r.component;
            return (
              <TableRow key={`${r.component}:${r.size}`}>
                <TableCell className="align-top whitespace-nowrap">
                  {first ? <InlineCode>{r.component}</InlineCode> : <span className="sr-only">{r.component}</span>}
                </TableCell>
                <TableCell className="align-top whitespace-nowrap">
                  <InlineCode>{r.size}</InlineCode>
                  {r.isDefault && (
                    <Badge size="sm" className="ms-1.5">
                      default
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="align-top whitespace-nowrap text-sm">{d.box || (r.nested ? <span className="text-muted-foreground" title={r.raw}>parts</span> : null)}</TableCell>
                <TableCell className="align-top whitespace-nowrap text-sm">{d.padding}</TableCell>
                <TableCell className="align-top whitespace-nowrap text-sm">{d.text}</TableCell>
                <TableCell className="align-top whitespace-nowrap text-sm">{d.icon}</TableCell>
                <TableCell className="align-top whitespace-normal">
                  {r.under && (
                    <Badge size="sm" tone={r.hit ? "success" : "warning"} title={r.hit ? "Visually under 24px; the module adds an invisible target of at least 24px (hitArea)." : "Under 24px: fine for something that is not clickable; an interactive control needs a hit area."}>
                      {r.hit ? "hit area to 24px" : "under 24px"}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                No size matches “{deferred}”.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {rows.length > limit && (
        <Button variant="secondary" size="sm" onClick={() => setLimit((l) => l + PAGE * 2)}>
          Show {Math.min(PAGE * 2, rows.length - limit)} more
        </Button>
      )}
    </div>
  );
}

export function SizingPage() {
  return (
    <PageIntro
      eyebrow="Foundations"
      title="Sizing"
      description="What each size step of a component sets, read from its size variant by pnpm docs:gen, so the table cannot drift. Spacing is 4px per step; control heights are sm 32px, md 36px and lg 40px."
    >
      <Demo
        id="reference"
        title="Sizes by component"
        description={`Heights, padding, text and icon sizes, and which steps fall under ${TARGET_PX}px (WCAG 2.5.8). A badge or spinner is not a target; a clickable control under ${TARGET_PX}px extends its hit area instead of growing.`}
        align="start"
        props={false}
        code={false}
      >
        <SizingTable />
      </Demo>
      <Demo id="scale" title="One scale, with exceptions" description="Text controls (Input, Select, Combobox, DatePicker, Tabs) take sm, md and lg. Button goes from xs to xl and adds five square icon sizes; Avatar goes up to 2xl; Progress goes down to 2xs." align="start" props={false} code={false}>
        <Text size="sm" tone="neutral" className="max-w-3xl">
          The table reads class text: a variant or size map, a lookup such as <InlineCode>barHeight[size]</InlineCode>, or a <InlineCode>size === "sm" ?</InlineCode> chain that covers every size. A numeric <InlineCode>size</InlineCode> (logos, QR codes, rings) and sizes worked out from several props are not in it; that prop is documented under the demo's Props panel.
        </Text>
      </Demo>
    </PageIntro>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* Form recipes                                                                                     */
/* ---------------------------------------------------------------------------------------------- */

interface SignupValues {
  name: string;
  email: string;
  website: string;
  plan: string;
  bio: string;
  terms: boolean;
}

const EMPTY: SignupValues = { name: "", email: "", website: "", plan: "", bio: "", terms: false };
type Errors = Partial<Record<keyof SignupValues, string>>;

/** Pure validation: the same function runs on blur, on change after an error and on submit. */
function validate(v: SignupValues): Errors {
  const e: Errors = {};
  if (!v.name.trim()) e.name = "Enter your name";
  if (!v.email.trim()) e.email = "Enter your email";
  else if (!isEmail(v.email)) e.email = "That does not look like an email address";
  if (v.website.trim() && !isHttpUrl(v.website.trim())) e.website = "Use a full http or https address";
  if (!v.plan) e.plan = "Choose a plan";
  if (!v.terms) e.terms = "Accept the terms to continue";
  return e;
}

const PLANS = [
  { value: "free", label: "Free", description: "One project" },
  { value: "team", label: "Team", description: "Unlimited projects" },
  { value: "scale", label: "Scale", description: "SSO and audit log" },
];

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function SignupForm() {
  const [values, setValues] = React.useState<SignupValues>(EMPTY);
  const [touched, setTouched] = React.useState<Partial<Record<keyof SignupValues, boolean>>>({});
  const [done, setDone] = React.useState<string | null>(null);
  const errors = validate(values);
  const shown = (k: keyof SignupValues) => (touched[k] ? errors[k] : undefined);

  // `taken@example.com` is rejected by the pretend server, so the failure path is one click away.
  const submit = useAsyncAction(
    async (v: SignupValues) => {
      await wait(900);
      if (v.email.toLowerCase() === "taken@example.com") throw new Error("That email is already registered. Sign in instead?");
      return v.name;
    },
    { onSuccess: (name) => setDone(name), fallbackMessage: "The request failed. Try again." }
  );

  const set = <K extends keyof SignupValues>(key: K, value: SignupValues[K]) => setValues((v) => ({ ...v, [key]: value }));
  const blur = (key: keyof SignupValues) => setTouched((t) => ({ ...t, [key]: true }));

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setTouched({ name: true, email: true, website: true, plan: true, terms: true });
    setDone(null);
    if (Object.keys(validate(values)).length > 0) return;
    void submit.run(values);
  };

  if (done) {
    return (
      <div className="w-full max-w-md space-y-3">
        <InlineAlert tone="success">
          <InlineAlertTitle>Welcome, {done}</InlineAlertTitle>
          <InlineAlertDescription>Your {PLANS.find((p) => p.value === values.plan)?.label} workspace is ready.</InlineAlertDescription>
        </InlineAlert>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setDone(null);
            setValues(EMPTY);
            setTouched({});
            submit.reset();
          }}
        >
          Start over
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="w-full max-w-md space-y-4" aria-busy={submit.busy}>
      <FieldGroup>
        <Field invalid={!!shown("name")} required disabled={submit.busy}>
          <FieldLabel>Name</FieldLabel>
          <Input value={values.name} onChange={(e) => set("name", e.target.value)} onBlur={() => blur("name")} autoComplete="name" />
          <FieldError errors={[shown("name")]} />
        </Field>
        <Field invalid={!!shown("email")} required disabled={submit.busy}>
          <FieldLabel>Email</FieldLabel>
          <Input type="email" value={values.email} onChange={(e) => set("email", e.target.value)} onBlur={() => blur("email")} autoComplete="email" inputMode="email" />
          <FieldDescription>Try taken@example.com to see a server error.</FieldDescription>
          <FieldError errors={[shown("email")]} />
        </Field>
        <Field invalid={!!shown("website")} disabled={submit.busy}>
          <FieldLabel>Website</FieldLabel>
          <Input value={values.website} onChange={(e) => set("website", e.target.value)} onBlur={() => blur("website")} placeholder="https://" inputMode="url" />
          <FieldError errors={[shown("website")]} />
        </Field>
        <Field invalid={!!shown("plan")} required disabled={submit.busy}>
          <FieldLabel>Plan</FieldLabel>
          <SimpleSelect
            options={PLANS}
            value={values.plan}
            onValueChange={(v) => {
              set("plan", v);
              blur("plan");
            }}
            placeholder="Choose a plan"
          />
          <FieldError errors={[shown("plan")]} />
        </Field>
        <Field disabled={submit.busy}>
          <FieldLabel hint="Optional">About you</FieldLabel>
          <Textarea value={values.bio} onChange={(e) => set("bio", e.target.value)} minRows={2} maxRows={5} />
        </Field>
        <Field invalid={!!shown("terms")} disabled={submit.busy}>
          <CheckboxField
            label="I accept the terms"
            checked={values.terms}
            onCheckedChange={(c) => {
              set("terms", c === true);
              blur("terms");
            }}
          />
          <FieldError errors={[shown("terms")]} />
        </Field>
      </FieldGroup>
      {submit.error && (
        <InlineAlert tone="destructive">
          <InlineAlertDescription>{submit.error}</InlineAlertDescription>
        </InlineAlert>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" loading={submit.busy}>
          {submit.busy ? "Creating" : "Create workspace"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setValues(EMPTY);
            setTouched({});
            submit.reset();
          }}
          disabled={submit.busy}
        >
          Reset
        </Button>
      </div>
    </form>
  );
}

/** The three states of an async action on their own: idle, busy, failed, done. */
function AsyncStates() {
  const [outcome, setOutcome] = React.useState<"ok" | "fail">("ok");
  const [last, setLast] = React.useState<string | null>(null);
  const action = useAsyncAction(
    async () => {
      await wait(1200);
      if (outcome === "fail") throw new Error("The server said no");
      return "Saved";
    },
    { onSuccess: setLast }
  );
  return (
    <div className="w-full max-w-md space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button loading={action.busy} onClick={() => void action.run()}>
          Save
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setOutcome((o) => (o === "ok" ? "fail" : "ok"))}>
          Next run: {outcome === "ok" ? "succeeds" : "fails"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => void (action.reset(), setLast(null))}>
          Reset
        </Button>
      </div>
      <div role="status" className="min-h-6 text-sm">
        {action.busy ? <span className="text-muted-foreground">Saving</span> : action.error ? <span className="text-destructive">{action.error}</span> : last ? <span className="text-success">{last}</span> : <span className="text-muted-foreground">Idle</span>}
      </div>
      <Text size="xs" tone="neutral">
        <InlineCode>run</InlineCode> never rejects. A newer run supersedes an older one, and a result that arrives after unmount is dropped. <InlineCode>busy</InlineCode>, <InlineCode>error</InlineCode> and <InlineCode>reset</InlineCode> come
        from the hook.
      </Text>
    </div>
  );
}

const RHF_SNIPPET = `// Snippet only: react-hook-form is not a dependency of Sutra or of this playground.
import { Controller, useForm } from "react-hook-form";
import {
  Button, CheckboxField, DatePicker, Field, FieldDescription, FieldError, FieldLabel,
  Input, SimpleSelect, Slider, SwitchField, Textarea,
} from "@cleanprompt/sutra-ui";

interface Values {
  name: string;
  plan: string;
  seats: number;
  start?: Date;
  notes: string;
  newsletter: boolean;
  terms: boolean;
}

export function SettingsForm({ onSave }: { onSave: (values: Values) => Promise<void> }) {
  const { control, handleSubmit, formState } = useForm<Values>({
    defaultValues: { name: "", plan: "", seats: 5, notes: "", newsletter: false, terms: false },
  });

  return (
    <form onSubmit={handleSubmit(onSave)} noValidate className="space-y-4">
      <Controller
        name="name"
        control={control}
        rules={{ required: "Enter a name" }}
        render={({ field, fieldState }) => (
          <Field invalid={fieldState.invalid} required>
            <FieldLabel>Name</FieldLabel>
            {/* field = { value, onChange, onBlur, name, ref }: it spreads onto Input as it is */}
            <Input {...field} />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <Controller
        name="plan"
        control={control}
        rules={{ required: "Choose a plan" }}
        render={({ field, fieldState }) => (
          <Field invalid={fieldState.invalid} required>
            <FieldLabel>Plan</FieldLabel>
            {/* value/onValueChange map to value/onChange; the trigger needs the ref and onBlur by hand */}
            <SimpleSelect
              ref={field.ref}
              value={field.value}
              onValueChange={field.onChange}
              options={[{ value: "free", label: "Free" }, { value: "team", label: "Team" }]}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <Controller
        name="seats"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel>Seats</FieldLabel>
            {/* Slider values are arrays */}
            <Slider min={1} max={50} value={[field.value]} onValueChange={([seats]) => field.onChange(seats)} />
            <FieldDescription>{field.value} seats</FieldDescription>
          </Field>
        )}
      />

      <Controller
        name="start"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel>Start date</FieldLabel>
            <DatePicker value={field.value} onValueChange={field.onChange} />
          </Field>
        )}
      />

      <Controller name="notes" control={control} render={({ field }) => <Textarea {...field} aria-label="Notes" />} />

      <Controller
        name="newsletter"
        control={control}
        render={({ field }) => <SwitchField label="Send me product news" checked={field.value} onCheckedChange={field.onChange} />}
      />

      <Controller
        name="terms"
        control={control}
        rules={{ validate: (v) => v || "Accept the terms" }}
        render={({ field, fieldState }) => (
          <Field invalid={fieldState.invalid}>
            {/* Radix checkboxes report boolean | "indeterminate" */}
            <CheckboxField label="I accept the terms" checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <Button type="submit" loading={formState.isSubmitting}>Save</Button>
    </form>
  );
}`;

const SCHEMA_SNIPPET = `// Snippet only: zod and @hookform/resolvers are not dependencies of Sutra or of this playground.
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Button, Field, FieldError, FieldLabel, Input, SimpleSelect, useAsyncAction } from "@cleanprompt/sutra-ui";

// One schema is the source of truth for the types, the client check and (if you share it) the server check.
const schema = z.object({
  email: z.string().min(1, "Enter your email").email("That does not look like an email address"),
  website: z.union([z.literal(""), z.string().url("Use a full http or https address")]),
  plan: z.enum(["free", "team", "scale"], { error: "Choose a plan" }),
});
type Values = z.infer<typeof schema>;

export function Signup({ createAccount }: { createAccount: (values: Values) => Promise<void> }) {
  const { control, handleSubmit, setError } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", website: "", plan: undefined },
  });

  // useAsyncAction owns busy and the error text; a server field error goes back into the form.
  const save = useAsyncAction(
    async (values: Values) => {
      try {
        await createAccount(values);
      } catch (error) {
        if (error instanceof Error && error.message.includes("email")) {
          setError("email", { message: error.message });
          return; // handled as a field error, not a form error
        }
        throw error; // shown by save.error
      }
    },
    { fallbackMessage: "The request failed. Try again." }
  );

  return (
    <form onSubmit={handleSubmit((values) => save.run(values))} noValidate className="space-y-4">
      <Controller
        name="email"
        control={control}
        render={({ field, fieldState }) => (
          <Field invalid={fieldState.invalid} required>
            <FieldLabel>Email</FieldLabel>
            <Input {...field} type="email" />
            {/* FieldError takes errors from the form library as they are: strings or { message } */}
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />
      <Controller
        name="plan"
        control={control}
        render={({ field, fieldState }) => (
          <Field invalid={fieldState.invalid} required>
            <FieldLabel>Plan</FieldLabel>
            <SimpleSelect ref={field.ref} value={field.value ?? ""} onValueChange={field.onChange} options={[{ value: "free", label: "Free" }, { value: "team", label: "Team" }, { value: "scale", label: "Scale" }]} />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />
      {save.error && <p role="alert" className="text-sm text-destructive">{save.error}</p>}
      <Button type="submit" loading={save.busy}>Create account</Button>
    </form>
  );
}`;

const MAPPING: [string, string, string][] = [
  ["Input, Textarea, PasswordInput", "{...field}", "They are plain controlled inputs: value, onChange, onBlur, name and ref fit."],
  ["SimpleSelect, Select, Combobox, DatePicker, NumberInput", "value={field.value} onValueChange={field.onChange}", "Sutra's value callbacks receive the value itself, not an event. Pass ref={field.ref} to focus the control on error."],
  ["Checkbox, CheckboxField, Switch, SwitchField", "checked={field.value} onCheckedChange={field.onChange}", "Radix checkboxes call back with boolean or \"indeterminate\": use (c) => field.onChange(c === true)."],
  ["Slider, RangeSlider", "value={[field.value]} onValueChange={([v]) => field.onChange(v)}", "Slider values are arrays, even for one thumb."],
  ["RadioGroup, RadioGroupField", "value={field.value} onValueChange={field.onChange}", "One value for the group; the group takes invalid."],
  ["Field, FieldError", "invalid={fieldState.invalid}  errors={[fieldState.error]}", "Field passes id, invalid, required and aria-describedby to the control inside it; FieldError accepts { message } objects and renders as role=alert."],
];

export function FormRecipesPage() {
  return (
    <PageIntro
      eyebrow="Foundations"
      title="Form Recipes"
      description="Sutra has no form-state library on purpose. Field wires labels, hints and errors; validate with lib/validate or a schema, track submission with useAsyncAction, and bring react-hook-form if you want field arrays and dirty tracking."
    >
      <Demo
        id="field-validation"
        title="Field, validators and a submit action"
        description="Plain state and one pure validate function. Errors show after blur and on submit, clear as you fix them; the pretend server rejects taken@example.com."
        align="start"
        props={["Field", "FieldError", "useAsyncAction"]}
      >
        <SignupForm />
      </Demo>
      <Demo
        id="async-states"
        title="useAsyncAction: idle, busy, failed, done"
        description="busy, error and reset on their own, for any button that triggers work: save, delete, retry."
        align="start"
        props={["useAsyncAction"]}
      >
        <AsyncStates />
      </Demo>
      <Demo
        id="mapping"
        title="Which props map onto a form library"
        description="Every Sutra control is controlled with value and a callback that gets the value, so a Controller adapter is a one-liner."
        align="start"
        props={false}
        code={false}
      >
        <Table aria-label="Mapping controls to react-hook-form" density="compact" containerClassName="bg-background">
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-40">Controls</TableHead>
              <TableHead className="min-w-56">Wire it as</TableHead>
              <TableHead className="min-w-56">Why</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MAPPING.map(([controls, wire, why]) => (
              <TableRow key={controls}>
                <TableCell className="align-top whitespace-normal text-sm">{controls}</TableCell>
                <TableCell className="align-top whitespace-normal">
                  <code className="break-words font-mono text-xs">{wire}</code>
                </TableCell>
                <TableCell className="align-top whitespace-normal text-sm">{why}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Demo>
      <Demo
        id="react-hook-form"
        title="react-hook-form (snippet)"
        description="Code only: react-hook-form is not installed here, so this is not a live demo."
        align="start"
        props={false}
        code={false}
      >
        <div className="min-w-0 space-y-3">
          <InlineAlert tone="info">
            <InlineAlertTitle>Snippet</InlineAlertTitle>
            <InlineAlertDescription>Copy it into an app that has react-hook-form. The Sutra side (Field, FieldError, the value callbacks) is the same as in the live demo above.</InlineAlertDescription>
          </InlineAlert>
          <CodeBlock code={RHF_SNIPPET} language="tsx" theme="light" filename="settings-form.tsx" maxHeight={520} />
        </div>
      </Demo>
      <Demo
        id="schema"
        title="A schema library (snippet)"
        description="Code only: zod and @hookform/resolvers are not installed here. Any resolver works the same way."
        align="start"
        props={false}
        code={false}
      >
        <div className="min-w-0 space-y-3">
          <InlineAlert tone="info">
            <InlineAlertTitle>Snippet</InlineAlertTitle>
            <InlineAlertDescription>One schema gives the types and the messages; useAsyncAction keeps the submit state and sends a server error back to its field.</InlineAlertDescription>
          </InlineAlert>
          <CodeBlock code={SCHEMA_SNIPPET} language="tsx" theme="light" filename="signup.tsx" maxHeight={520} />
        </div>
      </Demo>
    </PageIntro>
  );
}
