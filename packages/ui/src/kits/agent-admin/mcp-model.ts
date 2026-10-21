/** MCP config model: transport, server config and form error types, `emptyMcpServerConfig`, `parseMcpServersJson` and `validateMcpServerConfig`. */
import { type KeyValueRowsEntry } from "./key-value-rows-internal";

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
