/* Private helpers shared by the process-table modules (column tables, class maps, row bodies with presence). Not public. */

import * as React from "react";
import { cn, type Density } from "../../lib/cn";
import { toneClasses } from "../../lib/tone";
import { formatDuration } from "../../lib/duration";
import type { FormatBytesOptions } from "../../lib/format";
import type { ProcessColumn, ProcessTreeItem } from "../../lib/process-groups";
import { usePresence, type PresenceState } from "../../hooks/use-presence";
import { TableBody } from "../../primitives/table";
import type { ProcessInfo, ProcessTableGroup } from "./process-table-model";

/** Memory columns: 1536 → "1.5 KB" (base 1024). */
export const PROCESS_BYTES: FormatBytesOptions = { decimals: 1, wholeAbove: 100 };

/** Elapsed time: "45s", "5m", "2h 5m", "3d 4h" (floored). */
export const formatElapsed = (ms: number) => formatDuration(ms, { round: "floor", minUnit: ms < 60_000 ? "s" : "m" });

export type Presence = PresenceState;

export const pidOf = (p: ProcessInfo) => p.pid;
export const treeKeyOf = (item: ProcessTreeItem<ProcessInfo>) => item.key;

export const columnLabel: Record<ProcessColumn, string> = {
  pid: "PID",
  name: "Command",
  user: "User",
  cpu: "CPU",
  memory: "RAM",
  vram: "VRAM",
  state: "State",
  started: "Started",
};

export const numeric: ProcessColumn[] = ["pid", "cpu", "memory", "vram"];
export const alignFor = (col: ProcessColumn) => (numeric.includes(col) && col !== "pid" ? "right" : "left");
/** Numbers, sizes and relative times never wrap; only the name column may. */
export const nowrapFor = (col: ProcessColumn) => (col === "name" ? undefined : "whitespace-nowrap");

/** Process states are domain-specific (not `TaskStatus`); only their colours come from the shared tones. */
export const stateTone: Record<string, string> = {
  running: toneClasses.soft.success,
  sleeping: toneClasses.soft.neutral,
  idle: toneClasses.soft.neutral,
  stopped: toneClasses.soft.warning,
  zombie: toneClasses.soft.destructive,
};

/** Matches `TableCell` padding, for the group row's `<th scope="rowgroup">`. */
export const groupHeadPadding: Record<Density, string> = {
  compact: "px-3 py-1.5",
  normal: "px-4 py-2.5",
  relaxed: "px-4 py-4",
};

/** Child rows indent their label past the group's disclosure chevron. */
export const childIndent: Record<Density, string> = {
  compact: "ps-9",
  normal: "ps-10",
  relaxed: "ps-10",
};

/** Every tbody but the last keeps its bottom border when groups each get their own tbody. */
export const groupBodyClass = "[&>tr:last-child>td]:border-b [&>tr:last-child>th]:border-b [&:last-of-type>tr:last-child>*]:border-b-0";

export const presenceRowClass = (state: Presence) =>
  cn(
    state === "enter" && "animate-in fade-in-0 slide-in-from-top-1 duration-300 [&>td]:bg-primary-soft/40",
    state === "exit" && "pointer-events-none animate-out fade-out-0 opacity-0 duration-300 [&>td]:line-through"
  );

/** Placeholder widths per column (right-aligned columns push theirs to the end). */
export const skeletonWidth: Record<ProcessColumn, string> = {
  pid: "w-10",
  name: "w-36",
  user: "w-14",
  cpu: "w-10",
  memory: "w-14",
  vram: "w-12",
  state: "w-14",
  started: "w-14",
};
export const skeletonNameWidths = ["w-36", "w-28", "w-40", "w-24", "w-32"];

export interface RowContext {
  /** The group a child row belongs to. */
  group?: ProcessTableGroup;
  id?: string;
}

export type RenderRow = (p: ProcessInfo, state: Presence, ctx?: RowContext) => React.ReactNode;

export function ProcessRows({
  items,
  exitDuration,
  renderRow,
  empty,
}: {
  items: ProcessInfo[];
  exitDuration: number;
  renderRow: RenderRow;
  empty: React.ReactNode;
}) {
  const rows = usePresence(items, pidOf, { exitDuration });
  if (rows.length === 0) return <>{empty}</>;
  return <TableBody>{rows.map(({ item, state }) => renderRow(item, state))}</TableBody>;
}

export interface ProcessGroupBodyProps {
  group: ProcessTableGroup;
  state: Presence;
  expanded: boolean;
  exitDuration: number;
  idPrefix: string;
  renderRow: RenderRow;
  renderGroupRow: (group: ProcessTableGroup, state: Presence, expanded: boolean, childIds: string[]) => React.ReactNode;
}

function ProcessGroupBody({ group, state, expanded, exitDuration, idPrefix, renderRow, renderGroupRow }: ProcessGroupBodyProps) {
  const children = usePresence(group.processes, pidOf, { exitDuration });
  const childId = (p: ProcessInfo) => `${idPrefix}-p${p.pid}`;
  const visible = expanded ? children : [];
  return (
    <tbody data-group={group.key} className={groupBodyClass}>
      {renderGroupRow(
        group,
        state,
        expanded,
        visible.filter((c) => c.state !== "exit").map((c) => childId(c.item))
      )}
      {visible.map(({ item, state: childState }) =>
        renderRow(item, state === "exit" ? "exit" : childState, { group, id: childId(item) })
      )}
    </tbody>
  );
}

export function ProcessTreeBodies({
  items,
  empty,
  exitDuration,
  expanded,
  idPrefix,
  renderRow,
  renderGroupRow,
}: Omit<ProcessGroupBodyProps, "group" | "state" | "expanded"> & { items: ProcessTreeItem<ProcessInfo>[]; expanded: Set<string>; empty: React.ReactNode }) {
  const rows = usePresence(items, treeKeyOf, { exitDuration });
  if (rows.length === 0) return <>{empty}</>;
  return (
    <>
      {rows.map(({ item, state }) =>
        item.type === "group" ? (
          <ProcessGroupBody
            key={item.key}
            group={item.group}
            state={state}
            expanded={expanded.has(item.group.key)}
            exitDuration={exitDuration}
            idPrefix={idPrefix}
            renderRow={renderRow}
            renderGroupRow={renderGroupRow}
          />
        ) : (
          <tbody key={item.key} className={groupBodyClass}>
            {renderRow(item.process, state)}
          </tbody>
        )
      )}
    </>
  );
}
