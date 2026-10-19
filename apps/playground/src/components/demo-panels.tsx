import * as React from "react";
import {
  Badge,
  Button,
  CodeBlock,
  InlineCode,
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
import { RiCodeSSlashLine, RiDownload2Line, RiListCheck3 } from "@sutra/ui/icons";
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
          {entry.slot && (
            <>
              {" · "}
              <code className="font-mono">{`data-slot="${entry.slot}"`}</code>
            </>
          )}
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
  const loading = source === undefined;

  const names = props === false ? [] : props !== undefined ? ([] as string[]).concat(props) : (source?.props ?? []);
  const shown: DemoSource | null =
    code === false ? null : typeof code === "string" ? { code, imports: "", names: [], helpers: [], props: [] } : (source ?? null);

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
      </div>
      {codeOpen && shown && <CodePanel id={`${uid}-code`} source={shown} filename={`${demoKey ?? "demo"}.tsx`} />}
      {propsOpen && names.length > 0 && <PropsPanel id={`${uid}-props`} names={names} />}
    </div>
  );
}

const PEERS: Record<string, string> = {
  "@sutra/ui/editor": "@codemirror/* and @tiptap/*",
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
