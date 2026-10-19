import * as React from "react";
import { RiCloseLine } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { Button } from "../../primitives/button";
import { SimpleSelect } from "../../primitives/select";
import { Combobox } from "../../primitives/combobox";
import { SearchInput } from "../../primitives/input";
import type { KanbanBoardModel, KanbanFilters, KanbanSwimlanes } from "./kanban-model";
import { KanbanAssigneeAvatar } from "./kanban-card";

/* ------------------------------------------------------------------ */
/* Toolbar                                                             */
/* ------------------------------------------------------------------ */

export interface KanbanToolbarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Board model; supplies the assignees, labels and priorities offered by the filters. */
  board: KanbanBoardModel;
  /** Current filters (search, assignees, labels, priorities). */
  filters: KanbanFilters;
  /** Called with the new filters when the user changes any of them. */
  onFiltersChange: (filters: KanbanFilters) => void;
  /** Current grouping into lanes: `none`, `assignee` or `priority`. Default "none". */
  swimlanes?: KanbanSwimlanes;
  /** Called with the grouping when the user picks one; the control is hidden when unset. */
  onSwimlanesChange?: (mode: KanbanSwimlanes) => void;
  /** Slot at the start of the toolbar (for example a board switcher). */
  boardSwitcher?: React.ReactNode;
  /** Extra toolbar content, pushed to the end. */
  extra?: React.ReactNode;
}

/** Quick filters for a board: search, assignee toggles, labels and swimlane grouping. */
export const KanbanToolbar = React.forwardRef<HTMLDivElement, KanbanToolbarProps>(function KanbanToolbar(
  { board, filters, onFiltersChange, swimlanes = "none", onSwimlanesChange, boardSwitcher, extra, className, ...props },
  ref
) {
  const selectedAssignees = filters.assignees ?? [];
  const active = !!(filters.search || selectedAssignees.length || filters.labels?.length || filters.priorities?.length);
  const toggleAssignee = (id: string) =>
    onFiltersChange({
      ...filters,
      assignees: selectedAssignees.includes(id) ? selectedAssignees.filter((a) => a !== id) : [...selectedAssignees, id],
    });
  return (
    <div ref={ref} role="toolbar" aria-label="Board filters" className={cn("flex flex-wrap items-center gap-2", className)} {...props}>
      {boardSwitcher}
      <SearchInput
        size="sm"
        aria-label="Search cards"
        placeholder="Filter cards…"
        value={filters.search ?? ""}
        onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
        onClear={() => onFiltersChange({ ...filters, search: "" })}
        className="w-48"
      />
      {(board.assignees?.length ?? 0) > 0 && (
        <div role="group" aria-label="Filter by assignee" className="flex items-center -space-x-1">
          {board.assignees!.map((a) => {
            const pressed = selectedAssignees.includes(a.id);
            return (
              <button
                key={a.id}
                type="button"
                aria-pressed={pressed}
                aria-label={a.name}
                title={a.name}
                onClick={() => toggleAssignee(a.id)}
                className={cn(
                  "relative inline-flex rounded-full ring-2 ring-background transition-transform hover:z-10 hover:-translate-y-0.5",
                  pressed && "z-10 ring-primary",
                  focusRing
                )}
              >
                <span aria-hidden className="inline-flex">
                  <KanbanAssigneeAvatar assignee={a} size={24} />
                </span>
              </button>
            );
          })}
        </div>
      )}
      {(board.labels?.length ?? 0) > 0 && (
        <Combobox
          multiple
          size="sm"
          aria-label="Filter by label"
          placeholder="Labels"
          className="w-44"
          maxChips={1}
          options={board.labels!.map((l) => ({ value: l.id, label: l.name }))}
          value={filters.labels ?? []}
          onValueChange={(labels) => onFiltersChange({ ...filters, labels })}
        />
      )}
      {onSwimlanesChange && (
        <SimpleSelect
          size="sm"
          aria-label="Group by"
          className="w-40"
          value={swimlanes}
          onValueChange={(v) => onSwimlanesChange(v as KanbanSwimlanes)}
          options={[
            { value: "none", label: "No swimlanes" },
            { value: "assignee", label: "By assignee" },
            { value: "priority", label: "By priority" },
          ]}
        />
      )}
      {active && (
        <Button size="sm" variant="ghost" leadingIcon={<RiCloseLine aria-hidden />} onClick={() => onFiltersChange({})}>
          Clear filters
        </Button>
      )}
      {extra && <div className="ms-auto flex items-center gap-2">{extra}</div>}
    </div>
  );
});
KanbanToolbar.displayName = "KanbanToolbar";
