import * as React from "react";
import { RiLayoutGridLine, RiListUnordered, RiShapesLine } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { toMs } from "../../lib/time";
import { SearchInput } from "../../primitives/input";
import { SegmentedControl } from "../../primitives/segmented-control";
import { SimpleSelect } from "../../primitives/select";
import { EmptyState } from "../../primitives/empty-state";
import { type ArtifactKind, ARTIFACT_KINDS, type ArtifactData, formatArtifactTime } from "./artifacts-model";
import { kindMeta } from "./artifacts-internal";
import { ArtifactKindIcon } from "./artifacts-preview";

/* ------------------------------------------------------------------ */
/* ArtifactLibrary                                                     */
/* ------------------------------------------------------------------ */

export type ArtifactLibrarySort = "newest" | "oldest" | "title";
export type ArtifactLibraryLayout = "grid" | "list";

export interface ArtifactLibraryProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Artifacts to list, each with title, kind, dates and content. */
  artifacts: ArtifactData[];
  /** Controlled search text. */
  query?: string;
  /** Initial search text when `query` is not controlled. */
  defaultQuery?: string;
  /** Called with the search text on every change. */
  onQueryChange?: (query: string) => void;
  /** Kind filter; "all" shows everything. */
  kind?: ArtifactKind | "all";
  /** Initial kind filter when `kind` is not controlled. */
  defaultKind?: ArtifactKind | "all";
  /** Called with the kind (or `"all"`) when the user picks a filter. */
  onKindChange?: (kind: ArtifactKind | "all") => void;
  /** Controlled sort order: `newest`, `oldest` or `title`. */
  sort?: ArtifactLibrarySort;
  /** Initial sort order when `sort` is not controlled. */
  defaultSort?: ArtifactLibrarySort;
  /** Called with the sort order when the user changes it. */
  onSortChange?: (sort: ArtifactLibrarySort) => void;
  /** Controlled layout: `grid` or `list`. */
  layout?: ArtifactLibraryLayout;
  /** Initial layout when `layout` is not controlled. */
  defaultLayout?: ArtifactLibraryLayout;
  /** Called with the layout when the user switches between grid and list. */
  onLayoutChange?: (layout: ArtifactLibraryLayout) => void;
  /** Called with the artifact when the user opens one. */
  onOpenArtifact?: (artifact: ArtifactData) => void;
  /** Shown when there are no artifacts at all. */
  emptyState?: React.ReactNode;
  /** Reference time for relative dates (tests). */
  now?: number;
}

const sortOptions = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "title", label: "Title" },
];

const updatedMs = (a: ArtifactData) =>
  toMs(a.updatedAt ?? a.versions[a.versions.length - 1]?.createdAt) ?? 0;

/** Searchable grid / list of artifacts with kind filter chips and sorting. */
export const ArtifactLibrary = React.forwardRef<HTMLDivElement, ArtifactLibraryProps>(
  (
    {
      artifacts,
      query: queryProp,
      defaultQuery = "",
      onQueryChange,
      kind: kindProp,
      defaultKind = "all",
      onKindChange,
      sort: sortProp,
      defaultSort = "newest",
      onSortChange,
      layout: layoutProp,
      defaultLayout = "grid",
      onLayoutChange,
      onOpenArtifact,
      emptyState,
      now,
      className,
      ...props
    },
    ref
  ) => {
    const [query, setQuery] = useControllableState({ value: queryProp, defaultValue: defaultQuery, onChange: onQueryChange });
    const [kind, setKind] = useControllableState<ArtifactKind | "all">({ value: kindProp, defaultValue: defaultKind, onChange: onKindChange });
    const [sort, setSort] = useControllableState<ArtifactLibrarySort>({ value: sortProp, defaultValue: defaultSort, onChange: onSortChange });
    const [layout, setLayout] = useControllableState<ArtifactLibraryLayout>({
      value: layoutProp,
      defaultValue: defaultLayout,
      onChange: onLayoutChange,
    });

    const kindCounts = React.useMemo(() => {
      const m = new Map<ArtifactKind, number>();
      for (const a of artifacts) m.set(a.kind, (m.get(a.kind) ?? 0) + 1);
      return m;
    }, [artifacts]);

    const q = query.trim().toLowerCase();
    const shown = artifacts
      .filter((a) => kind === "all" || a.kind === kind)
      .filter(
        (a) =>
          !q ||
          a.title.toLowerCase().includes(q) ||
          (a.description ?? "").toLowerCase().includes(q) ||
          (a.language ?? "").toLowerCase().includes(q)
      )
      .sort((a, b) =>
        sort === "title" ? a.title.localeCompare(b.title) : sort === "oldest" ? updatedMs(a) - updatedMs(b) : updatedMs(b) - updatedMs(a)
      );

    const chip = (value: ArtifactKind | "all", label: string, count: number) => (
      <button
        key={value}
        type="button"
        aria-pressed={kind === value}
        onClick={() => setKind(value)}
        className={cn(
          "inline-flex h-7 items-center gap-1.5 rounded-control border border-border px-2.5 text-xs font-medium text-muted-foreground hover:bg-accent",
          "aria-pressed:border-primary/40 aria-pressed:bg-primary-soft aria-pressed:text-primary-soft-foreground",
          focusRing
        )}
      >
        {label}
        <span className="tabular-nums opacity-70">{count}</span>
      </button>
    );

    return (
      <div ref={ref} data-slot="artifact-library" className={cn("flex flex-col gap-3", className)} {...props}>
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            aria-label="Search artifacts"
            placeholder="Search artifacts"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClear={() => setQuery("")}
            clearable
            size="sm"
            wrapperClassName="min-w-48 flex-1"
            className="min-w-48 flex-1"
          />
          <SimpleSelect
            aria-label="Sort"
            size="sm"
            options={sortOptions}
            value={sort}
            onValueChange={(v) => setSort(v as ArtifactLibrarySort)}
            className="w-28"
          />
          <SegmentedControl
            className="max-w-full overflow-x-auto scrollbar-none"
            aria-label="Layout"
            size="sm"
            value={layout}
            onValueChange={(v) => v && setLayout(v as ArtifactLibraryLayout)}
            options={[
              { value: "grid", icon: <RiLayoutGridLine aria-hidden />, "aria-label": "Grid" },
              { value: "list", icon: <RiListUnordered aria-hidden />, "aria-label": "List" },
            ]}
          />
        </div>
        {artifacts.length > 0 && (
          <div role="group" aria-label="Filter by kind" className="flex flex-wrap gap-1.5">
            {chip("all", "All", artifacts.length)}
            {ARTIFACT_KINDS.filter((k) => kindCounts.has(k)).map((k) => chip(k, kindMeta[k].label, kindCounts.get(k) ?? 0))}
          </div>
        )}
        {artifacts.length === 0 ? (
          emptyState ?? (
            <EmptyState
              size="sm"
              variant="dashed"
              icon={<RiShapesLine aria-hidden />}
              title="No artifacts yet"
              description="Code, documents and previews the agent creates will collect here."
            />
          )
        ) : shown.length === 0 ? (
          <EmptyState size="sm" illustration="search" title="No matching artifacts" description="Try a different search or filter." />
        ) : (
          <ul
            aria-label="Artifacts"
            data-layout={layout}
            className={cn(layout === "grid" ? "grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-2" : "flex flex-col divide-y divide-border rounded-box border border-border")}
          >
            {shown.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => onOpenArtifact?.(a)}
                  className={cn(
                    "flex w-full items-center gap-3 text-start hover:bg-accent",
                    layout === "grid" ? "h-full flex-col items-start rounded-box border border-border bg-card p-3" : "px-3 py-2",
                    focusRing
                  )}
                >
                  <ArtifactKindIcon kind={a.kind} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{a.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {kindMeta[a.kind].label}
                      {a.versions.length > 1 ? ` · v${a.versions.length}` : ""}
                      {(() => {
                        const t = formatArtifactTime(a.updatedAt ?? a.versions[a.versions.length - 1]?.createdAt, now);
                        return t ? ` · ${t}` : "";
                      })()}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
);
ArtifactLibrary.displayName = "ArtifactLibrary";
