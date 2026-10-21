import * as React from "react";
import { RiAddLine, RiSubtractLine } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Button } from "../../primitives/button";
import { Input, PasswordInput } from "../../primitives/input";

/* The key/value editor shared by the MCP server form (env, headers) and the custom endpoint form. */

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
  /** Controlled rows as `{ key, value }` entries. */
  value?: KeyValueRowsEntry[];
  /** Initial rows when `value` is not controlled. */
  defaultValue?: KeyValueRowsEntry[];
  /** Called with the full row list when the user edits, adds or removes a row. */
  onValueChange?: (rows: KeyValueRowsEntry[]) => void;
  /** Mask values: always, never, or `"auto"` (keys that look like secrets). Default "auto". */
  secret?: boolean | "auto";
  /** Placeholder of the key field in each row. */
  keyPlaceholder?: string;
  /** Placeholder of the value field in each row. */
  valuePlaceholder?: string;
  /** Label of the button that appends an empty row. */
  addLabel?: string;
  /** Accessible name for the group, also used to label row inputs. */
  label?: string;
  /** Word that ends each key field's accessible name ("Header 1 name"). Default "key". */
  keyLabel?: string;
  /** Word that ends each value field's accessible name. Default "value". */
  valueLabel?: string;
  /** `data-slot` of every row. Default "key-value-row". */
  rowSlot?: string;
  /** Shown instead of the rows while there are none. */
  emptyState?: React.ReactNode;
  /** Disables every field and the add and remove buttons. */
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
      keyLabel = "key",
      valueLabel = "value",
      rowSlot = "key-value-row",
      emptyState,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    const [rows, setRows] = useControllableState<KeyValueRowsEntry[]>({ value: valueProp, defaultValue, onChange: onValueChange });
    // Stable row ids, parallel to `rows`, so a removed row does not hand its uncontrolled state (a revealed secret) to its neighbour.
    const ids = React.useRef<string[]>([]);
    const nextId = React.useRef(0);
    const newId = () => `kv-${nextId.current++}`;
    while (ids.current.length < rows.length) ids.current.push(newId());
    if (ids.current.length > rows.length) ids.current.length = rows.length;
    const counts = new Map<string, number>();
    for (const r of rows) if (r.key.trim()) counts.set(r.key.trim(), (counts.get(r.key.trim()) ?? 0) + 1);
    const patch = (i: number, p: Partial<KeyValueRowsEntry>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
    return (
      <div ref={ref} role="group" aria-label={label} data-slot="key-value-rows" className={cn("space-y-2", className)} {...props}>
        {rows.length === 0 && emptyState}
        {rows.map((r, i) => {
          const dup = (counts.get(r.key.trim()) ?? 0) > 1;
          const masked = secret === true || (secret === "auto" && looksSecretKey(r.key));
          const n = i + 1;
          return (
            <div key={ids.current[i]} className="flex items-start gap-2" data-slot={rowSlot} data-row={i}>
              <div className="w-2/5 min-w-0">
                <Input
                  size="sm"
                  value={r.key}
                  onChange={(e) => patch(i, { key: e.target.value })}
                  placeholder={keyPlaceholder}
                  aria-label={`${label} ${n} ${keyLabel}`}
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
                    aria-label={`${label} ${n} ${valueLabel}`}
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
                    aria-label={`${label} ${n} ${valueLabel}`}
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
                onClick={() => {
                  ids.current.splice(i, 1);
                  setRows(rows.filter((_, j) => j !== i));
                }}
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
