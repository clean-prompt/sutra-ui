import * as React from "react";
import {
  RiAddLine,
  RiArrowDownSLine,
  RiCheckLine,
  RiCloseLine,
  RiCloudLine,
  RiComputerLine,
  RiDeleteBinLine,
  RiErrorWarningLine,
  RiFileList3Line,
  RiFlashlightLine,
  RiLoginBoxLine,
  RiPencilLine,
  RiPlugLine,
  RiRefreshLine,
  RiServerLine,
  RiSubtractLine,
  RiThumbDownLine,
  RiThumbUpLine,
  RiToolsLine,
} from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { pluralize } from "../../lib/format";
import { useControllableState } from "../../hooks/use-controllable-state";
import { errorMessage, useAsyncAction } from "../../hooks/use-async-action";
import { Badge, type BadgeColor } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import { Chip, ChipGroup } from "../../primitives/chip";
import { ConfirmDialog } from "../../primitives/dialog";
import { Favicon } from "../../primitives/favicon";
import { Field, FieldError, FieldHint, FieldLabel } from "../../primitives/field";
import { Input, PasswordInput } from "../../primitives/input";
import { RadioCard, RadioGroup } from "../../primitives/radio";
import { SegmentedControl } from "../../primitives/segmented-control";
import { Spinner } from "../../primitives/spinner";
import { StatusBadge, type StatusBadgeStatus } from "../../primitives/status-badge";
import { TagInput } from "../../primitives/tag-input";
import { Textarea } from "../../primitives/textarea";
import { CapabilityMonogram } from "./capabilities";

/* ------------------------------------------------------------------ */
/* KeyValueRowsInput                                                   */
/* ------------------------------------------------------------------ */

export interface KeyValueRowsEntry {
  key: string;
  value: string;
}

const SECRET_KEY_RE = /(key|token|secret|password|passwd|auth|credential|bearer)/i;

/** True when an env/header name looks like it holds a secret. */
export function looksSecretKey(key: string) {
  return SECRET_KEY_RE.test(key);
}

export interface KeyValueRowsInputProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  value?: KeyValueRowsEntry[];
  defaultValue?: KeyValueRowsEntry[];
  onValueChange?: (rows: KeyValueRowsEntry[]) => void;
  /** Mask values: always, never, or `"auto"` (keys that look like secrets). Default "auto". */
  secret?: boolean | "auto";
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  addLabel?: string;
  /** Accessible name for the group, also used to label row inputs. */
  label?: string;
  disabled?: boolean;
}

/** Repeatable key/value rows with add/remove, duplicate-key detection and optional value masking. */
export const KeyValueRowsInput = React.forwardRef<HTMLDivElement, KeyValueRowsInputProps>(
  (
    {
      value: valueProp,
      defaultValue = [],
      onValueChange,
      secret = "auto",
      keyPlaceholder = "KEY",
      valuePlaceholder = "value",
      addLabel = "Add row",
      label = "Variables",
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    const [rows, setRows] = useControllableState<KeyValueRowsEntry[]>({ value: valueProp, defaultValue, onChange: onValueChange });
    const counts = new Map<string, number>();
    for (const r of rows) if (r.key.trim()) counts.set(r.key.trim(), (counts.get(r.key.trim()) ?? 0) + 1);
    const patch = (i: number, p: Partial<KeyValueRowsEntry>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
    return (
      <div ref={ref} role="group" aria-label={label} data-slot="key-value-rows" className={cn("space-y-2", className)} {...props}>
        {rows.map((r, i) => {
          const dup = (counts.get(r.key.trim()) ?? 0) > 1;
          const masked = secret === true || (secret === "auto" && looksSecretKey(r.key));
          const n = i + 1;
          return (
            <div key={i} className="flex items-start gap-2" data-row={i}>
              <div className="w-2/5 min-w-0">
                <Input
                  size="sm"
                  value={r.key}
                  onChange={(e) => patch(i, { key: e.target.value })}
                  placeholder={keyPlaceholder}
                  aria-label={`${label} ${n} key`}
                  invalid={dup}
                  disabled={disabled}
                  className="font-mono"
                  spellCheck={false}
                />
                {dup && <p className="mt-1 text-xs text-destructive">Duplicate key</p>}
              </div>
              <div className="min-w-0 flex-1">
                {masked ? (
                  <PasswordInput
                    size="sm"
                    value={r.value}
                    onChange={(e) => patch(i, { value: e.target.value })}
                    placeholder={valuePlaceholder}
                    aria-label={`${label} ${n} value`}
                    disabled={disabled}
                    autoComplete="off"
                    className="font-mono"
                  />
                ) : (
                  <Input
                    size="sm"
                    value={r.value}
                    onChange={(e) => patch(i, { value: e.target.value })}
                    placeholder={valuePlaceholder}
                    aria-label={`${label} ${n} value`}
                    disabled={disabled}
                    className="font-mono"
                    spellCheck={false}
                  />
                )}
              </div>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={`Remove ${label} ${n}`}
                disabled={disabled}
                onClick={() => setRows(rows.filter((_, j) => j !== i))}
              >
                <RiSubtractLine aria-hidden />
              </Button>
            </div>
          );
        })}
        <Button
          type="button"
          size="xs"
          variant="ghost"
          leadingIcon={<RiAddLine aria-hidden />}
          disabled={disabled}
          onClick={() => setRows([...rows, { key: "", value: "" }])}
        >
          {addLabel}
        </Button>
      </div>
    );
  }
);
KeyValueRowsInput.displayName = "KeyValueRowsInput";

/* ------------------------------------------------------------------ */
/* MCP config model + parsing                                          */
/* ------------------------------------------------------------------ */

export type McpTransport = "stdio" | "http" | "sse";
export type McpAuthMode = "none" | "bearer" | "oauth";

export interface McpServerConfig {
  name: string;
  transport: McpTransport;
  command?: string;
  args?: string[];
  env?: KeyValueRowsEntry[];
  url?: string;
  headers?: KeyValueRowsEntry[];
  auth?: McpAuthMode;
  bearerToken?: string;
}

export const emptyMcpServerConfig: McpServerConfig = {
  name: "",
  transport: "stdio",
  command: "",
  args: [],
  env: [],
  url: "",
  headers: [],
  auth: "none",
  bearerToken: "",
};

function toRows(obj: unknown): KeyValueRowsEntry[] {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return [];
  return Object.entries(obj as Record<string, unknown>).map(([key, value]) => ({ key, value: String(value ?? "") }));
}

function entryToConfig(name: string, raw: Record<string, unknown>): McpServerConfig {
  const t = String(raw.type ?? raw.transport ?? "").toLowerCase();
  const url = typeof raw.url === "string" ? raw.url : typeof raw.serverUrl === "string" ? raw.serverUrl : "";
  const transport: McpTransport = t === "sse" ? "sse" : t === "http" || t === "streamable-http" || t === "streamablehttp" || (!t && url) ? "http" : "stdio";
  let headers = toRows(raw.headers);
  let auth: McpAuthMode = "none";
  let bearerToken = "";
  const authHeader = headers.find((h) => h.key.toLowerCase() === "authorization");
  if (authHeader && /^bearer\s+/i.test(authHeader.value)) {
    auth = "bearer";
    bearerToken = authHeader.value.replace(/^bearer\s+/i, "");
    headers = headers.filter((h) => h !== authHeader);
  } else if (raw.auth === "oauth" || (raw.oauth && typeof raw.oauth === "object")) {
    auth = "oauth";
  }
  return {
    ...emptyMcpServerConfig,
    name,
    transport,
    command: typeof raw.command === "string" ? raw.command : "",
    args: Array.isArray(raw.args) ? raw.args.map(String) : [],
    env: toRows(raw.env),
    url,
    headers,
    auth,
    bearerToken,
  };
}

/**
 * Parse a standard MCP JSON snippet: `{"mcpServers": {name: {...}}}`, a bare `{name: {...}}` map,
 * or a single server object. Throws an Error with a readable message when the text is not usable.
 */
export function parseMcpServersJson(text: string): McpServerConfig[] {
  let data: unknown;
  try {
    data = JSON.parse(text.trim().replace(/,\s*([}\]])/g, "$1"));
  } catch {
    throw new Error("That isn't valid JSON.");
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Expected a JSON object.");
  let obj = data as Record<string, unknown>;
  if (obj.mcpServers && typeof obj.mcpServers === "object") obj = obj.mcpServers as Record<string, unknown>;
  else if (obj.servers && typeof obj.servers === "object") obj = obj.servers as Record<string, unknown>;
  if ("command" in obj || "url" in obj) return [entryToConfig(typeof obj.name === "string" ? obj.name : "", obj)];
  const out = Object.entries(obj)
    .filter(([, v]) => v && typeof v === "object" && !Array.isArray(v))
    .map(([name, v]) => entryToConfig(name, v as Record<string, unknown>));
  if (!out.length) throw new Error("No servers found. Expected an \"mcpServers\" object.");
  return out;
}

export type McpServerFormErrors = Partial<Record<"name" | "command" | "url" | "bearerToken" | "env" | "headers", string>>;

/** Validate an MCP server config; returns a map of field → message (empty when valid). */
export function validateMcpServerConfig(config: McpServerConfig, existingNames: string[] = []): McpServerFormErrors {
  const errors: McpServerFormErrors = {};
  const name = config.name.trim();
  if (!name) errors.name = "Name is required";
  else if (!/^[\w.-]+$/.test(name)) errors.name = "Use letters, numbers, dots, dashes or underscores";
  else if (existingNames.some((n) => n.toLowerCase() === name.toLowerCase())) errors.name = "A server with this name already exists";
  const dupes = (rows?: KeyValueRowsEntry[]) => {
    const keys = (rows ?? []).map((r) => r.key.trim()).filter(Boolean);
    if ((rows ?? []).some((r) => !r.key.trim() && r.value)) return "Every value needs a key";
    return new Set(keys).size !== keys.length ? "Keys must be unique" : undefined;
  };
  if (config.transport === "stdio") {
    if (!config.command?.trim()) errors.command = "Command is required";
    const e = dupes(config.env);
    if (e) errors.env = e;
  } else {
    const url = config.url?.trim() ?? "";
    if (!url) errors.url = "URL is required";
    else {
      try {
        const u = new URL(url);
        if (u.protocol !== "http:" && u.protocol !== "https:") errors.url = "URL must start with http:// or https://";
      } catch {
        errors.url = "Enter a valid URL";
      }
    }
    if (config.auth === "bearer" && !config.bearerToken?.trim()) errors.bearerToken = "Token is required for bearer auth";
    const e = dupes(config.headers);
    if (e) errors.headers = e;
  }
  return errors;
}

/* ------------------------------------------------------------------ */
/* McpServerForm                                                       */
/* ------------------------------------------------------------------ */

export interface McpServerFormProps extends Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit" | "defaultValue" | "onChange"> {
  value?: McpServerConfig;
  defaultValue?: McpServerConfig;
  onValueChange?: (config: McpServerConfig) => void;
  onSubmit?: (config: McpServerConfig) => void | Promise<void>;
  onCancel?: () => void;
  /** Names already in use (for the uniqueness check). */
  existingNames?: string[];
  submitLabel?: React.ReactNode;
  /** Show the "Paste JSON config" box. Default true. */
  allowPaste?: boolean;
}

/** A `Field` with label, control and either the error or the hint; the control picks up id, aria-describedby and aria-invalid from it. */
function FormField({
  id,
  label,
  hint,
  error,
  required,
  children,
}: {
  id: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Field id={id} invalid={Boolean(error)} required={required} className="gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      {children}
      {error ? (
        <FieldError hideIcon className="text-xs">
          {error}
        </FieldError>
      ) : hint ? (
        <FieldHint>{hint}</FieldHint>
      ) : null}
    </Field>
  );
}

/** Add/edit an MCP server: stdio (command, args, env) or HTTP/SSE (url, headers, auth), with JSON paste + validation. */
export const McpServerForm = React.forwardRef<HTMLFormElement, McpServerFormProps>(
  (
    {
      value: valueProp,
      defaultValue = emptyMcpServerConfig,
      onValueChange,
      onSubmit,
      onCancel,
      existingNames,
      submitLabel = "Add server",
      allowPaste = true,
      className,
      ...props
    },
    ref
  ) => {
    const [config, setConfig] = useControllableState<McpServerConfig>({ value: valueProp, defaultValue, onChange: onValueChange });
    const [touched, setTouched] = React.useState(false);
    const [pasteOpen, setPasteOpen] = React.useState(false);
    const [pasteText, setPasteText] = React.useState("");
    const [pasteMsg, setPasteMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
    const { run: runSubmit, busy } = useAsyncAction(async (c: McpServerConfig) => onSubmit?.(c));
    const id = React.useId();
    const errors = touched ? validateMcpServerConfig(config, existingNames) : {};
    const set = (p: Partial<McpServerConfig>) => setConfig({ ...config, ...p });

    const applyPaste = () => {
      try {
        const servers = parseMcpServersJson(pasteText);
        const first = servers[0]!;
        setConfig({ ...first, name: first.name || config.name });
        setPasteMsg({
          ok: true,
          text: servers.length > 1 ? `Filled from "${first.name}" (${servers.length - 1} more in the snippet ignored).` : `Filled from "${first.name || "server"}".`,
        });
        setPasteOpen(false);
      } catch (e) {
        setPasteMsg({ ok: false, text: e instanceof Error ? e.message : "Could not parse" });
      }
    };

    const submit = async (e: React.FormEvent) => {
      e.preventDefault();
      setTouched(true);
      const errs = validateMcpServerConfig(config, existingNames);
      if (Object.keys(errs).length) return;
      await runSubmit(config);
    };
    const http = config.transport !== "stdio";

    return (
      <form ref={ref} noValidate onSubmit={submit} data-slot="mcp-server-form" className={cn("space-y-5", className)} {...props}>
        {allowPaste && (
          <div className="rounded-box border border-dashed border-border bg-subtle p-3">
            <button
              type="button"
              aria-expanded={pasteOpen}
              onClick={() => setPasteOpen((o) => !o)}
              className={cn("flex w-full items-center gap-2 rounded-sm text-left text-sm font-medium text-foreground", focusRing)}
            >
              <RiFileList3Line aria-hidden className="size-4 text-muted-foreground" />
              Paste JSON config
              <RiArrowDownSLine aria-hidden className={cn("ml-auto size-4 text-muted-foreground transition-transform", pasteOpen && "rotate-180")} />
            </button>
            {pasteOpen && (
              <div className="mt-3 space-y-2">
                <Textarea
                  aria-label="MCP JSON config"
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={'{\n  "mcpServers": {\n    "github": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-github"] }\n  }\n}'}
                  rows={6}
                  className="font-mono text-xs"
                  spellCheck={false}
                />
                <div className="flex justify-end">
                  <Button type="button" size="sm" variant="secondary" onClick={applyPaste} disabled={!pasteText.trim()}>
                    Fill form
                  </Button>
                </div>
              </div>
            )}
            {pasteMsg && (
              <p role={pasteMsg.ok ? "status" : "alert"} className={cn("mt-2 text-xs", pasteMsg.ok ? "text-success-soft-foreground" : "text-destructive")}>
                {pasteMsg.text}
              </p>
            )}
          </div>
        )}

        <FormField id={`${id}-name`} label="Name" error={errors.name} required>
          <Input
            size="sm"
            value={config.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="github"
            className="font-mono"
          />
        </FormField>

        <div className="space-y-1.5">
          <span id={`${id}-transport`} className="text-sm font-medium text-foreground">
            Transport
          </span>
          <SegmentedControl
            aria-labelledby={`${id}-transport`}
            size="sm"
            value={config.transport}
            onValueChange={(v) => v && set({ transport: v as McpTransport })}
            options={[
              { value: "stdio", label: "stdio" },
              { value: "http", label: "HTTP" },
              { value: "sse", label: "SSE" },
            ]}
          />
        </div>

        {!http ? (
          <>
            <FormField id={`${id}-command`} label="Command" error={errors.command} required hint="Executable that starts the server, e.g. npx or uvx.">
              <Input
                size="sm"
                value={config.command ?? ""}
                onChange={(e) => set({ command: e.target.value })}
                placeholder="npx"
                className="font-mono"
                spellCheck={false}
              />
            </FormField>
            <FormField id={`${id}-args`} label="Arguments" hint="Press Enter after each argument.">
              <TagInput
                size="sm"
                value={config.args ?? []}
                onValueChange={(args) => set({ args })}
                allowDuplicates
                separators={[]}
                addOnBlur
                placeholder="-y @scope/server"
                tagClassName="font-mono"
              />
            </FormField>
            <div className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">Environment</span>
              <KeyValueRowsInput label="Environment variable" value={config.env ?? []} onValueChange={(env) => set({ env })} addLabel="Add variable" />
              {errors.env && <p className="text-xs text-destructive">{errors.env}</p>}
            </div>
          </>
        ) : (
          <>
            <FormField id={`${id}-url`} label="URL" error={errors.url} required>
              <Input
                size="sm"
                type="url"
                value={config.url ?? ""}
                onChange={(e) => set({ url: e.target.value })}
                placeholder={config.transport === "sse" ? "https://example.com/sse" : "https://example.com/mcp"}
                className="font-mono"
                spellCheck={false}
              />
            </FormField>
            <div className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">Headers</span>
              <KeyValueRowsInput label="Header" keyPlaceholder="Header" value={config.headers ?? []} onValueChange={(headers) => set({ headers })} addLabel="Add header" />
              {errors.headers && <p className="text-xs text-destructive">{errors.headers}</p>}
            </div>
            <div className="space-y-1.5">
              <span id={`${id}-auth`} className="text-sm font-medium text-foreground">
                Authentication
              </span>
              <SegmentedControl
                aria-labelledby={`${id}-auth`}
                size="sm"
                value={config.auth ?? "none"}
                onValueChange={(v) => v && set({ auth: v as McpAuthMode })}
                options={[
                  { value: "none", label: "None" },
                  { value: "bearer", label: "Bearer token" },
                  { value: "oauth", label: "OAuth" },
                ]}
              />
              {config.auth === "oauth" && (
                <p className="text-xs text-muted-foreground">You'll sign in through your browser after the server is added.</p>
              )}
            </div>
            {config.auth === "bearer" && (
              <FormField id={`${id}-token`} label="Bearer token" error={errors.bearerToken} required>
                <PasswordInput
                  size="sm"
                  value={config.bearerToken ?? ""}
                  onChange={(e) => set({ bearerToken: e.target.value })}
                  autoComplete="off"
                  className="font-mono"
                />
              </FormField>
            )}
          </>
        )}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" loading={busy}>
            {submitLabel}
          </Button>
        </div>
      </form>
    );
  }
);
McpServerForm.displayName = "McpServerForm";

/* ------------------------------------------------------------------ */
/* McpServerCard                                                       */
/* ------------------------------------------------------------------ */

export type McpServerStatus = "connected" | "connecting" | "failed" | "disabled" | "needs-auth";

export type McpTestResult = { ok: true; tools: string[] } | { ok: false; error: string };

const transportMeta: Record<McpTransport, { label: string; color: BadgeColor }> = {
  stdio: { label: "stdio", color: "purple" },
  http: { label: "HTTP", color: "blue" },
  sse: { label: "SSE", color: "orange" },
};

const mcpStatusMeta: Record<McpServerStatus, { status: StatusBadgeStatus; label: string }> = {
  connected: { status: "online", label: "Connected" },
  connecting: { status: "processing", label: "Connecting" },
  failed: { status: "error", label: "Failed" },
  disabled: { status: "offline", label: "Disabled" },
  "needs-auth": { status: "warning", label: "Needs sign-in" },
};

export interface McpTransportBadgeProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "color"> {
  transport: McpTransport;
}

/** stdio / HTTP / SSE badge with a distinct tone each. */
export const McpTransportBadge = React.forwardRef<HTMLSpanElement, McpTransportBadgeProps>(({ transport, className, ...props }, ref) => (
  <Badge ref={ref} size="sm" variant="outline" color={transportMeta[transport].color} data-transport={transport} className={cn("font-mono", className)} {...props}>
    {transportMeta[transport].label}
  </Badge>
));
McpTransportBadge.displayName = "McpTransportBadge";

/** Format a test result as one line. */
export function formatMcpTestResult(result: McpTestResult) {
  if (!result.ok) return result.error;
  return result.tools.length ? `Tools: ${result.tools.join(", ")}` : "Connected — no tools";
}

export interface McpServerCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  name: string;
  transport: McpTransport;
  status: McpServerStatus;
  /** Command line or URL. */
  endpoint?: string;
  toolCount?: number;
  lastError?: string;
  onTest?: () => Promise<McpTestResult>;
  /** Start OAuth. Resolve when signed in; reject to show the retry state. */
  onConnect?: () => Promise<void>;
  onEnabledChange?: (enabled: boolean) => void;
  onRemove?: () => void | Promise<void>;
  onViewLogs?: () => void;
}

/** MCP server summary with transport, status, tool count, last error and Test / Connect / Disable / Remove / Logs actions. */
export const McpServerCard = React.forwardRef<HTMLDivElement, McpServerCardProps>(
  (
    { name, transport, status, endpoint, toolCount, lastError, onTest, onConnect, onEnabledChange, onRemove, onViewLogs, className, ...props },
    ref
  ) => {
    const [testing, setTesting] = React.useState(false);
    const [result, setResult] = React.useState<McpTestResult | null>(null);
    const [oauth, setOauth] = React.useState<"idle" | "waiting" | "failed">("idle");
    const [oauthError, setOauthError] = React.useState<string | null>(null);
    const titleId = React.useId();
    const meta = mcpStatusMeta[status];
    const disabled = status === "disabled";

    const test = async () => {
      if (!onTest) return;
      setTesting(true);
      setResult(null);
      try {
        setResult(await onTest());
      } catch (e) {
        setResult({ ok: false, error: e instanceof Error ? e.message : "Test failed" });
      } finally {
        setTesting(false);
      }
    };
    // Each Connect / Retry supersedes the previous attempt, and Cancel drops it, so a stale result is ignored.
    const connectAction = useAsyncAction(() => onConnect?.(), {
      onSuccess: () => setOauth("idle"),
      onError: (e) => {
        setOauth("failed");
        setOauthError(errorMessage(e, "Sign-in didn't complete"));
      },
    });
    const connect = () => {
      if (!onConnect) return;
      setOauth("waiting");
      setOauthError(null);
      void connectAction.run();
    };
    const cancelConnect = () => {
      connectAction.reset();
      setOauth("idle");
    };

    return (
      <div
        ref={ref}
        role="group"
        aria-labelledby={titleId}
        data-slot="mcp-server-card"
        data-status={status}
        className={cn("space-y-3 rounded-box border border-border bg-card p-4 shadow-xs", disabled && "bg-subtle", className)}
        {...props}
      >
        <div className="flex items-start gap-3">
          <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-box border border-border bg-background text-muted-foreground [&_svg]:size-[18px]">
            <RiServerLine aria-hidden />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 id={titleId} className="truncate font-mono text-sm font-semibold text-foreground">
                {name}
              </h3>
              <McpTransportBadge transport={transport} />
              <StatusBadge status={meta.status} label={meta.label} size="sm" />
            </div>
            {endpoint && <p className="truncate font-mono text-xs text-muted-foreground" title={endpoint}>{endpoint}</p>}
          </div>
          {toolCount != null && (
            <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground tabular-nums">
              <RiToolsLine aria-hidden className="size-3.5" />
              {toolCount} {pluralize(toolCount, "tool")}
            </span>
          )}
        </div>

        {lastError && status === "failed" && (
          <p className="flex items-start gap-1.5 rounded-md bg-destructive-soft px-2.5 py-1.5 font-mono text-xs text-destructive-soft-foreground">
            <RiErrorWarningLine aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            <span className="min-w-0 break-words">
              <span className="sr-only">Last error: </span>
              {lastError}
            </span>
          </p>
        )}

        {result && (
          <p
            role="status"
            data-test-result={result.ok ? (result.tools.length ? "tools" : "empty") : "error"}
            className={cn(
              "flex items-start gap-1.5 rounded-md px-2.5 py-1.5 text-xs",
              result.ok ? "bg-success-soft text-success-soft-foreground" : "bg-destructive-soft text-destructive-soft-foreground"
            )}
          >
            {result.ok ? <RiCheckLine aria-hidden className="mt-0.5 size-3.5 shrink-0" /> : <RiErrorWarningLine aria-hidden className="mt-0.5 size-3.5 shrink-0" />}
            <span className="min-w-0 break-words font-mono">{formatMcpTestResult(result)}</span>
          </p>
        )}

        {oauth !== "idle" && (
          <div
            role="status"
            data-oauth={oauth}
            className={cn(
              "flex flex-wrap items-center gap-2 rounded-md px-2.5 py-1.5 text-xs",
              oauth === "waiting" ? "bg-info-soft text-info-soft-foreground" : "bg-warning-soft text-warning-soft-foreground"
            )}
          >
            {oauth === "waiting" ? <Spinner size="xs" /> : <RiErrorWarningLine aria-hidden className="size-3.5" />}
            <span className="flex-1">{oauth === "waiting" ? "Waiting for sign-in in your browser…" : oauthError}</span>
            <Button size="xs" variant="ghost" leadingIcon={<RiRefreshLine aria-hidden />} onClick={connect}>
              Retry
            </Button>
            <Button size="xs" variant="ghost" onClick={cancelConnect}>
              Cancel
            </Button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          {onTest && (
            <Button size="sm" variant="outline" leadingIcon={<RiFlashlightLine aria-hidden />} onClick={test} loading={testing} disabled={disabled}>
              Test
            </Button>
          )}
          {onConnect && (status === "needs-auth" || status === "failed") && oauth === "idle" && (
            <Button size="sm" variant="soft" leadingIcon={<RiLoginBoxLine aria-hidden />} onClick={connect}>
              Connect
            </Button>
          )}
          {onViewLogs && (
            <Button size="sm" variant="ghost" leadingIcon={<RiFileList3Line aria-hidden />} onClick={onViewLogs}>
              View logs
            </Button>
          )}
          <span className="flex-1" />
          {onEnabledChange && (
            <Button size="sm" variant="ghost" onClick={() => onEnabledChange(disabled)}>
              {disabled ? "Enable" : "Disable"}
            </Button>
          )}
          {onRemove && (
            <ConfirmDialog
              trigger={
                <Button size="sm" variant="ghost" className="text-destructive" leadingIcon={<RiDeleteBinLine aria-hidden />}>
                  Remove
                </Button>
              }
              tone="destructive"
              title={`Remove ${name}?`}
              description="The agent loses access to this server's tools. You can add it again later."
              confirmLabel="Remove"
              onConfirm={onRemove}
            />
          )}
        </div>
      </div>
    );
  }
);
McpServerCard.displayName = "McpServerCard";

/* ------------------------------------------------------------------ */
/* ConnectionMethodChooser                                             */
/* ------------------------------------------------------------------ */

export type ConnectorWay = "hosted" | "local";

export interface ConnectionMethodInfo {
  label?: React.ReactNode;
  description?: React.ReactNode;
  pros?: string[];
  cons?: string[];
  disabled?: boolean;
}

const defaultWays: Record<ConnectorWay, Required<Omit<ConnectionMethodInfo, "disabled">>> = {
  hosted: {
    label: "Hosted",
    description: "The vendor runs the server; you sign in with OAuth.",
    pros: ["No install", "Always up to date", "Works on every device"],
    cons: ["Data passes through the vendor's server", "Needs internet"],
  },
  local: {
    label: "Local",
    description: "Runs on this machine with your own keys.",
    pros: ["Data stays on this machine", "Works offline for local tools"],
    cons: ["Requires Node or Python", "You manage updates and keys"],
  },
};

export interface ConnectionMethodChooserProps extends Omit<React.ComponentPropsWithoutRef<typeof RadioGroup>, "value" | "defaultValue" | "onValueChange"> {
  value?: ConnectorWay;
  defaultValue?: ConnectorWay;
  onValueChange?: (way: ConnectorWay) => void;
  /** Ways offered. Default both. */
  ways?: ConnectorWay[];
  /** Override copy per way. */
  info?: Partial<Record<ConnectorWay, ConnectionMethodInfo>>;
}

/** Hosted vs local radio cards with pros and cons. */
export const ConnectionMethodChooser = React.forwardRef<React.ElementRef<typeof RadioGroup>, ConnectionMethodChooserProps>(
  ({ value: valueProp, defaultValue, onValueChange, ways = ["hosted", "local"], info, className, ...props }, ref) => {
    const [value, setValue] = useControllableState<ConnectorWay | undefined>({
      value: valueProp,
      defaultValue: defaultValue ?? ways[0],
      onChange: (v) => v && onValueChange?.(v),
    });
    return (
      <RadioGroup
        ref={ref}
        aria-label="Connection method"
        value={value}
        onValueChange={(v) => setValue(v as ConnectorWay)}
        className={cn("grid gap-3 sm:grid-cols-2", className)}
        {...props}
      >
        {ways.map((w) => {
          const d = { ...defaultWays[w], ...info?.[w] };
          return (
            <RadioCard
              key={w}
              value={w}
              disabled={info?.[w]?.disabled}
              icon={w === "hosted" ? <RiCloudLine aria-hidden /> : <RiComputerLine aria-hidden />}
              label={d.label}
              description={
                <span className="block space-y-2">
                  <span className="block">{d.description}</span>
                  <span className="block space-y-1 text-xs">
                    {d.pros.map((p) => (
                      <span key={p} className="flex items-start gap-1.5 text-foreground">
                        <RiThumbUpLine aria-hidden className="mt-0.5 size-3 shrink-0 text-success" />
                        <span>
                          <span className="sr-only">Pro: </span>
                          {p}
                        </span>
                      </span>
                    ))}
                    {d.cons.map((c) => (
                      <span key={c} className="flex items-start gap-1.5 text-muted-foreground">
                        <RiThumbDownLine aria-hidden className="mt-0.5 size-3 shrink-0 text-warning" />
                        <span>
                          <span className="sr-only">Con: </span>
                          {c}
                        </span>
                      </span>
                    ))}
                  </span>
                </span>
              }
            />
          );
        })}
      </RadioGroup>
    );
  }
);
ConnectionMethodChooser.displayName = "ConnectionMethodChooser";

/* ------------------------------------------------------------------ */
/* ConnectorDirectory                                                  */
/* ------------------------------------------------------------------ */

export interface ConnectorCatalogEntry {
  id: string;
  name: string;
  description?: string;
  category: string;
  icon?: React.ReactNode;
  /** Domain for a local monogram/favicon (no network unless a FaviconProvider is mounted). */
  domain?: string;
  ways: ConnectorWay[];
  installed?: boolean;
}

export interface ConnectorDirectoryProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue"> {
  entries: ConnectorCatalogEntry[];
  /** Category order; derived from entries when omitted. */
  categories?: string[];
  category?: string | null;
  defaultCategory?: string | null;
  onCategoryChange?: (category: string | null) => void;
  /** Filter by name/description. */
  search?: string;
  onInstall?: (entry: ConnectorCatalogEntry) => void | Promise<void>;
  onManage?: (entry: ConnectorCatalogEntry) => void;
}

function ConnectorDirectoryCard({
  entry,
  onInstall,
  onManage,
}: {
  entry: ConnectorCatalogEntry;
  onInstall?: ConnectorDirectoryProps["onInstall"];
  onManage?: ConnectorDirectoryProps["onManage"];
}) {
  const { run, busy } = useAsyncAction(async () => onInstall?.(entry));
  const titleId = React.useId();
  const action = entry.ways.includes("hosted") ? "Connect" : "Install";
  return (
    <li
      aria-labelledby={titleId}
      data-connector={entry.id}
      className="flex flex-col gap-3 rounded-box border border-border bg-card p-4 shadow-xs transition-colors hover:border-border-strong"
    >
      <div className="flex items-start gap-3">
        {entry.icon ? (
          <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-box border border-border bg-background [&_svg]:size-5">
            {entry.icon}
          </span>
        ) : entry.domain ? (
          <Favicon domain={entry.domain} shape="square" className="size-9 rounded-box" />
        ) : (
          <CapabilityMonogram name={entry.name} />
        )}
        <div className="min-w-0 flex-1">
          <h3 id={titleId} className="truncate text-sm font-semibold text-foreground">
            {entry.name}
          </h3>
          <p className="text-xs text-muted-foreground">{entry.category}</p>
        </div>
      </div>
      {entry.description && <p className="line-clamp-2 text-sm text-muted-foreground">{entry.description}</p>}
      <div className="mt-auto flex items-center gap-1.5">
        {entry.ways.map((w) => (
          <Badge key={w} size="sm" variant="outline" color={w === "hosted" ? "info" : "neutral"} leadingIcon={w === "hosted" ? <RiCloudLine aria-hidden className="size-3" /> : <RiComputerLine aria-hidden className="size-3" />}>
            {w === "hosted" ? "Hosted" : "Local"}
          </Badge>
        ))}
        <span className="flex-1" />
        {entry.installed ? (
          <>
            <Badge size="sm" color="success" leadingIcon={<RiCheckLine aria-hidden className="size-3" />}>
              Installed
            </Badge>
            {onManage && (
              <Button size="xs" variant="ghost" onClick={() => onManage(entry)} aria-label={`Manage ${entry.name}`}>
                Manage
              </Button>
            )}
          </>
        ) : (
          <Button size="sm" variant="soft" leadingIcon={<RiPlugLine aria-hidden />} loading={busy} onClick={run} aria-label={`${action} ${entry.name}`}>
            {action}
          </Button>
        )}
      </div>
    </li>
  );
}

/** Catalog of connectors: category picker and a grid of cards with ways and install/connect. */
export const ConnectorDirectory = React.forwardRef<HTMLDivElement, ConnectorDirectoryProps>(
  (
    { entries, categories: categoriesProp, category: categoryProp, defaultCategory = null, onCategoryChange, search = "", onInstall, onManage, className, ...props },
    ref
  ) => {
    const [category, setCategory] = useControllableState<string | null>({
      value: categoryProp,
      defaultValue: defaultCategory,
      onChange: onCategoryChange,
    });
    const categories = categoriesProp ?? Array.from(new Set(entries.map((e) => e.category)));
    const q = search.trim().toLowerCase();
    const shown = entries.filter(
      (e) =>
        (!category || e.category === category) &&
        (!q || e.name.toLowerCase().includes(q) || (e.description ?? "").toLowerCase().includes(q))
    );
    return (
      <div ref={ref} data-slot="connector-directory" className={cn("space-y-4", className)} {...props}>
        <ChipGroup
          aria-label="Category"
          size="sm"
          value={category ?? "__all__"}
          onValueChange={(v) => setCategory(!v || v === "__all__" ? null : v)}
          allowDeselect={false}
        >
          <Chip value="__all__" showCheck={false}>
            All
            <span className="ml-1 text-muted-foreground tabular-nums">{entries.length}</span>
          </Chip>
          {categories.map((c) => (
            <Chip key={c} value={c} showCheck={false}>
              {c}
              <span className="ml-1 text-muted-foreground tabular-nums">{entries.filter((e) => e.category === c).length}</span>
            </Chip>
          ))}
        </ChipGroup>
        {shown.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No connectors match</p>
        ) : (
          <ul aria-label="Connectors" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((e) => (
              <ConnectorDirectoryCard key={e.id} entry={e} onInstall={onInstall} onManage={onManage} />
            ))}
          </ul>
        )}
      </div>
    );
  }
);
ConnectorDirectory.displayName = "ConnectorDirectory";

/* ------------------------------------------------------------------ */
/* ConnectorAccounts                                                   */
/* ------------------------------------------------------------------ */

export type ConnectorAccountStatus = "connected" | "expired" | "error" | "retired";

export interface ConnectorAccount {
  id: string;
  alias: string;
  /** Email or handle the account signed in as. */
  identity?: string;
  status: ConnectorAccountStatus;
  /** Preformatted "last used" text. */
  lastUsed?: string;
  error?: string;
}

const accountStatusMeta: Record<ConnectorAccountStatus, { status: StatusBadgeStatus; label: string }> = {
  connected: { status: "online", label: "Connected" },
  expired: { status: "warning", label: "Expired" },
  error: { status: "error", label: "Error" },
  retired: { status: "offline", label: "Retired" },
};

export interface ConnectorAccountsProps extends React.HTMLAttributes<HTMLDivElement> {
  accounts: ConnectorAccount[];
  /** Rename an account. Throw to show an error. */
  onRename?: (id: string, alias: string) => void | Promise<void>;
  onRepair?: (id: string) => void;
  onAdd?: () => void;
  onRemove?: (id: string) => void;
  connectorName?: string;
}

function AccountAlias({
  account,
  taken,
  onRename,
}: {
  account: ConnectorAccount;
  taken: (alias: string) => boolean;
  onRename?: ConnectorAccountsProps["onRename"];
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(account.alias);
  const [error, setError] = React.useState<string | null>(null);
  const inputId = React.useId();
  const start = () => {
    setDraft(account.alias);
    setError(null);
    setEditing(true);
  };
  const commit = async () => {
    const next = draft.trim();
    if (!next) return setError("Name can't be empty");
    if (next === account.alias) return setEditing(false);
    if (taken(next)) return setError("That name is already taken");
    try {
      await onRename?.(account.id, next);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't rename");
    }
  };
  if (!editing) {
    return (
      <span className="flex min-w-0 items-center gap-1">
        <span className="truncate text-sm font-medium text-foreground">{account.alias}</span>
        {onRename && account.status !== "retired" && (
          <Button size="icon-xs" variant="ghost" aria-label={`Rename ${account.alias}`} onClick={start}>
            <RiPencilLine aria-hidden />
          </Button>
        )}
      </span>
    );
  }
  return (
    <span className="block min-w-0 flex-1">
      <span className="flex items-center gap-1">
        <Input
          id={inputId}
          size="sm"
          autoFocus
          value={draft}
          aria-label="Account name"
          invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-err` : undefined}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void commit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              setEditing(false);
            }
          }}
          className="h-7"
        />
        <Button size="icon-xs" variant="ghost" aria-label="Save name" onClick={() => void commit()}>
          <RiCheckLine aria-hidden />
        </Button>
        <Button size="icon-xs" variant="ghost" aria-label="Cancel rename" onClick={() => setEditing(false)}>
          <RiCloseLine aria-hidden />
        </Button>
      </span>
      {error && (
        <span id={`${inputId}-err`} role="alert" className="mt-1 block text-xs text-destructive">
          {error}
        </span>
      )}
    </span>
  );
}

/** Multiple accounts per connector: inline alias rename, status, repair, folded retired accounts and add. */
export const ConnectorAccounts = React.forwardRef<HTMLDivElement, ConnectorAccountsProps>(
  ({ accounts, onRename, onRepair, onAdd, onRemove, connectorName, className, ...props }, ref) => {
    const [showRetired, setShowRetired] = React.useState(false);
    const active = accounts.filter((a) => a.status !== "retired");
    const retired = accounts.filter((a) => a.status === "retired");
    const retiredId = React.useId();
    const row = (a: ConnectorAccount) => {
      const st = accountStatusMeta[a.status];
      return (
        <li key={a.id} data-account={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <AccountAlias
              account={a}
              onRename={onRename}
              taken={(alias) => accounts.some((o) => o.id !== a.id && o.alias.toLowerCase() === alias.toLowerCase())}
            />
            {(a.identity || a.lastUsed) && (
              <p className="truncate text-xs text-muted-foreground">
                {a.identity}
                {a.identity && a.lastUsed && " · "}
                {a.lastUsed}
              </p>
            )}
            {a.error && <p className="text-xs text-destructive">{a.error}</p>}
          </div>
          <StatusBadge status={st.status} label={st.label} size="sm" />
          {onRepair && (a.status === "expired" || a.status === "error") && (
            <Button size="xs" variant="soft" leadingIcon={<RiRefreshLine aria-hidden />} onClick={() => onRepair(a.id)} aria-label={`Repair ${a.alias}`}>
              Repair
            </Button>
          )}
          {onRemove && a.status !== "retired" && (
            <Button size="icon-xs" variant="ghost" aria-label={`Remove ${a.alias}`} onClick={() => onRemove(a.id)}>
              <RiDeleteBinLine aria-hidden />
            </Button>
          )}
        </li>
      );
    };
    return (
      <div ref={ref} data-slot="connector-accounts" className={cn("rounded-box border border-border bg-card shadow-xs", className)} {...props}>
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <h3 className="text-sm font-semibold text-foreground">
            {connectorName ? `${connectorName} accounts` : "Accounts"}
          </h3>
          <span className="text-xs text-muted-foreground tabular-nums">{active.length}</span>
          {onAdd && (
            <Button size="xs" variant="ghost" className="ml-auto" leadingIcon={<RiAddLine aria-hidden />} onClick={onAdd}>
              Add account
            </Button>
          )}
        </div>
        {active.length ? (
          <ul aria-label="Accounts" className="divide-y divide-border">
            {active.map(row)}
          </ul>
        ) : (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">No accounts connected</p>
        )}
        {retired.length > 0 && (
          <div className="border-t border-border">
            <button
              type="button"
              aria-expanded={showRetired}
              aria-controls={showRetired ? retiredId : undefined}
              onClick={() => setShowRetired((s) => !s)}
              className={cn("flex w-full items-center gap-1.5 px-3 py-2 text-left text-xs font-medium text-muted-foreground hover:text-foreground", focusRing)}
            >
              <RiArrowDownSLine aria-hidden className={cn("size-4 transition-transform", !showRetired && "-rotate-90")} />
              Retired accounts ({retired.length})
            </button>
            {showRetired && (
              <ul id={retiredId} aria-label="Retired accounts" className="divide-y divide-border opacity-75">
                {retired.map(row)}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  }
);
ConnectorAccounts.displayName = "ConnectorAccounts";
