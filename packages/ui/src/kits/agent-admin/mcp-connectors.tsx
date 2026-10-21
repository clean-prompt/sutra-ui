/** Connector setup: the ConnectionMethodChooser and the ConnectorDirectory. */
import * as React from "react";
import { RiCheckLine, RiCloudLine, RiComputerLine, RiPlugLine, RiThumbDownLine, RiThumbUpLine } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useAsyncAction } from "../../hooks/use-async-action";
import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import { Chip, ChipGroup } from "../../primitives/chip";
import { Favicon } from "../../primitives/favicon";
import { RadioCard, RadioGroup } from "../../primitives/radio";
import { CapabilityMonogram } from "./capabilities";

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
  /** Controlled selected way: `hosted` or `local`. */
  value?: ConnectorWay;
  /** Initially selected way (`hosted` or `local`) when `value` is not controlled. */
  defaultValue?: ConnectorWay;
  /** Called with the way the user selects. */
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
        className={cn("grid grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))] gap-3", className)}
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
  /** Connectors to list, each with name, description, category and install state. */
  entries: ConnectorCatalogEntry[];
  /** Category order; derived from entries when omitted. */
  categories?: string[];
  /** Controlled category filter; `null` shows every category. */
  category?: string | null;
  /** Initial category filter when `category` is not controlled. */
  defaultCategory?: string | null;
  /** Called with the category (or `null` for all) when the user picks a filter. */
  onCategoryChange?: (category: string | null) => void;
  /** Filter by name/description. */
  search?: string;
  /**
   * Called when the user installs a connector that is not installed yet; may return a promise to keep the button
   * busy.
   */
  onInstall?: (entry: ConnectorCatalogEntry) => void | Promise<void>;
  /** Called when the user presses Manage on an installed connector. */
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
      className="flex min-w-0 flex-col gap-3 rounded-box border border-border bg-card p-4 shadow-xs transition-colors hover:border-border-strong"
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
      <div className="mt-auto flex flex-wrap items-center gap-1.5">
        {entry.ways.map((w) => (
          <Badge key={w} size="sm" variant="outline" color={w === "hosted" ? "info" : "neutral"} leadingIcon={w === "hosted" ? <RiCloudLine aria-hidden className="size-3" /> : <RiComputerLine aria-hidden className="size-3" />}>
            {w === "hosted" ? "Hosted" : "Local"}
          </Badge>
        ))}
        <div className="ms-auto flex shrink-0 items-center gap-1.5">
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
            <span className="ms-1 text-muted-foreground tabular-nums">{entries.length}</span>
          </Chip>
          {categories.map((c) => (
            <Chip key={c} value={c} showCheck={false}>
              {c}
              <span className="ms-1 text-muted-foreground tabular-nums">{entries.filter((e) => e.category === c).length}</span>
            </Chip>
          ))}
        </ChipGroup>
        {shown.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No connectors match</p>
        ) : (
          <ul aria-label="Connectors" className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,16rem),1fr))] gap-3">
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
