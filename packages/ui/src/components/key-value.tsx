import * as React from "react";
import { cn } from "../lib/cn";
import { CopyButton } from "./copy-button";

export type KeyValueLayout = "rows" | "stacked" | "grid";

interface KeyValueContextValue {
  layout: KeyValueLayout;
  mono: boolean;
  empty: React.ReactNode;
}

const KeyValueContext = React.createContext<KeyValueContextValue>({ layout: "rows", mono: false, empty: "—" });

export interface KeyValueItem {
  label: React.ReactNode;
  value?: React.ReactNode;
  /** Copy button; `true` copies the value when it is a string or number, a string copies that text. */
  copyable?: boolean | string;
  mono?: boolean;
  truncate?: boolean;
  key?: string;
}

export interface KeyValueListProps extends React.HTMLAttributes<HTMLDListElement> {
  /** `rows` label left / value right, `stacked` label above value, `grid` stacked cells in columns. */
  layout?: KeyValueLayout;
  /** Columns for the `grid` layout. */
  columns?: 2 | 3 | 4;
  /** Render every value in the mono face. */
  mono?: boolean;
  /** Hairlines between rows (rows/stacked layouts). Default true. */
  dividers?: boolean;
  /** Placeholder for missing values. */
  empty?: React.ReactNode;
  /** Data-driven alternative to `KeyValue` children. */
  items?: KeyValueItem[];
}

const gridCols = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" } as const;

/** Semantic description list of facts: name on one side, value on the other. */
export const KeyValueList = React.forwardRef<HTMLDListElement, KeyValueListProps>(
  ({ layout = "rows", columns = 2, mono = false, dividers = true, empty = "—", items, className, children, ...props }, ref) => {
    const ctx = React.useMemo(() => ({ layout, mono, empty }), [layout, mono, empty]);
    return (
      <KeyValueContext.Provider value={ctx}>
        <dl
          ref={ref}
          data-slot="key-value-list"
          data-layout={layout}
          className={cn(
            "m-0 text-sm",
            layout === "grid" ? cn("grid grid-cols-1 gap-x-6 gap-y-4", gridCols[columns]) : "flex flex-col",
            layout !== "grid" && dividers && "divide-y divide-border",
            className
          )}
          {...props}
        >
          {items
            ? items.map((item, i) => (
                <KeyValue
                  key={item.key ?? (typeof item.label === "string" ? item.label : i)}
                  label={item.label}
                  value={item.value}
                  copyable={item.copyable}
                  mono={item.mono}
                  truncate={item.truncate}
                />
              ))
            : children}
        </dl>
      </KeyValueContext.Provider>
    );
  }
);
KeyValueList.displayName = "KeyValueList";

export interface KeyValueProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  label: React.ReactNode;
  /** The value; `children` work too. Empty values render the list's placeholder. */
  value?: React.ReactNode;
  children?: React.ReactNode;
  copyable?: boolean | string;
  mono?: boolean;
  /** Single-line with ellipsis; the full text is in the `title` tooltip. Default true in `rows`. */
  truncate?: boolean;
}

function isEmpty(v: React.ReactNode) {
  return v == null || v === false || v === "";
}

/** One fact in a `KeyValueList`, optionally copyable. */
export const KeyValue = React.forwardRef<HTMLDivElement, KeyValueProps>(
  ({ label, value, children, copyable, mono, truncate, className, ...props }, ref) => {
    const ctx = React.useContext(KeyValueContext);
    const content = value ?? children;
    const empty = isEmpty(content);
    const text = typeof content === "string" || typeof content === "number" ? String(content) : undefined;
    const copyText = typeof copyable === "string" ? copyable : copyable ? text : undefined;
    const isMono = mono ?? ctx.mono;
    const shouldTruncate = truncate ?? ctx.layout === "rows";
    const rows = ctx.layout === "rows";
    const labelText = typeof label === "string" ? label : "value";

    return (
      <div
        ref={ref}
        data-slot="key-value"
        className={cn(
          rows ? "flex items-baseline justify-between gap-4 py-2.5" : "flex flex-col gap-1",
          ctx.layout === "stacked" && "py-2.5",
          className
        )}
        {...props}
      >
        <dt className={cn("text-muted-foreground", rows ? "shrink-0" : "text-xs font-medium")}>{label}</dt>
        <dd
          className={cn(
            "m-0 flex min-w-0 items-center gap-1.5 text-foreground",
            rows && "justify-end text-right",
            isMono && "font-mono text-[0.8125rem] tracking-tight"
          )}
        >
          <span className={cn("min-w-0", shouldTruncate && "truncate", empty && "text-muted-foreground")} title={shouldTruncate ? text : undefined}>
            {empty ? ctx.empty : content}
          </span>
          {copyText && !empty && (
            <CopyButton value={copyText} size="xs" label={`Copy ${labelText}`} className="rounded-md" />
          )}
        </dd>
      </div>
    );
  }
);
KeyValue.displayName = "KeyValue";
