import * as React from "react";
import { RiArrowRightSLine, RiCheckLine, RiErrorWarningLine, RiFileCopyLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { useCopy } from "../hooks/use-copy";
import { CodeBlock } from "./code-block";
import { JsonViewer } from "./json-viewer";
import { Pagination } from "./pagination";
import { SimpleSelect } from "./select";
import { SimpleTooltip } from "./tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table";

/* ------------------------------------------------------------------ */
/* Types & helpers                                                     */
/* ------------------------------------------------------------------ */

export interface RequestLogMessage {
  role: "system" | "user" | "assistant" | "tool" | (string & {});
  content?: unknown;
  name?: string;
  reasoning?: string;
  reasoning_content?: string;
  tool_calls?: unknown;
  tool_call_id?: string;
}

export interface RequestLogError {
  message?: string;
  type?: string;
  code?: string | number;
}

export interface RequestLogRecord {
  id: string;
  timestamp: Date | number | string;
  method?: string;
  path?: string;
  model?: string;
  status: number;
  latencyMs?: number;
  /** Caller identity / API key name. */
  identity?: string;
  stream?: boolean;
  /** Sampling params; derived from `request` when omitted. */
  params?: Record<string, unknown>;
  finishReason?: string;
  tokensIn?: number;
  tokensOut?: number;
  /** Conversation; derived from `request.messages` + response choice when omitted. */
  messages?: RequestLogMessage[];
  request?: unknown;
  response?: unknown;
  error?: string | RequestLogError;
  /** Whole raw record for the Raw tab (defaults to the record itself). */
  raw?: unknown;
}

const toMs = (t: Date | number | string) => (t instanceof Date ? t.getTime() : typeof t === "number" ? t : new Date(t).getTime());

/** 850 → "850 ms", 1240 → "1.24 s", 65000 → "1m 5s". */
export function formatRequestLatency(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60000) return `${Number((ms / 1000).toFixed(2))} s`;
  const m = Math.floor(ms / 60000);
  return `${m}m ${Math.round((ms % 60000) / 1000)}s`;
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** Message content (string, parts array or object) → display text. */
export function requestContentText(content: unknown): string {
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content))
    return content
      .map((p) => {
        if (typeof p === "string") return p;
        if (isObj(p)) {
          if (typeof p.text === "string") return p.text;
          if (p.type === "image_url" || p.type === "image") return "[image]";
          if (p.type === "input_audio") return "[audio]";
        }
        return JSON.stringify(p);
      })
      .join("\n");
  return JSON.stringify(content, null, 2);
}

function errorText(e: RequestLogRecord["error"]): string | null {
  if (!e) return null;
  if (typeof e === "string") return e;
  return [e.type, e.message].filter(Boolean).join(": ") || JSON.stringify(e);
}

/** Normalized view of a record: params, finish reason, tokens and messages. */
export function describeRequestLog(record: RequestLogRecord) {
  const req = isObj(record.request) ? record.request : {};
  const res = isObj(record.response) ? record.response : {};
  const choice = Array.isArray(res.choices) && isObj(res.choices[0]) ? (res.choices[0] as Record<string, unknown>) : null;
  const usage = isObj(res.usage) ? res.usage : {};
  const params: Record<string, unknown> = record.params ?? {};
  if (!record.params)
    for (const k of ["temperature", "top_p", "max_tokens", "max_completion_tokens", "stream", "seed"])
      if (req[k] !== undefined) params[k] = req[k];
  if (record.stream !== undefined && params.stream === undefined) params.stream = record.stream;
  let messages: RequestLogMessage[] = record.messages ?? [];
  if (!record.messages) {
    if (Array.isArray(req.messages)) messages = req.messages.filter(isObj) as unknown as RequestLogMessage[];
    if (choice && isObj(choice.message)) messages = [...messages, { role: "assistant", ...(choice.message as object) } as RequestLogMessage];
  }
  return {
    params,
    finishReason: record.finishReason ?? (typeof choice?.finish_reason === "string" ? choice.finish_reason : undefined),
    tokensIn: record.tokensIn ?? (typeof usage.prompt_tokens === "number" ? usage.prompt_tokens : undefined),
    tokensOut: record.tokensOut ?? (typeof usage.completion_tokens === "number" ? usage.completion_tokens : undefined),
    messages,
    error: errorText(record.error),
  };
}

function CopyIconButton({ text, label, className }: { text: string; label: string; className?: string }) {
  const { copied, copy } = useCopy();
  return (
    <button
      type="button"
      onClick={() => copy(text)}
      aria-label={copied ? "Copied" : label}
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-control text-muted-foreground hover:bg-accent hover:text-foreground [&_svg]:size-3.5",
        focusRing,
        className
      )}
    >
      {copied ? <RiCheckLine aria-hidden className="text-success" /> : <RiFileCopyLine aria-hidden />}
    </button>
  );
}

/** Click-to-copy request id chip. */
export function RequestIdCopy({ id, className }: { id: string; className?: string }) {
  const { copied, copy } = useCopy();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        void copy(id);
      }}
      aria-label={copied ? `Request id ${id} copied` : `Copy request id ${id}`}
      title={id}
      className={cn(
        "inline-flex max-w-40 items-center gap-1 rounded-control border border-border bg-subtle px-1.5 py-0.5 font-mono text-2xs text-muted-foreground hover:border-border-strong hover:text-foreground",
        focusRing,
        className
      )}
    >
      <span className="truncate">{id}</span>
      {copied ? <RiCheckLine aria-hidden className="size-3 shrink-0 text-success" /> : <RiFileCopyLine aria-hidden className="size-3 shrink-0" />}
    </button>
  );
}

const statusClass = (s: number) =>
  s >= 500
    ? "bg-destructive-soft text-destructive-soft-foreground"
    : s >= 400
      ? "bg-warning-soft text-warning-soft-foreground"
      : "bg-success-soft text-success-soft-foreground";

function StatusChip({ status }: { status: number }) {
  return (
    <span className={cn("inline-flex rounded-control px-1.5 py-0.5 font-mono text-2xs font-semibold tabular-nums", statusClass(status))}>
      <span className="sr-only">Status </span>
      {status}
    </span>
  );
}

const roleStyle: Record<string, string> = {
  system: "bg-muted text-muted-foreground",
  user: "bg-info-soft text-info-soft-foreground",
  assistant: "bg-primary-soft text-primary-soft-foreground",
  tool: "bg-warning-soft text-warning-soft-foreground",
};

function MessageBlock({ message }: { message: RequestLogMessage }) {
  const text = requestContentText(message.content);
  const reasoning = message.reasoning ?? message.reasoning_content;
  return (
    <div className="group/msg rounded-md border border-border bg-card" data-role={message.role}>
      <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
        <span className={cn("rounded-xs px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wide", roleStyle[message.role] ?? "bg-muted text-foreground")}>
          {message.role}
        </span>
        {message.name ? <span className="font-mono text-2xs text-muted-foreground">{message.name}</span> : null}
        {message.tool_call_id ? <span className="font-mono text-2xs text-muted-foreground">↳ {message.tool_call_id}</span> : null}
        <span className="ml-auto text-2xs text-muted-foreground tabular-nums">{text.length.toLocaleString()} chars</span>
        <CopyIconButton text={text} label={`Copy ${message.role} message`} />
      </div>
      <div className="flex flex-col gap-2 px-3 py-2">
        {reasoning ? (
          <details className="group/reason rounded-md bg-subtle text-xs">
            <summary className={cn("flex cursor-pointer list-none items-center gap-1 rounded-md px-2 py-1 font-medium text-muted-foreground [&::-webkit-details-marker]:hidden", focusRing)}>
              <RiArrowRightSLine aria-hidden className="size-3.5 transition-transform group-open/reason:rotate-90" />
              Reasoning <span className="font-normal tabular-nums">({reasoning.length.toLocaleString()} chars)</span>
            </summary>
            <div className="whitespace-pre-wrap break-words px-2 pb-2 text-muted-foreground">{reasoning}</div>
          </details>
        ) : null}
        {text ? (
          <div className="whitespace-pre-wrap break-words text-sm text-foreground">{text}</div>
        ) : !message.tool_calls ? (
          <div className="text-xs italic text-muted-foreground">(empty)</div>
        ) : null}
        {message.tool_calls ? (
          <JsonViewer data={message.tool_calls} toolbar={false} defaultExpandDepth={2} maxHeight={240} label="Tool calls" />
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* RequestInspector                                                    */
/* ------------------------------------------------------------------ */

export type RequestInspectorTab = "messages" | "request" | "response" | "raw";

export interface RequestInspectorProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  record: RequestLogRecord;
  tab?: RequestInspectorTab;
  defaultTab?: RequestInspectorTab;
  onTabChange?: (tab: RequestInspectorTab) => void;
  /** Hide the header (when rendered under a table row that already shows it). */
  hideHeader?: boolean;
  locale?: string;
}

/** LLM / API request record: header, param chips and Messages | Request | Response | Raw tabs. */
export const RequestInspector = React.forwardRef<HTMLDivElement, RequestInspectorProps>(
  ({ className, record, tab, defaultTab = "messages", onTabChange, hideHeader, locale, ...props }, ref) => {
    const info = describeRequestLog(record);
    const time = new Date(toMs(record.timestamp));
    const chips: { k: string; v: React.ReactNode }[] = [];
    for (const [k, v] of Object.entries(info.params)) {
      if (k === "stream") {
        if (v) chips.push({ k: "stream", v: null });
        continue;
      }
      chips.push({ k, v: typeof v === "object" ? JSON.stringify(v) : String(v) });
    }
    if (info.finishReason) chips.push({ k: "finish_reason", v: info.finishReason });
    if (info.tokensIn != null || info.tokensOut != null)
      chips.push({ k: "tokens", v: `${info.tokensIn?.toLocaleString(locale) ?? "?"} → ${info.tokensOut?.toLocaleString(locale) ?? "?"}` });

    return (
      <div ref={ref} className={cn("flex min-w-0 flex-col gap-3", className)} {...props}>
        {!hideHeader ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {record.method ? <span className="rounded-xs bg-muted px-1.5 py-0.5 font-mono text-2xs font-semibold">{record.method}</span> : null}
            {record.path ? <span className="font-mono text-xs text-muted-foreground">{record.path}</span> : null}
            {record.model ? <span className="font-mono text-sm font-medium text-foreground">{record.model}</span> : null}
            <StatusChip status={record.status} />
            <span className="font-mono text-xs tabular-nums text-muted-foreground" data-latency="">
              {formatRequestLatency(record.latencyMs)}
            </span>
            <time dateTime={time.toISOString()} className="text-xs text-muted-foreground">
              {time.toLocaleString(locale)}
            </time>
            <RequestIdCopy id={record.id} className="ml-auto" />
          </div>
        ) : null}
        {chips.length ? (
          <ul className="flex flex-wrap gap-1.5" aria-label="Parameters">
            {chips.map((c) => (
              <li key={c.k} className="inline-flex items-center gap-1 rounded-control border border-border bg-subtle px-2 py-0.5 text-2xs">
                <span className="text-muted-foreground">{c.k}</span>
                {c.v != null ? <span className="font-mono font-medium text-foreground">{c.v}</span> : null}
              </li>
            ))}
          </ul>
        ) : null}
        <Tabs
          value={tab}
          defaultValue={tab ? undefined : defaultTab}
          onValueChange={(v) => onTabChange?.(v as RequestInspectorTab)}
          variant="underline"
          size="sm"
          className="gap-3"
        >
          <TabsList>
            <TabsTrigger value="messages">Messages{info.messages.length ? ` (${info.messages.length})` : ""}</TabsTrigger>
            <TabsTrigger value="request">Request</TabsTrigger>
            <TabsTrigger value="response">Response</TabsTrigger>
            <TabsTrigger value="raw">Raw</TabsTrigger>
          </TabsList>
          <TabsContent value="messages" className="flex flex-col gap-2">
            {info.messages.length ? (
              info.messages.map((m, i) => <MessageBlock key={i} message={m} />)
            ) : (
              <p className="text-sm text-muted-foreground">No messages in this record.</p>
            )}
            {info.error ? (
              <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive-soft p-3 text-sm text-destructive-soft-foreground">
                <RiErrorWarningLine aria-hidden className="mt-0.5 size-4 shrink-0" />
                <pre className="min-w-0 flex-1 whitespace-pre-wrap break-words font-mono text-xs">{info.error}</pre>
                <CopyIconButton text={info.error} label="Copy error" />
              </div>
            ) : null}
          </TabsContent>
          <TabsContent value="request">
            {record.request !== undefined ? (
              <JsonViewer data={record.request} defaultExpandDepth={2} label="Request body" />
            ) : (
              <p className="text-sm text-muted-foreground">No request body logged.</p>
            )}
          </TabsContent>
          <TabsContent value="response">
            {record.response !== undefined ? (
              <JsonViewer data={record.response} defaultExpandDepth={2} label="Response body" />
            ) : (
              <p className="text-sm text-muted-foreground">No response body logged.</p>
            )}
          </TabsContent>
          <TabsContent value="raw">
            <CodeBlock code={JSON.stringify(record.raw ?? record, null, 2)} language="json" theme="light" maxHeight={420} />
          </TabsContent>
        </Tabs>
      </div>
    );
  }
);
RequestInspector.displayName = "RequestInspector";

/* ------------------------------------------------------------------ */
/* RequestLogTable                                                     */
/* ------------------------------------------------------------------ */

export interface RequestLogFilters {
  /** "all" | "success" | "error" | a status code. */
  status: string;
  /** "all" or a model name. */
  model: string;
  /** "all" or minimum latency in ms ("1000"). */
  latency: string;
}

/** Apply RequestLogTable filters. */
export function filterRequestLogs(records: RequestLogRecord[], f: RequestLogFilters): RequestLogRecord[] {
  return records.filter((r) => {
    if (f.status === "success" && r.status >= 400) return false;
    if (f.status === "error" && r.status < 400) return false;
    if (f.status !== "all" && f.status !== "success" && f.status !== "error" && String(r.status) !== f.status) return false;
    if (f.model !== "all" && r.model !== f.model) return false;
    if (f.latency !== "all" && (r.latencyMs ?? 0) < Number(f.latency)) return false;
    return true;
  });
}

export interface RequestLogTableProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  records: RequestLogRecord[];
  /** Rows per page. Default 20. */
  pageSize?: number;
  filters?: RequestLogFilters;
  defaultFilters?: Partial<RequestLogFilters>;
  onFiltersChange?: (filters: RequestLogFilters) => void;
  /** Controlled expanded record id. */
  expandedId?: string | null;
  onExpandedChange?: (id: string | null) => void;
  showIdentity?: boolean;
  emptyState?: React.ReactNode;
  /** Extra toolbar content (refresh button, date picker…). */
  toolbar?: React.ReactNode;
  locale?: string;
}

/** Filterable, paginated request log with rows that expand into a RequestInspector. */
export const RequestLogTable = React.forwardRef<HTMLDivElement, RequestLogTableProps>(
  (
    {
      className,
      records,
      pageSize = 20,
      filters: filtersProp,
      defaultFilters,
      onFiltersChange,
      expandedId: expandedProp,
      onExpandedChange,
      showIdentity = true,
      emptyState,
      toolbar,
      locale,
      ...props
    },
    ref
  ) => {
    const [filtersState, setFiltersState] = React.useState<RequestLogFilters>({ status: "all", model: "all", latency: "all", ...defaultFilters });
    const filters = filtersProp ?? filtersState;
    const [page, setPage] = React.useState(1);
    const [expandedState, setExpandedState] = React.useState<string | null>(null);
    const expanded = expandedProp !== undefined ? expandedProp : expandedState;
    const setExpanded = (id: string | null) => {
      if (expandedProp === undefined) setExpandedState(id);
      onExpandedChange?.(id);
    };
    const setFilter = (k: keyof RequestLogFilters, v: string) => {
      const next = { ...filters, [k]: v };
      if (!filtersProp) setFiltersState(next);
      onFiltersChange?.(next);
      setPage(1);
      setExpanded(null);
    };

    const models = React.useMemo(() => [...new Set(records.map((r) => r.model).filter(Boolean) as string[])].sort(), [records]);
    const statuses = React.useMemo(() => [...new Set(records.map((r) => r.status))].sort((a, b) => a - b), [records]);
    const filtered = React.useMemo(() => filterRequestLogs(records, filters), [records, filters]);
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const current = Math.min(page, totalPages);
    const rows = filtered.slice((current - 1) * pageSize, current * pageSize);
    const colCount = 7 + (showIdentity ? 1 : 0);
    const timeFmt = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    return (
      <div ref={ref} className={cn("flex min-w-0 flex-col gap-3", className)} {...props}>
        <div className="flex flex-wrap items-center gap-2">
          <SimpleSelect
            size="sm"
            aria-label="Filter by status"
            className="w-36"
            value={filters.status}
            onValueChange={(v) => setFilter("status", v)}
            options={[
              { value: "all", label: "All statuses" },
              { value: "success", label: "Success (< 400)" },
              { value: "error", label: "Errors (≥ 400)" },
              ...statuses.map((s) => ({ value: String(s), label: String(s) })),
            ]}
          />
          <SimpleSelect
            size="sm"
            aria-label="Filter by model"
            className="w-44"
            value={filters.model}
            onValueChange={(v) => setFilter("model", v)}
            options={[{ value: "all", label: "All models" }, ...models.map((m) => ({ value: m, label: m }))]}
          />
          <SimpleSelect
            size="sm"
            aria-label="Filter by latency"
            className="w-36"
            value={filters.latency}
            onValueChange={(v) => setFilter("latency", v)}
            options={[
              { value: "all", label: "Any latency" },
              { value: "1000", label: "≥ 1 s" },
              { value: "5000", label: "≥ 5 s" },
              { value: "10000", label: "≥ 10 s" },
            ]}
          />
          <span className="text-xs text-muted-foreground" aria-live="polite" data-record-count="">
            {filtered.length.toLocaleString(locale)} {filtered.length === 1 ? "record" : "records"}
          </span>
          {toolbar ? <div className="ml-auto flex items-center gap-2">{toolbar}</div> : null}
        </div>
        <Table density="compact">
          <caption className="sr-only">Request logs</caption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <span className="sr-only">Expand</span>
              </TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Request</TableHead>
              {showIdentity ? <TableHead>Identity</TableHead> : null}
              <TableHead>Model</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Error</TableHead>
              <TableHead align="right">Latency</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colCount} className="py-8 text-center text-sm text-muted-foreground">
                  {emptyState ?? (records.length ? "No records match these filters." : "No requests logged yet.")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => {
                const open = expanded === r.id;
                const err = errorText(r.error);
                const detailId = `req-${r.id}`.replace(/[^\w-]/g, "_");
                return (
                  <React.Fragment key={r.id}>
                    <TableRow
                      data-state={open ? "open" : undefined}
                      onClick={() => setExpanded(open ? null : r.id)}
                      className={cn("cursor-pointer hover:bg-accent/50", open && "bg-accent/40")}
                    >
                      <TableCell>
                        <button
                          type="button"
                          aria-expanded={open}
                          aria-controls={open ? detailId : undefined}
                          aria-label={`${open ? "Collapse" : "Expand"} request ${r.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpanded(open ? null : r.id);
                          }}
                          className={cn("inline-flex size-6 items-center justify-center rounded-control text-muted-foreground hover:bg-accent hover:text-foreground", focusRing)}
                        >
                          <RiArrowRightSLine aria-hidden className={cn("size-4 transition-transform", open && "rotate-90")} />
                        </button>
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground">
                        {timeFmt.format(new Date(toMs(r.timestamp)))}
                      </TableCell>
                      <TableCell>
                        <RequestIdCopy id={r.id} />
                      </TableCell>
                      {showIdentity ? <TableCell className="text-xs">{r.identity ?? "—"}</TableCell> : null}
                      <TableCell className="font-mono text-xs">{r.model ?? "—"}</TableCell>
                      <TableCell>
                        <StatusChip status={r.status} />
                      </TableCell>
                      <TableCell className="max-w-56">
                        {err ? (
                          <SimpleTooltip content={<span className="whitespace-pre-wrap break-words">{err}</span>} contentClassName="max-w-sm">
                            <span className="block truncate text-xs text-destructive" data-error-cell="">
                              {err}
                            </span>
                          </SimpleTooltip>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell align="right" className="whitespace-nowrap font-mono text-xs tabular-nums">
                        {formatRequestLatency(r.latencyMs)}
                        {r.stream ? <span className="ml-1 text-muted-foreground">· stream</span> : null}
                      </TableCell>
                    </TableRow>
                    {open ? (
                      <TableRow>
                        <TableCell colSpan={colCount} id={detailId} className="bg-subtle p-4">
                          <RequestInspector record={r} locale={locale} />
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
        {totalPages > 1 ? (
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span className="font-mono tabular-nums">
              {(current - 1) * pageSize + 1}–{Math.min(current * pageSize, filtered.length)} of {filtered.length}
            </span>
            <Pagination page={current} totalPages={totalPages} onPageChange={setPage} variant="simple" size="sm" />
          </div>
        ) : null}
      </div>
    );
  }
);
RequestLogTable.displayName = "RequestLogTable";
