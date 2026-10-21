/** MCP server editing: the McpServerForm. */
import * as React from "react";
import { RiArrowDownSLine, RiFileList3Line } from "@remixicon/react";
import { cn, focusRing, hitArea } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { errorMessage, useAsyncAction } from "../../hooks/use-async-action";
import { Button } from "../../primitives/button";
import { Field, FieldError, FieldHint, FieldLabel } from "../../primitives/field";
import { Input, PasswordInput } from "../../primitives/input";
import { SegmentedControl } from "../../primitives/segmented-control";
import { TagInput } from "../../primitives/tag-input";
import { Textarea } from "../../primitives/textarea";
import { KeyValueRowsInput } from "./key-value-rows-internal";
import { type McpTransport, type McpAuthMode, type McpServerConfig, emptyMcpServerConfig, parseMcpServersJson, validateMcpServerConfig } from "./mcp-model";

/* ------------------------------------------------------------------ */
/* McpServerForm                                                       */
/* ------------------------------------------------------------------ */

export interface McpServerFormProps extends Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit" | "defaultValue" | "onChange"> {
  /** Controlled server configuration (name, transport, command or URL, env, headers). */
  value?: McpServerConfig;
  /** Initial configuration when `value` is not controlled. */
  defaultValue?: McpServerConfig;
  /** Called with the configuration on every edit. */
  onValueChange?: (config: McpServerConfig) => void;
  /**
   * Called with the valid configuration; may return a promise, and the submit button shows a spinner until it
   * settles.
   */
  onSubmit?: (config: McpServerConfig) => void | Promise<void>;
  /** Called when the user presses Cancel; the button is hidden when unset. */
  onCancel?: () => void;
  /** Names already in use (for the uniqueness check). */
  existingNames?: string[];
  /** Label of the submit button. */
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
        setPasteMsg({ ok: false, text: errorMessage(e, "Could not parse") });
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
              className={cn(hitArea, "flex w-full items-center gap-2 rounded-sm text-start text-sm font-medium text-foreground", focusRing)}
            >
              <RiFileList3Line aria-hidden className="size-4 text-muted-foreground" />
              Paste JSON config
              <RiArrowDownSLine aria-hidden className={cn("ms-auto size-4 text-muted-foreground chevron-turn", pasteOpen && "rotate-180")} />
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
            className="max-w-full overflow-x-auto scrollbar-none"
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
                className="max-w-full overflow-x-auto scrollbar-none"
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
