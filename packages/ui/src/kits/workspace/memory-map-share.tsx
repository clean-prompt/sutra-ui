/* Memory-map share codes: encode and decode a view as a compact base64url code, plus ShareCodeControls. */
import * as React from "react";
import { cn } from "../../lib/cn";
import { base64UrlDecode, base64UrlEncode } from "../../lib/encoding";
import { Button } from "../../primitives/button";
import { CopyButton } from "../../primitives/copy-button";
import { Input } from "../../primitives/input";

/* ------------------------------------------------------------------ */
/* Share codes                                                         */
/* ------------------------------------------------------------------ */

export interface MemoryMapViewState {
  hiddenKinds?: string[];
  range?: [number, number];
  selectedId?: string;
  zoom?: { k: number; x: number; y: number };
}

const SHARE_PREFIX = "mm1.";


const r2 = (n: number) => Math.round(n * 100) / 100;

/** Compact base64url share code for a memory-map view (filters, time range, selection, zoom). */
export function encodeMemoryShareCode(state: MemoryMapViewState): string {
  const o: Record<string, unknown> = {};
  if (state.hiddenKinds?.length) o.h = state.hiddenKinds;
  if (state.range) o.r = state.range.map((t) => Math.round(t / 1000).toString(36));
  if (state.selectedId) o.s = state.selectedId;
  if (state.zoom) o.z = [r2(state.zoom.k), Math.round(state.zoom.x), Math.round(state.zoom.y)];
  return SHARE_PREFIX + base64UrlEncode(JSON.stringify(o));
}

export type MemoryShareDecodeResult = { ok: true; state: MemoryMapViewState } | { ok: false; error: string };

/** Parse and validate a share code from `encodeMemoryShareCode`. */
export function decodeMemoryShareCode(code: string): MemoryShareDecodeResult {
  const c = code.trim();
  if (!c) return { ok: false, error: "Paste a share code." };
  if (!c.startsWith(SHARE_PREFIX)) return { ok: false, error: "Not a memory map share code." };
  const body = c.slice(SHARE_PREFIX.length);
  if (!/^[A-Za-z0-9_-]+$/.test(body)) return { ok: false, error: "The code contains invalid characters." };
  let o: unknown;
  try {
    o = JSON.parse(base64UrlDecode(body) ?? "");
  } catch {
    return { ok: false, error: "The code is corrupted." };
  }
  if (!o || typeof o !== "object" || Array.isArray(o)) return { ok: false, error: "The code is corrupted." };
  const raw = o as Record<string, unknown>;
  const state: MemoryMapViewState = {};
  if (raw.h !== undefined) {
    if (!Array.isArray(raw.h) || !raw.h.every((k) => typeof k === "string")) return { ok: false, error: "Invalid kind filter." };
    state.hiddenKinds = raw.h as string[];
  }
  if (raw.r !== undefined) {
    const r = Array.isArray(raw.r) ? raw.r.map((x) => (typeof x === "string" && /^-?[0-9a-z]+$/.test(x) ? parseInt(x, 36) * 1000 : NaN)) : [];
    if (r.length !== 2 || !r.every(Number.isFinite) || r[0]! > r[1]!) return { ok: false, error: "Invalid time range." };
    state.range = [r[0]!, r[1]!];
  }
  if (raw.s !== undefined) {
    if (typeof raw.s !== "string") return { ok: false, error: "Invalid selection." };
    state.selectedId = raw.s;
  }
  if (raw.z !== undefined) {
    const z = raw.z;
    if (!Array.isArray(z) || z.length !== 3 || !z.every((n) => typeof n === "number" && Number.isFinite(n)) || (z[0] as number) <= 0)
      return { ok: false, error: "Invalid zoom." };
    state.zoom = { k: z[0] as number, x: z[1] as number, y: z[2] as number };
  }
  return { ok: true, state };
}

export interface ShareCodeControlsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Current view to export. */
  state: MemoryMapViewState;
  /** Called with a validated view decoded from a pasted code. */
  onImport: (state: MemoryMapViewState) => void;
}

/** Copy the current view as a compact base64url share code, or load one (validated). */
export const ShareCodeControls = React.forwardRef<HTMLDivElement, ShareCodeControlsProps>(({ state, onImport, className, ...props }, ref) => {
  const code = React.useMemo(() => encodeMemoryShareCode(state), [state]);
  const [input, setInput] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const ids = { code: React.useId(), input: React.useId(), error: React.useId() };
  return (
    <div ref={ref} className={cn("flex flex-col gap-3", className)} data-slot="share-code-controls" {...props}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={ids.code} className="text-sm font-medium">
          Share code
        </label>
        <div className="flex gap-2">
          <Input id={ids.code} readOnly value={code} size="sm" className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
          <CopyButton value={code} variant="button" size="sm" />
        </div>
      </div>
      <form
        className="flex flex-col gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          const res = decodeMemoryShareCode(input);
          if (res.ok) {
            setError(null);
            setLoaded(true);
            onImport(res.state);
          } else {
            setLoaded(false);
            setError(res.error);
          }
        }}
      >
        <label htmlFor={ids.input} className="text-sm font-medium">
          Load a share code
        </label>
        <div className="flex gap-2">
          <Input
            id={ids.input}
            size="sm"
            value={input}
            placeholder="mm1.…"
            className="font-mono text-xs"
            invalid={!!error}
            aria-describedby={error ? ids.error : undefined}
            onChange={(e) => {
              setInput(e.target.value);
              setError(null);
              setLoaded(false);
            }}
          />
          <Button type="submit" size="sm" disabled={!input.trim()}>
            Load
          </Button>
        </div>
        {error && (
          <p id={ids.error} role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
        <p role="status" className="text-xs text-success">
          {loaded ? "View loaded." : ""}
        </p>
      </form>
    </div>
  );
});
ShareCodeControls.displayName = "ShareCodeControls";
