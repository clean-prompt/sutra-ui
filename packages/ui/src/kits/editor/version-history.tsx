import * as React from "react";
import { RiBookmarkLine, RiCheckLine, RiCloseLine, RiHistoryLine, RiPriceTag3Line, RiResetLeftLine } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { dateKey, formatClockTime, formatDateTime, formatDayLabel, type FormatDayLabelOptions } from "../../lib/time";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Avatar } from "../../primitives/avatar";
import { Button } from "../../primitives/button";
import { ConfirmDialog } from "../../primitives/dialog";
import { SegmentedControl } from "../../primitives/segmented-control";
import { SimpleTooltip } from "../../primitives/tooltip";
import { colorForSeed } from "../../lib/hash";
import { DiffViewer, type DiffAuthor, type DiffMode, computeDiff } from "../../patterns/diff-viewer";

/* ------------------------------------------------------------------ */
/* Types & helpers                                                     */
/* ------------------------------------------------------------------ */

export interface VersionContributor {
  id: string;
  name: string;
  avatarSrc?: string;
  /** Change highlight color; derived from the id when omitted. */
  color?: string;
}

export interface DocumentVersion {
  id: string;
  createdAt: Date | number | string;
  /** Name of a named version ("Sent to reviewers"). */
  label?: string;
  /** People who edited in this version (session). */
  contributors?: VersionContributor[];
  /** One-line summary ("Edited the text · Renamed"). */
  description?: React.ReactNode;
  /** Full text of the document at this version. */
  content?: string;
}

/** Selected versions: `from` is the older end, `to` the newer; equal for a single version. */
export interface VersionSelection {
  from: string;
  to: string;
}

export type VersionHistoryTab = "all" | "named";

/** Group headers: "Today", "Yesterday", or "Mon, Mar 2". */
const VERSION_DAY: FormatDayLabelOptions = { weekdayWithinWeek: false, tomorrow: false, weekday: true };

/**
 * "Today", "Yesterday", or a short date.
 * @deprecated Use `formatDayLabel(value, { now, weekdayWithinWeek: false, tomorrow: false, weekday: true })`.
 */
export function formatVersionDay(value: Date | number | string, now: Date | number = Date.now()) {
  return formatDayLabel(value, { ...VERSION_DAY, now });
}

/** Versions (newest first) grouped by calendar day. */
export function groupVersionsByDay<T extends Pick<DocumentVersion, "createdAt">>(versions: T[], now: Date | number = Date.now()) {
  const groups: { key: string; label: string; versions: T[] }[] = [];
  for (const v of versions) {
    const key = dateKey(v.createdAt);
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) {
      g = { key, label: formatDayLabel(v.createdAt, { ...VERSION_DAY, now }), versions: [] };
      groups.push(g);
    }
    g.versions.push(v);
  }
  return groups;
}

/* ------------------------------------------------------------------ */
/* VersionHistory                                                      */
/* ------------------------------------------------------------------ */

export interface VersionHistoryProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Newest first. */
  versions: DocumentVersion[];
  selection?: VersionSelection | null;
  defaultSelection?: VersionSelection | null;
  onSelectionChange?: (selection: VersionSelection) => void;
  tab?: VersionHistoryTab;
  defaultTab?: VersionHistoryTab;
  onTabChange?: (tab: VersionHistoryTab) => void;
  /** Enables "Name this version" (empty string clears the name). */
  onRename?: (version: DocumentVersion, label: string) => void;
  /** Enables Restore (after a confirmation). */
  onRestore?: (version: DocumentVersion) => void | Promise<void>;
  /** Custom preview of a single version (default: plain text). */
  renderContent?: (version: DocumentVersion) => React.ReactNode;
  /** Diff layout. Default "inline". */
  diffMode?: DiffMode;
  /** Initial diff layout when uncontrolled. Default "inline". */
  defaultDiffMode?: DiffMode;
  onDiffModeChange?: (mode: DiffMode) => void;
  /** Reference time for day grouping. */
  now?: Date | number;
  title?: React.ReactNode;
}

/**
 * Version history: timeline grouped by day with contributors and named versions; click to see what
 * changed in a version, Shift-click a second to compare the range, preview, rename and restore.
 */
export const VersionHistory = React.forwardRef<HTMLDivElement, VersionHistoryProps>(
  (
    {
      versions,
      selection: selectionProp,
      defaultSelection,
      onSelectionChange,
      tab: tabProp,
      defaultTab = "all",
      onTabChange,
      onRename,
      onRestore,
      renderContent,
      diffMode: diffModeProp,
      defaultDiffMode = "inline",
      onDiffModeChange,
      now,
      title = "Version history",
      className,
      ...props
    },
    ref
  ) => {
    const first = versions[0];
    const [selection, setSelection] = useControllableState<VersionSelection | null>({
      value: selectionProp,
      defaultValue: defaultSelection ?? (first ? { from: first.id, to: first.id } : null),
      onChange: onSelectionChange as ((s: VersionSelection | null) => void) | undefined,
    });
    const [tab, setTab] = useControllableState<VersionHistoryTab>({ value: tabProp, defaultValue: defaultTab, onChange: onTabChange });
    const [diffMode, setDiffMode] = useControllableState<DiffMode>({
      value: diffModeProp,
      defaultValue: defaultDiffMode,
      onChange: onDiffModeChange,
    });
    const [view, setView] = React.useState<"changes" | "preview">("changes");
    const [naming, setNaming] = React.useState<{ id: string; text: string } | null>(null);
    const [confirmRestore, setConfirmRestore] = React.useState(false);
    const anchor = React.useRef<string | null>(selection?.to ?? null);

    const indexOf = React.useCallback((id: string) => versions.findIndex((v) => v.id === id), [versions]);
    const shown = tab === "named" ? versions.filter((v) => v.label) : versions;
    const groups = groupVersionsByDay(shown, now);

    // Indices: 0 is newest. `from` is older (higher index).
    const iFrom = selection ? indexOf(selection.from) : -1;
    const iTo = selection ? indexOf(selection.to) : -1;
    const lo = Math.min(iFrom, iTo);
    const hi = Math.max(iFrom, iTo);
    const isSelected = (id: string) => {
      const i = indexOf(id);
      return lo >= 0 && i >= lo && i <= hi;
    };
    const target = lo >= 0 ? versions[lo] : undefined;
    const older = hi >= 0 ? versions[hi] : undefined;
    const base = hi >= 0 ? versions[hi + 1] : undefined;
    const single = lo === hi;

    const select = (v: DocumentVersion, extend: boolean) => {
      if (extend && anchor.current && indexOf(anchor.current) >= 0) {
        const a = indexOf(anchor.current);
        const b = indexOf(v.id);
        setSelection({ from: versions[Math.max(a, b)]!.id, to: versions[Math.min(a, b)]!.id });
      } else {
        anchor.current = v.id;
        setSelection({ from: v.id, to: v.id });
      }
    };

    const authorMap = React.useMemo(() => {
      const map: Record<string, DiffAuthor> = {};
      for (const v of versions)
        for (const c of v.contributors ?? []) map[c.id] = { name: c.name, color: c.color ?? colorForSeed(c.id) };
      return map;
    }, [versions]);

    // Attribute each change to the newest version in range whose own edit introduced its text.
    const changeAuthors = React.useMemo(() => {
      if (lo < 0) return undefined;
      const range = versions.slice(lo, hi + 1);
      const ids = new Set(range.flatMap((v) => (v.contributors ?? []).map((c) => c.id)));
      if (ids.size === 0) return undefined;
      const parts = computeDiff(base?.content ?? "", target?.content ?? "", "word");
      const count = parts.reduce((m, p) => Math.max(m, p.change + 1), 0);
      const out: (string | undefined)[] = [];
      for (let c = 0; c < count; c++) {
        if (ids.size === 1) {
          out.push([...ids][0]);
          continue;
        }
        const inserted = parts.filter((p) => p.change === c && p.type === "insert").map((p) => p.text.trim()).join(" ");
        let who: string | undefined;
        for (let i = lo; i <= hi && inserted; i++) {
          const v = versions[i]!;
          const prev = versions[i + 1];
          if ((v.content ?? "").includes(inserted) && !(prev?.content ?? "").includes(inserted)) {
            who = v.contributors?.[0]?.id;
            break;
          }
        }
        out.push(who ?? range[0]?.contributors?.[0]?.id);
      }
      return out;
    }, [versions, lo, hi, base, target]);

    const heading = !target
      ? "No version selected"
      : single
        ? target.label ?? formatDateTime(target.createdAt)
        : `${formatDateTime(older!.createdAt)} → ${formatDateTime(target.createdAt)}`;
    const canRestore = onRestore && target && single && lo > 0;

    return (
      <div
        ref={ref}
        data-slot="version-history"
        className={cn("@container flex min-h-0 overflow-hidden rounded-box border border-border bg-background", className)}
        {...props}
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col @2xl:flex-row">
          <section aria-label="Version preview" className="flex min-h-48 min-w-0 flex-1 flex-col">
            <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{heading}</p>
                {target && (
                  <p className="truncate text-xs text-muted-foreground">
                    {single
                      ? base
                        ? "Changes since the previous version"
                        : "First version"
                      : `Comparing ${hi - lo + 1} versions`}
                  </p>
                )}
              </div>
              {target && (
                <SegmentedControl
                  className="max-w-full overflow-x-auto scrollbar-none"
                  size="sm"
                  aria-label="Preview mode"
                  value={view}
                  onValueChange={(v) => v && setView(v as "changes" | "preview")}
                  options={[
                    { value: "changes", label: "Changes" },
                    { value: "preview", label: "Preview" },
                  ]}
                />
              )}
              {canRestore && (
                <Button size="sm" variant="outline" leadingIcon={<RiResetLeftLine aria-hidden />} onClick={() => setConfirmRestore(true)}>
                  Restore
                </Button>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-3">
              {!target ? (
                <p className="p-6 text-center text-sm text-muted-foreground">Select a version to see what changed.</p>
              ) : view === "preview" ? (
                renderContent ? (
                  renderContent(target)
                ) : (
                  <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-foreground">{target.content}</pre>
                )
              ) : (
                <DiffViewer
                  oldValue={base?.content ?? ""}
                  newValue={target.content ?? ""}
                  authors={authorMap}
                  changeAuthors={changeAuthors}
                  mode={diffMode}
                  onModeChange={setDiffMode}
                  font="sans"
                  oldLabel={base ? formatDateTime(base.createdAt) : "Empty"}
                  newLabel={formatDateTime(target.createdAt)}
                  className="h-full"
                />
              )}
            </div>
          </section>

          <aside aria-label="Versions" className="flex max-h-72 min-h-0 w-full shrink-0 flex-col border-t border-border bg-subtle/50 @2xl:max-h-none @2xl:w-72 @2xl:border-l @2xl:border-t-0">
            <div className="space-y-2 border-b border-border p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <RiHistoryLine aria-hidden className="size-4 text-muted-foreground" />
                {title}
              </div>
              <SegmentedControl
                className="max-w-full overflow-x-auto scrollbar-none"
                size="sm"
                fullWidth
                aria-label="Filter versions"
                value={tab}
                onValueChange={(v) => v && setTab(v as VersionHistoryTab)}
                options={[
                  { value: "all", label: "All" },
                  { value: "named", label: "Named" },
                ]}
              />
              <p className="text-2xs text-muted-foreground">Shift-click a second version to compare a range.</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin p-2">
              {groups.length === 0 && (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                  {tab === "named" ? "No named versions yet" : "No versions yet"}
                </p>
              )}
              {groups.map((g) => (
                <div key={g.key} role="group" aria-label={g.label} className="mb-2">
                  <div className="px-2 pb-1 pt-2 text-xs font-medium text-muted-foreground">{g.label}</div>
                  <ul className="space-y-0.5">
                    {g.versions.map((v) => {
                      const selected = isSelected(v.id);
                      const isNaming = naming?.id === v.id;
                      return (
                        <li
                          key={v.id}
                          data-version={v.id}
                          className={cn(
                            "group/version relative rounded-sm transition-colors",
                            selected ? "bg-primary-soft" : "hover:bg-accent"
                          )}
                        >
                          <button
                            type="button"
                            aria-pressed={selected}
                            onClick={(e) => select(v, e.shiftKey)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && e.shiftKey) {
                                e.preventDefault();
                                select(v, true);
                              }
                            }}
                            className={cn("flex w-full flex-col items-start gap-1 rounded-sm px-2 py-1.5 pr-9 text-left", focusRing)}
                          >
                            <span className="flex w-full items-center gap-2">
                              <span className={cn("text-sm tabular-nums", selected ? "text-primary-soft-foreground" : "text-foreground")}>
                                {formatClockTime(v.createdAt)}
                              </span>
                              {i0(versions, v) && (
                                <span className="rounded-xs bg-muted px-1 text-2xs font-medium text-muted-foreground">Current</span>
                              )}
                            </span>
                            {v.label && !isNaming && (
                              <span className="inline-flex max-w-full items-center gap-1 text-xs font-medium text-primary">
                                <RiPriceTag3Line aria-hidden className="size-3 shrink-0" />
                                <span className="truncate">{v.label}</span>
                              </span>
                            )}
                            {v.description && <span className="line-clamp-2 text-xs text-muted-foreground">{v.description}</span>}
                            {v.contributors && v.contributors.length > 0 && (
                              <span className="flex items-center gap-1.5">
                                <span className="flex -space-x-1">
                                  {v.contributors.slice(0, 4).map((c) => (
                                    <Avatar key={c.id} name={c.name} src={c.avatarSrc} size="xs" ring />
                                  ))}
                                </span>
                                <span className="truncate text-xs text-muted-foreground">
                                  {v.contributors.map((c) => c.name).join(", ")}
                                </span>
                              </span>
                            )}
                          </button>
                          {onRename && !isNaming && (
                            <SimpleTooltip content={v.label ? "Rename version" : "Name this version"}>
                              <Button
                                size="icon-xs"
                                variant="ghost"
                                aria-label={v.label ? `Rename version ${v.label}` : `Name version from ${formatDateTime(v.createdAt)}`}
                                onClick={() => setNaming({ id: v.id, text: v.label ?? "" })}
                                className="absolute right-1 top-1 opacity-0 focus-visible:opacity-100 group-hover/version:opacity-100"
                              >
                                <RiBookmarkLine aria-hidden />
                              </Button>
                            </SimpleTooltip>
                          )}
                          {isNaming && (
                            <form
                              className="flex items-center gap-1 px-2 pb-2"
                              onSubmit={(e) => {
                                e.preventDefault();
                                onRename?.(v, naming.text.trim());
                                setNaming(null);
                              }}
                            >
                              <input
                                autoFocus
                                value={naming.text}
                                onChange={(e) => setNaming({ id: v.id, text: e.target.value })}
                                onKeyDown={(e) => e.key === "Escape" && setNaming(null)}
                                placeholder="Name this version"
                                aria-label="Version name"
                                maxLength={80}
                                className={cn(
                                  "h-7 min-w-0 flex-1 rounded-control border border-input bg-background px-2 text-xs shadow-xs placeholder:text-muted-foreground",
                                  focusRing
                                )}
                              />
                              <Button type="submit" size="icon-xs" variant="primary" aria-label="Save name">
                                <RiCheckLine aria-hidden />
                              </Button>
                              <Button type="button" size="icon-xs" variant="ghost" aria-label="Cancel naming" onClick={() => setNaming(null)}>
                                <RiCloseLine aria-hidden />
                              </Button>
                            </form>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </aside>
        </div>

        {onRestore && target && (
          <ConfirmDialog
            open={confirmRestore}
            onOpenChange={setConfirmRestore}
            title="Restore this version?"
            description={`The document will be replaced by the version from ${formatDateTime(target.createdAt)}. The current text stays in the history.`}
            confirmLabel="Restore"
            onConfirm={() => onRestore(target)}
          />
        )}
      </div>
    );
  }
);
VersionHistory.displayName = "VersionHistory";

function i0(versions: DocumentVersion[], v: DocumentVersion) {
  return versions[0]?.id === v.id;
}
