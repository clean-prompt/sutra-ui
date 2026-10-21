import * as React from "react";
import {
  Badge,
  Button,
  CodeBlock,
  InlineCode,
  Kbd,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
  cn,
} from "@sutra/ui";
import { RiBookOpenLine, RiCodeSSlashLine, RiDownload2Line, RiListCheck3 } from "@sutra/ui/icons";
import demoSources from "virtual:demo-source";
import { useHashRoute } from "../router";

/* ---------------------------------------------------------------------------------------------- */
/* Data: per-page demo sources (built from the page files by plugins/demo-source.ts) and api.json   */
/* ---------------------------------------------------------------------------------------------- */

export interface DemoSource {
  code: string;
  imports: string;
  names: string[];
  helpers: string[];
  props: string[];
}

export interface ApiProp {
  name: string;
  type: string;
  required: boolean;
  default?: string;
  description?: string;
  deprecated?: string;
}

export interface ApiEntry {
  kind: "component" | "hook";
  module: string;
  layer: string;
  kit?: string;
  entry: string;
  description?: string;
  deprecated?: string;
  slot?: string;
  /** Every `data-slot` the declaration renders, when there is more than one. */
  slots?: string[];
  /** Class text of each `size` step (cva variant or size map). */
  sizes?: Record<string, string>;
  hitArea?: boolean;
  inherits?: string[];
  signature?: string;
  props: ApiProp[];
}

export interface ApiIndex {
  components: Record<string, ApiEntry>;
  hooks: Record<string, ApiEntry>;
}

export interface PageSources {
  demos: Record<string, DemoSource>;
  /** Import lines for everything the page's demos use. */
  imports: string;
}

const sourceCache = new Map<string, Promise<PageSources>>();
function loadSources(route: string): Promise<PageSources> {
  const empty: PageSources = { demos: {}, imports: "" };
  const load = demoSources[route];
  if (!load) return Promise.resolve(empty);
  let promise = sourceCache.get(route);
  if (!promise) {
    promise = load().then((m) => ({ demos: m.default, imports: m.imports }), () => empty);
    sourceCache.set(route, promise);
  }
  return promise;
}

/** The sources of the current page: `undefined` while its chunk loads. */
export function usePageSources(): PageSources | undefined {
  const { section, page } = useHashRoute();
  const route = `${section}/${page}`;
  const [loaded, setLoaded] = React.useState<{ route: string; sources: PageSources } | null>(null);
  React.useEffect(() => {
    let live = true;
    loadSources(route).then((sources) => live && setLoaded({ route, sources }));
    return () => {
      live = false;
    };
  }, [route]);
  return loaded && loaded.route === route ? loaded.sources : undefined;
}

let apiPromise: Promise<ApiIndex> | undefined;
function loadApi(): Promise<ApiIndex> {
  apiPromise ??= import("../generated/api.json").then((m) => m.default as ApiIndex);
  return apiPromise;
}

export type NoteBlock = { type: "p"; text: string } | { type: "ul"; items: string[] } | { type: "table"; head: string[]; rows: string[][] };

/** A per-component note (docs/notes/<Name>.md, parsed by `pnpm docs:gen`). */
export interface ComponentNote {
  component: string;
  module: string;
  covers: string[];
  use: string;
  instead: [string, string][];
  server: "ssr-safe" | "mixed" | "client-only";
  keyboard: NoteBlock[];
  screenReaders: NoteBlock[];
  motion: NoteBlock[];
  ssr: NoteBlock[];
  slots: string[];
  gotchas: string[];
  /** A minimal, type-checked example module (empty when the note has none). */
  example: string;
}

export interface NotesData {
  notes: Record<string, ComponentNote>;
  /** Exported component name to the note that explains it. */
  index: Record<string, string>;
}

let notesPromise: Promise<NotesData> | undefined;
function loadNotesData(): Promise<NotesData> {
  notesPromise ??= import("../generated/notes.json").then((m) => m.default as unknown as NotesData);
  return notesPromise;
}

/** The notes data, `null` while it loads (it is a lazy chunk) and `false` if it is not generated. */
export function useNotesData(): NotesData | null | false {
  const [data, setData] = React.useState<NotesData | null | false>(null);
  React.useEffect(() => {
    let live = true;
    loadNotesData().then(
      (d) => live && setData(d),
      () => live && setData(false)
    );
    return () => {
      live = false;
    };
  }, []);
  return data;
}

/** The generated API index, `null` while its (large, lazy) chunk loads and `false` if it is not generated. */
export function useApiData(): ApiIndex | null | false {
  const [api, setApi] = React.useState<ApiIndex | null | false>(null);
  React.useEffect(() => {
    let live = true;
    loadApi().then(
      (a) => live && setApi(a),
      () => live && setApi(false)
    );
    return () => {
      live = false;
    };
  }, []);
  return api;
}

/** The generated source of a Demo on the current page: `undefined` while the page's sources load. */
function useDemoSource(key: string | undefined): DemoSource | null | undefined {
  const sources = usePageSources();
  if (!sources) return undefined;
  return key ? (sources.demos[key] ?? null) : null;
}

/* ---------------------------------------------------------------------------------------------- */
/* Panels                                                                                           */
/* ---------------------------------------------------------------------------------------------- */

/** JSDoc text with `code` spans rendered as code. */
function Prose({ text }: { text: string }) {
  return (
    <>
      {text.split(/`([^`]+)`/).map((part, i) =>
        i % 2 ? (
          <code key={i} className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.85em]">
            {part}
          </code>
        ) : (
          part
        )
      )}
    </>
  );
}

const firstParagraph = (text: string) => text.split(/\n\s*\n/)[0]!.replace(/\n/g, " ");

function importPath(entry: string) {
  return entry === "index" ? "@sutra/ui" : `@sutra/ui/${entry}`;
}

function PropsTable({ props, label }: { props: ApiProp[]; label: string }) {
  if (props.length === 0) return null;
  return (
    <Table aria-label={label} density="compact" containerClassName="bg-background">
      <TableHeader>
        <TableRow>
          <TableHead className="w-px whitespace-nowrap">Prop</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="w-px whitespace-nowrap">Default</TableHead>
          <TableHead className="min-w-56">Description</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.map((p) => (
          <TableRow key={p.name}>
            <TableCell className="align-top whitespace-nowrap">
              <InlineCode>{p.name}</InlineCode>
              {p.required && (
                <span aria-label="required" title="required" className="ms-0.5 text-destructive">
                  *
                </span>
              )}
              {p.deprecated && (
                <Badge size="sm" tone="warning" className="ms-1.5">
                  Deprecated
                </Badge>
              )}
            </TableCell>
            <TableCell className="align-top">
              <code className="block max-w-[34rem] whitespace-normal break-words font-mono text-xs text-muted-foreground">{p.type}</code>
            </TableCell>
            <TableCell className="align-top whitespace-nowrap">
              {p.default ? <InlineCode>{p.default}</InlineCode> : <span className="text-muted-foreground">–</span>}
            </TableCell>
            <TableCell className="align-top whitespace-normal text-sm">
              {p.description ? (
                <span className="whitespace-pre-line">
                  <Prose text={`${p.deprecated && p.deprecated !== "Deprecated." ? `${p.deprecated} ` : ""}${p.description}`} />
                </span>
              ) : (
                <span className="text-muted-foreground">No description yet</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function EntryProps({ name, entry, api }: { name: string; entry: ApiEntry; api: ApiIndex }) {
  const parts = Object.entries(api.components)
    .filter(([n, c]) => entry.kind === "component" && c.module === entry.module && n !== name && n.startsWith(name))
    .sort(([a], [b]) => a.localeCompare(b));
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <InlineCode>{entry.kind === "hook" ? `${name}()` : `<${name}>`}</InlineCode>
          <Badge size="sm">{entry.kit ? `kit: ${entry.kit}` : entry.layer}</Badge>
          {entry.deprecated && (
            <Badge size="sm" tone="warning">
              Deprecated
            </Badge>
          )}
        </div>
        {entry.description && (
          <Text size="sm" tone="neutral" className="max-w-3xl">
            <Prose text={firstParagraph(entry.description)} />
          </Text>
        )}
        <Text size="xs" tone="neutral" className="break-words">
          <code className="font-mono">{`import { ${name} } from "${importPath(entry.entry)}"`}</code>
          {(entry.slots ?? (entry.slot ? [entry.slot] : [])).map((slot) => (
            <React.Fragment key={slot}>
              {" · "}
              <code className="font-mono">{`data-slot="${slot}"`}</code>
            </React.Fragment>
          ))}
        </Text>
        {entry.signature && <code className="block break-words font-mono text-xs text-muted-foreground">{entry.signature}</code>}
      </div>
      <PropsTable props={entry.props} label={`${name} props`} />
      {entry.props.length === 0 && (
        <Text size="xs" tone="neutral">
          {entry.inherits?.length ? `No props of its own. Accepts the props of ${entry.inherits.join(", ")}.` : "No props of its own."}
        </Text>
      )}
      {entry.props.length > 0 && entry.inherits && entry.inherits.length > 0 && (
        <Text size="xs" tone="neutral">
          Also accepts the props of {entry.inherits.join(", ")}.
        </Text>
      )}
      {parts.length > 0 && (
        <div className="space-y-2">
          {parts.filter(([, part]) => part.props.length > 0).map(([partName, part]) => (
            <details key={partName} className="group rounded-control border border-border bg-background">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm [&::-webkit-details-marker]:hidden">
                <InlineCode>{partName}</InlineCode>
                <span className="text-xs text-muted-foreground">
                  {part.props.length} {part.props.length === 1 ? "prop" : "props"}
                </span>
              </summary>
              <div className="space-y-2 border-t border-border p-3">
                {part.description && (
                  <Text size="sm" tone="neutral">
                    <Prose text={firstParagraph(part.description)} />
                  </Text>
                )}
                <PropsTable props={part.props} label={`${partName} props`} />
                {part.props.length === 0 && (
                  <Text size="xs" tone="neutral">
                    No props of its own.
                  </Text>
                )}
              </div>
            </details>
          ))}
          {parts.some(([, part]) => part.props.length === 0) && (
            <Text size="xs" tone="neutral" className="break-words">
              Parts without props of their own: {parts.filter(([, part]) => part.props.length === 0).map(([n]) => n).join(", ")}.
            </Text>
          )}
        </div>
      )}
    </div>
  );
}

/** Generated props of the named components and hooks (read from the types and JSDoc by `pnpm docs:gen`). */
export function PropsPanel({ names, id }: { names: string[]; id: string }) {
  const [api, setApi] = React.useState<ApiIndex | null>(null);
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => {
    let live = true;
    loadApi().then(
      (a) => live && setApi(a),
      () => live && setFailed(true)
    );
    return () => {
      live = false;
    };
  }, []);
  return (
    <div id={id} className="space-y-6 rounded-box border border-border bg-subtle p-4" aria-busy={!api && !failed}>
      {failed ? (
        <Text size="sm" tone="neutral">
          The props reference is not generated yet: run <InlineCode>pnpm docs:gen</InlineCode>.
        </Text>
      ) : !api ? (
        <div className="space-y-2" aria-label="Loading props">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        names.map((name) => {
          const entry = api.components[name] ?? api.hooks[name];
          return entry ? (
            <EntryProps key={name} name={name} entry={entry} api={api} />
          ) : (
            <Text key={name} size="sm" tone="neutral">
              <InlineCode>{name}</InlineCode> is not in the generated reference.
            </Text>
          );
        })
      )}
    </div>
  );
}

export function CodePanel({ source, filename, id }: { source: Pick<DemoSource, "code" | "imports" | "helpers">; filename: string; id: string }) {
  const code = source.imports ? `${source.imports}\n\n${source.code}` : source.code;
  return (
    <div id={id} className="min-w-0 space-y-2">
      <CodeBlock code={code} language="tsx" theme="light" filename={filename} maxHeight={440} />
      {source.helpers.length > 0 && (
        <Text size="xs" tone="neutral">
          Playground helpers in this snippet (not part of the library): {source.helpers.join(", ")}.
        </Text>
      )}
    </div>
  );
}

const KEY_TOKEN =
  /^((Shift|Ctrl|Control|Cmd|Alt|Option|Meta)\+)*(Enter|Space|Tab|Escape|Esc|Backspace|Delete|Home|End|Page ?Up|Page ?Down|Arrow(Up|Down|Left|Right)|Up|Down|Left|Right|F\d{1,2}|[A-Za-z0-9?/.,;'\-=+]|Click|Tab)$/;

/** A key cell: real keys become Kbd chips, anything else (a sentence such as "A letter or digit") stays text. */
function KeyCell({ text }: { text: string }) {
  const parts = text.split(/\s*[,/]\s*/).filter(Boolean);
  if (parts.length > 0 && parts.every((p) => KEY_TOKEN.test(p.trim()))) {
    return (
      <span className="flex flex-wrap items-center gap-1">
        {parts.map((p) => (
          <Kbd key={p}>{p.trim()}</Kbd>
        ))}
      </span>
    );
  }
  return <Prose text={text} />;
}

function NoteBlocks({ blocks, label }: { blocks: NoteBlock[]; label: string }) {
  return (
    <div className="space-y-2">
      {blocks.map((b, i) =>
        b.type === "p" ? (
          <Text key={i} size="sm" className="max-w-3xl">
            <Prose text={b.text} />
          </Text>
        ) : b.type === "ul" ? (
          <ul key={i} className="max-w-3xl list-disc space-y-1 ps-5 text-sm marker:text-muted-foreground">
            {b.items.map((item) => (
              <li key={item}>
                <Prose text={item} />
              </li>
            ))}
          </ul>
        ) : (
          <Table key={i} aria-label={label} density="compact" containerClassName="bg-background">
            <TableHeader>
              <TableRow>
                {b.head.map((h, j) => (
                  <TableHead key={h} className={j === 0 ? "w-px whitespace-nowrap" : undefined}>
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {b.rows.map((row, r) => (
                <TableRow key={r}>
                  <TableCell className="align-top whitespace-nowrap">
                    <KeyCell text={row[0] ?? ""} />
                  </TableCell>
                  <TableCell className="align-top whitespace-normal text-sm">
                    <Prose text={row[1] ?? ""} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      )}
    </div>
  );
}

const SERVER_LABEL: Record<ComponentNote["server"], { label: string; tone: "success" | "warning" | "info" }> = {
  "ssr-safe": { label: "Server render: same markup", tone: "success" },
  mixed: { label: "Server render: fills in after mount", tone: "warning" },
  "client-only": { label: "Server render: client only", tone: "info" },
};

function NoteSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 space-y-1.5">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      {children}
    </section>
  );
}

function NoteView({ note }: { note: ComponentNote }) {
  const server = SERVER_LABEL[note.server];
  return (
    <div className="min-w-0 space-y-4" data-slot="component-note">
      <div className="flex flex-wrap items-center gap-2">
        <InlineCode>{note.component}</InlineCode>
        <Badge size="sm" tone={server.tone}>
          {server.label}
        </Badge>
      </div>
      <NoteSection title="When to use it">
        <Text size="sm" className="max-w-3xl">
          <Prose text={note.use} />
        </Text>
        {note.instead.length > 0 && (
          <ul className="max-w-3xl list-disc space-y-1 ps-5 text-sm marker:text-muted-foreground">
            {note.instead.map(([name, why]) => (
              <li key={name}>
                <InlineCode>{name}</InlineCode> instead when <Prose text={why} />
              </li>
            ))}
          </ul>
        )}
      </NoteSection>
      <NoteSection title="Keyboard">
        <NoteBlocks blocks={note.keyboard} label={`${note.component} keyboard`} />
      </NoteSection>
      <NoteSection title="Screen readers">
        <NoteBlocks blocks={note.screenReaders} label={`${note.component} screen readers`} />
      </NoteSection>
      <NoteSection title="Reduced motion">
        <NoteBlocks blocks={note.motion} label={`${note.component} reduced motion`} />
      </NoteSection>
      <NoteSection title="Server rendering">
        <NoteBlocks blocks={note.ssr} label={`${note.component} server rendering`} />
      </NoteSection>
      {note.slots.length > 0 && (
        <NoteSection title="Slots">
          <NoteBlocks blocks={[{ type: "ul", items: note.slots }]} label={`${note.component} slots`} />
        </NoteSection>
      )}
      <NoteSection title="Gotchas">
        <NoteBlocks blocks={[{ type: "ul", items: note.gotchas }]} label={`${note.component} gotchas`} />
      </NoteSection>
      {note.example && (
        <NoteSection title="Minimal example">
          <CodeBlock code={note.example} language="tsx" theme="light" filename={`${note.component}.example.tsx`} maxHeight={360} />
        </NoteSection>
      )}
    </div>
  );
}

/** The hand-written notes (docs/notes) of the named components: use, keys, screen readers, motion, server rendering, gotchas. */
export function NotesPanel({ keys, id }: { keys: string[]; id: string }) {
  const data = useNotesData();
  return (
    <div id={id} className="space-y-6 rounded-box border border-border bg-subtle p-4" aria-busy={data === null}>
      {data === null ? (
        <div className="space-y-2" aria-label="Loading notes">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : data === false ? (
        <Text size="sm" tone="neutral">
          The notes are not generated yet: run <InlineCode>pnpm docs:gen</InlineCode>.
        </Text>
      ) : (
        keys.map((key) => (data.notes[key] ? <NoteView key={key} note={data.notes[key]!} /> : null))
      )}
    </div>
  );
}

export interface DemoPanelsProps {
  /** The Demo's key: its `id`, else its string title. */
  demoKey?: string;
  /** Component names for the props panel; `false` hides it. Default: found from the Demo's id, title and code. */
  props?: string | string[] | false;
  /** Replaces the extracted source; `false` hides the Code panel. */
  code?: string | false;
  className?: string;
}

/** The Code and Props toggles under a Demo's canvas. Reserves its row while the page's sources load, so nothing shifts. */
export function DemoPanels({ demoKey, props, code, className }: DemoPanelsProps) {
  const source = useDemoSource(demoKey);
  const uid = React.useId();
  const [codeOpen, setCodeOpen] = React.useState(false);
  const [propsOpen, setPropsOpen] = React.useState(false);
  const [notesOpen, setNotesOpen] = React.useState(false);
  const notesData = useNotesData();
  const loading = source === undefined;

  const names = props === false ? [] : props !== undefined ? ([] as string[]).concat(props) : (source?.props ?? []);
  const shown: DemoSource | null =
    code === false ? null : typeof code === "string" ? { code, imports: "", names: [], helpers: [], props: [] } : (source ?? null);

  const noteKeys = notesData ? [...new Set(names.map((n) => notesData.index[n]).filter((k): k is string => !!k))] : [];

  if (!loading && !shown && names.length === 0) return null;
  return (
    <div className={cn("min-w-0 space-y-3", className)} data-slot="demo-panels">
      <div className="flex min-h-8 flex-wrap items-center gap-1.5">
        {!loading && shown && (
          <Button
            variant="ghost"
            size="xs"
            leadingIcon={<RiCodeSSlashLine />}
            aria-expanded={codeOpen}
            aria-controls={`${uid}-code`}
            onClick={() => setCodeOpen((o) => !o)}
          >
            {codeOpen ? "Hide code" : "Code"}
          </Button>
        )}
        {!loading && names.length > 0 && (
          <Button
            variant="ghost"
            size="xs"
            leadingIcon={<RiListCheck3 />}
            className="min-w-0 max-w-full"
            aria-expanded={propsOpen}
            aria-controls={`${uid}-props`}
            onClick={() => setPropsOpen((o) => !o)}
          >
            <span>{propsOpen ? "Hide props" : "Props"}</span>
            <span className="min-w-0 max-w-[min(16rem,40vw)] truncate font-normal text-muted-foreground">{names.join(", ")}</span>
          </Button>
        )}
        {!loading && noteKeys.length > 0 && (
          <Button
            variant="ghost"
            size="xs"
            leadingIcon={<RiBookOpenLine />}
            className="min-w-0 max-w-full"
            aria-expanded={notesOpen}
            aria-controls={`${uid}-notes`}
            onClick={() => setNotesOpen((o) => !o)}
          >
            <span>{notesOpen ? "Hide notes" : "Notes"}</span>
          </Button>
        )}
      </div>
      {codeOpen && shown && <CodePanel id={`${uid}-code`} source={shown} filename={`${demoKey ?? "demo"}.tsx`} />}
      {propsOpen && names.length > 0 && <PropsPanel id={`${uid}-props`} names={names} />}
      {notesOpen && noteKeys.length > 0 && <NotesPanel id={`${uid}-notes`} keys={noteKeys} />}
    </div>
  );
}

const PEERS: Record<string, string> = {
  "@sutra/ui/code-editor": "@codemirror/*",
  "@sutra/ui/rich-text-editor": "@tiptap/*",
  "@sutra/ui/terminal": "@xterm/xterm and @xterm/addon-fit",
  "@sutra/ui/pdf": "pdfjs-dist",
};

/** "Install and import" under a page's intro: the package, the stylesheet and the import lines of everything the page's demos use. */
export function PageInstall({ className }: { className?: string }) {
  const sources = usePageSources();
  const uid = React.useId();
  const [open, setOpen] = React.useState(false);
  if (sources && !sources.imports) return null;
  const peers = sources ? Object.keys(PEERS).filter((spec) => sources.imports.includes(`"${spec}"`)) : [];
  return (
    <div className={cn("min-w-0 space-y-3", className)} data-slot="page-install">
      <div className="-ms-2.5 flex min-h-8 items-center">
        {sources && (
          <Button
            variant="ghost"
            size="xs"
            leadingIcon={<RiDownload2Line />}
            aria-expanded={open}
            aria-controls={`${uid}-install`}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "Hide install and import" : "Install and import"}
          </Button>
        )}
      </div>
      {open && sources && (
        <div id={`${uid}-install`} className="min-w-0 space-y-2">
          <CodeBlock code={"pnpm add @sutra/ui"} language="bash" theme="light" hideHeader />
          <CodeBlock code={`/* your Tailwind v4 stylesheet */\n@import "@sutra/ui/styles.css";`} language="css" theme="light" hideHeader />
          <CodeBlock code={sources.imports} language="tsx" theme="light" filename="imports.ts" maxHeight={320} />
          {peers.length > 0 && (
            <Text size="xs" tone="neutral">
              Optional peers for this page: {peers.map((spec) => PEERS[spec]).join(", ")}.
            </Text>
          )}
        </div>
      )}
    </div>
  );
}
