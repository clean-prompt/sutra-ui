import * as React from "react";
import {
  RiArrowDownLine,
  RiArrowUpDownLine,
  RiArrowUpLine,
  RiCheckLine,
  RiInboxLine,
  RiSubtractLine,
} from "@remixicon/react";
import { cn, focusRing, hitArea, normalizeDensity, type Density } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { Skeleton } from "./progress";

/** Table row density: the shared `Density`, plus the legacy `"comfortable"` (→ `relaxed`). */
export type TableDensity = Density | "comfortable";
export type TableAlign = "left" | "center" | "right";
export type TableSortDirection = "asc" | "desc" | false;

interface TableContextValue {
  density: Density;
  striped: boolean;
  stickyHeader: boolean;
}

const TableContext = React.createContext<TableContextValue>({
  density: "normal",
  striped: false,
  stickyHeader: false,
});

const cellPadding: Record<Density, string> = {
  compact: "px-3 py-1.5",
  normal: "px-4 py-2.5",
  relaxed: "px-4 py-4",
};

const headHeight: Record<Density, string> = {
  compact: "h-8 px-3",
  normal: "h-10 px-4",
  relaxed: "h-11 px-4",
};

const alignClass: Record<TableAlign, string> = {
  left: "text-start",
  center: "text-center",
  right: "text-end",
};

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  /** Row density. Default `normal`; `"comfortable"` is accepted as a legacy alias of `relaxed`. */
  density?: TableDensity;
  /** Zebra-stripe the body rows. */
  striped?: boolean;
  /** Keeps the header visible while the container scrolls. Pair with `maxHeight`. */
  stickyHeader?: boolean;
  /** Maximum height of the scroll container (px number or CSS length); the body scrolls past it. Pair with `stickyHeader`. */
  maxHeight?: number | string;
  /** Classes for the scroll container that wraps the `<table>` (`className` styles the table itself). */
  containerClassName?: string;
  /** Remove the bordered box around the table. */
  bare?: boolean;
}

/** Data table inside a bordered, scrollable box. */
export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  (
    {
      className,
      containerClassName,
      density: densityProp,
      striped = false,
      stickyHeader = false,
      maxHeight,
      bare,
      ...props
    },
    ref
  ) => {
    const density = normalizeDensity(densityProp);
    const ctx = React.useMemo(
      () => ({ density, striped, stickyHeader }),
      [density, striped, stickyHeader]
    );
    return (
      <TableContext.Provider value={ctx}>
        <div
          className={cn(
            "relative w-full overflow-auto scrollbar-thin",
            !bare && "rounded-box border border-border bg-card shadow-xs",
            containerClassName
          )}
          style={maxHeight !== undefined ? { maxHeight } : undefined}
        >
          <table
            ref={ref}
            className={cn(
              "w-full caption-bottom border-separate border-spacing-0 text-sm text-foreground",
              className
            )}
            {...props}
          />
        </div>
      </TableContext.Provider>
    );
  }
);
Table.displayName = "Table";

/** Table `<thead>`. */
export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => {
  const { stickyHeader } = React.useContext(TableContext);
  return (
    <thead
      ref={ref}
      className={cn(
        "[&>tr]:hover:bg-transparent",
        stickyHeader && "[&_th]:sticky [&_th]:top-0 [&_th]:z-10",
        className
      )}
      {...props}
    />
  );
});
TableHeader.displayName = "TableHeader";

/** Table `<tbody>`. */
export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => {
  const { striped } = React.useContext(TableContext);
  return (
    <tbody
      ref={ref}
      className={cn(
        "[&>tr:last-child>td]:border-b-0",
        striped && "[&>tr:nth-child(even)]:bg-subtle",
        className
      )}
      {...props}
    />
  );
});
TableBody.displayName = "TableBody";

/** Table `<tfoot>`. */
export const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "bg-subtle font-medium [&>tr]:hover:bg-transparent [&>tr>td]:border-b-0 [&>tr:first-child>td]:border-t [&>tr:first-child>td]:border-border",
      className
    )}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

/** Table row. Set `data-state="selected"` to highlight. */
export const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "transition-colors hover:bg-accent/60 data-[state=selected]:bg-primary-soft/60",
        className
      )}
      {...props}
    />
  )
);
TableRow.displayName = "TableRow";

export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  /** Horizontal alignment of the header cell text. */
  align?: TableAlign;
  /** Current sort of this column. `false` = sortable but unsorted. */
  sortDirection?: TableSortDirection;
  /** Called when the sort button is clicked; setting it (or `sortDirection`) makes the header sortable. */
  onSort?: () => void;
}

/** Header cell, optionally sortable. */
export const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, align = "left", sortDirection, onSort, children, scope, ...props }, ref) => {
    const { density } = React.useContext(TableContext);
    const sortable = onSort !== undefined || sortDirection !== undefined;
    const SortIcon =
      sortDirection === "asc" ? RiArrowUpLine : sortDirection === "desc" ? RiArrowDownLine : RiArrowUpDownLine;
    return (
      <th
        ref={ref}
        scope={scope ?? "col"}
        aria-sort={
          sortable
            ? sortDirection === "asc"
              ? "ascending"
              : sortDirection === "desc"
                ? "descending"
                : "none"
            : undefined
        }
        className={cn(
          "whitespace-nowrap border-b border-border bg-subtle align-middle text-xs font-medium text-muted-foreground",
          headHeight[density],
          alignClass[align],
          "[&:has([role=checkbox])]:w-px [&:has([role=checkbox])]:pe-0",
          className
        )}
        {...props}
      >
        {sortable ? (
          <button
            type="button"
            onClick={onSort}
            className={cn(
              hitArea,
              "group/sort -mx-1.5 inline-flex items-center gap-1 rounded-xs px-1.5 py-0.5 transition-colors hover:bg-accent hover:text-foreground",
              sortDirection && "text-foreground",
              align === "right" && "flex-row-reverse",
              focusRing
            )}
          >
            {children}
            <SortIcon
              aria-hidden
              className={cn(
                "size-3.5 shrink-0 transition-opacity",
                !sortDirection && "opacity-40 group-hover/sort:opacity-100"
              )}
            />
          </button>
        ) : (
          children
        )}
      </th>
    );
  }
);
TableHead.displayName = "TableHead";

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  /** Horizontal alignment of the cell text; match the column's header. */
  align?: TableAlign;
}

/** Body cell. */
export const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, align = "left", ...props }, ref) => {
    const { density } = React.useContext(TableContext);
    return (
      <td
        ref={ref}
        className={cn(
          "border-b border-border align-middle",
          cellPadding[density],
          alignClass[align],
          "[&:has([role=checkbox])]:w-px [&:has([role=checkbox])]:pe-0",
          className
        )}
        {...props}
      />
    );
  }
);
TableCell.displayName = "TableCell";

/** Table caption, rendered under the table. */
export const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("border-t border-border px-4 py-3 text-start text-sm text-muted-foreground", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

/* ------------------------------------------------------------------ */
/* DataTable                                                           */
/* ------------------------------------------------------------------ */

export interface TableCheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "checked" | "defaultChecked" | "onChange"> {
  /** Controlled checked state. */
  checked?: boolean;
  /** Initial checked state when uncontrolled. */
  defaultChecked?: boolean;
  /** Shows the mixed state (some rows selected); takes precedence over `checked` visually. */
  indeterminate?: boolean;
  /** Called with the new checked state when the user toggles the box. */
  onCheckedChange?: (checked: boolean) => void;
}

/** Row-selection checkbox sized for table cells (controlled or uncontrolled, with an indeterminate state). */
export const TableCheckbox = React.forwardRef<HTMLInputElement, TableCheckboxProps>(function TableCheckbox(
  { checked: checkedProp, defaultChecked = false, indeterminate, onCheckedChange, className, ...props },
  forwardedRef
) {
  const ref = React.useRef<HTMLInputElement>(null);
  const [checked, setChecked] = useControllableState<boolean>({
    value: checkedProp,
    defaultValue: defaultChecked,
    onChange: onCheckedChange,
  });
  React.useImperativeHandle(forwardedRef, () => ref.current as HTMLInputElement);
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate;
  }, [indeterminate]);
  return (
    <span className={cn("relative inline-flex size-4 shrink-0 align-middle", className)}>
      <input
        ref={ref}
        type="checkbox"
        role="checkbox"
        checked={checked && !indeterminate}
        onChange={(e) => setChecked(e.target.checked)}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "peer size-4 cursor-pointer appearance-none rounded-[4px] border border-border-strong bg-background shadow-xs transition-colors",
          "checked:border-primary checked:bg-primary indeterminate:border-primary indeterminate:bg-primary",
          "disabled:cursor-not-allowed disabled:opacity-50",
          focusRing
        )}
        {...props}
      />
      <RiCheckLine
        aria-hidden
        className="pointer-events-none absolute inset-0 m-auto size-3 scale-50 text-primary-foreground opacity-0 transition-[opacity,transform,translate,scale,rotate] duration-150 peer-checked:scale-100 peer-checked:opacity-100"
      />
      <RiSubtractLine
        aria-hidden
        className="pointer-events-none absolute inset-0 m-auto size-3 text-primary-foreground opacity-0 peer-indeterminate:opacity-100"
      />
    </span>
  );
});
TableCheckbox.displayName = "TableCheckbox";

export interface DataTableColumn<T> {
  /** Property of the row to read, or any unique id when `cell` is provided. */
  key: string;
  header: React.ReactNode;
  cell?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  /** Custom value used for sorting. Defaults to `row[key]`. */
  sortValue?: (row: T) => string | number | Date | null | undefined;
  align?: TableAlign;
  width?: number | string;
  headerClassName?: string;
  className?: string;
}

export interface DataTableSort {
  key: string;
  direction: "asc" | "desc";
}

export interface DataTableProps<T> {
  /** Column definitions in display order. */
  columns: DataTableColumn<T>[];
  /** Row objects to render; each row is passed to `cell`, `sortValue` and `onRowClick`. */
  data: T[];
  /** Stable row id. Defaults to `row.id` or the index. */
  getRowId?: (row: T, index: number) => string;
  /** Adds a leading checkbox column (with select-all in the header) for row selection. */
  selectable?: boolean;
  /** Controlled selected row ids (see `getRowId`). Use with `onSelectionChange`. */
  selectedRowIds?: string[];
  /** Initially selected row ids when uncontrolled. */
  defaultSelectedRowIds?: string[];
  /** Called with the full list of selected row ids after every selection change. */
  onSelectionChange?: (ids: string[]) => void;
  /** Controlled sort (`{ key, direction }`), or `null` for unsorted. Use with `onSortChange`. */
  sort?: DataTableSort | null;
  /** Initial sort when uncontrolled. */
  defaultSort?: DataTableSort | null;
  /** Called with the next sort (or `null` when sorting is cleared) when a sortable header is activated. */
  onSortChange?: (sort: DataTableSort | null) => void;
  /** Disable built-in sorting (e.g. when sorting on the server). */
  manualSorting?: boolean;
  /** Shows skeleton rows instead of the data. */
  loading?: boolean;
  /**
   * Number of skeleton rows shown while `loading`.
   * @default 5
   */
  loadingRows?: number;
  /** Content shown in place of the body when `data` is empty. */
  emptyState?: React.ReactNode;
  /** Called with the row and its index when a row is clicked; rows get a pointer cursor. */
  onRowClick?: (row: T, index: number) => void;
  /** Caption rendered under the table (`<caption>`), e.g. a source note or the table title. */
  caption?: React.ReactNode;
  /** Row density. Default `normal`; `"comfortable"` is accepted as a legacy alias of `relaxed`. */
  density?: TableDensity;
  /** Zebra-stripe the body rows. */
  striped?: boolean;
  /** Keeps the header visible while the table scrolls. Pair with `maxHeight`. */
  stickyHeader?: boolean;
  /** Maximum height of the scroll area (px number or CSS length); the body scrolls past it. */
  maxHeight?: number | string;
  /** Classes for the outer wrapper. */
  className?: string;
  /** Classes for the `<table>` element. */
  tableClassName?: string;
  /**
   * Ref to the `<table>` element. DataTable is generic, so it takes `ref` as a plain prop
   * (React 19) instead of going through `forwardRef`, which would erase the row type.
   */
  ref?: React.Ref<HTMLTableElement>;
}

function readKey<T>(row: T, key: string): unknown {
  if (row !== null && typeof row === "object") {
    return (row as Record<string, unknown>)[key];
  }
  return undefined;
}

function compareValues(a: unknown, b: unknown) {
  if (a === b) return 0;
  if (a === null || a === undefined || a === "") return 1;
  if (b === null || b === undefined || b === "") return -1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return a === b ? 0 : a ? -1 : 1;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

function defaultRowId<T>(row: T, index: number) {
  const id = readKey(row, "id");
  return typeof id === "string" || typeof id === "number" ? String(id) : String(index);
}

/** Data-driven table with sorting, selection, loading and empty states. */
export function DataTable<T>({
  ref,
  columns,
  data,
  getRowId = defaultRowId,
  selectable,
  selectedRowIds,
  defaultSelectedRowIds = [],
  onSelectionChange,
  sort: sortProp,
  defaultSort = null,
  onSortChange,
  manualSorting,
  loading,
  loadingRows = 5,
  emptyState,
  onRowClick,
  caption,
  density,
  striped,
  stickyHeader,
  maxHeight,
  className,
  tableClassName,
}: DataTableProps<T>) {
  const [sort, setSort] = useControllableState<DataTableSort | null>({
    value: sortProp,
    defaultValue: defaultSort,
    onChange: onSortChange,
  });
  const [selected, setSelected] = useControllableState<string[]>({
    value: selectedRowIds,
    defaultValue: defaultSelectedRowIds,
    onChange: onSelectionChange,
  });

  const rows = React.useMemo(() => {
    const indexed = data.map((row, index) => ({ row, index, id: getRowId(row, index) }));
    if (!sort || manualSorting) return indexed;
    const column = columns.find((c) => c.key === sort.key);
    if (!column) return indexed;
    const value = (row: T) => (column.sortValue ? column.sortValue(row) : readKey(row, column.key));
    const dir = sort.direction === "asc" ? 1 : -1;
    return [...indexed].sort((a, b) => compareValues(value(a.row), value(b.row)) * dir || a.index - b.index);
  }, [data, columns, sort, manualSorting, getRowId]);

  const cycleSort = (key: string) => {
    if (!sort || sort.key !== key) setSort({ key, direction: "asc" });
    else if (sort.direction === "asc") setSort({ key, direction: "desc" });
    else setSort(null);
  };

  const allIds = rows.map((r) => r.id);
  const selectedCount = allIds.filter((id) => selected.includes(id)).length;
  const allSelected = allIds.length > 0 && selectedCount === allIds.length;
  const someSelected = selectedCount > 0 && !allSelected;
  const colSpan = columns.length + (selectable ? 1 : 0);

  return (
    <Table
      ref={ref}
      density={density}
      striped={striped}
      stickyHeader={stickyHeader}
      maxHeight={maxHeight}
      containerClassName={className}
      className={tableClassName}
      aria-busy={loading || undefined}
    >
      <TableHeader>
        <TableRow>
          {selectable ? (
            <TableHead>
              <TableCheckbox
                aria-label="Select all rows"
                checked={allSelected}
                indeterminate={someSelected}
                disabled={loading || allIds.length === 0}
                onCheckedChange={() =>
                  setSelected(
                    allSelected || someSelected
                      ? selected.filter((id) => !allIds.includes(id))
                      : Array.from(new Set([...selected, ...allIds]))
                  )
                }
              />
            </TableHead>
          ) : null}
          {columns.map((column) => (
            <TableHead
              key={column.key}
              align={column.align}
              style={column.width !== undefined ? { width: column.width } : undefined}
              className={column.headerClassName}
              sortDirection={
                column.sortable ? (sort && sort.key === column.key ? sort.direction : false) : undefined
              }
              onSort={column.sortable ? () => cycleSort(column.key) : undefined}
            >
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          Array.from({ length: loadingRows }, (_, i) => (
            <TableRow key={`skeleton-${i}`} className="hover:bg-transparent">
              {selectable ? (
                <TableCell>
                  <Skeleton shape="rect" className="size-4 rounded-[4px]" />
                </TableCell>
              ) : null}
              {columns.map((column, c) => (
                <TableCell key={column.key} align={column.align}>
                  <Skeleton
                    shape="rect"
                    className={cn(
                      "inline-block h-3.5 rounded-xs align-middle",
                      (i + c) % 3 === 0 ? "w-3/5" : (i + c) % 3 === 1 ? "w-4/5" : "w-2/5"
                    )}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : rows.length === 0 ? (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={colSpan} className="py-12 text-center">
              {emptyState ?? (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <span className="flex size-10 items-center justify-center rounded-full bg-muted">
                    <RiInboxLine className="size-5" aria-hidden />
                  </span>
                  <span className="text-sm font-medium text-foreground">No results</span>
                  <span className="text-xs">There is nothing to show here yet.</span>
                </div>
              )}
            </TableCell>
          </TableRow>
        ) : (
          rows.map(({ row, index, id }) => {
            const isSelected = selected.includes(id);
            return (
              <TableRow
                key={id}
                data-state={isSelected ? "selected" : undefined}
                onClick={onRowClick ? () => onRowClick(row, index) : undefined}
                className={cn(onRowClick && "cursor-pointer")}
              >
                {selectable ? (
                  <TableCell>
                    <TableCheckbox
                      aria-label="Select row"
                      checked={isSelected}
                      onCheckedChange={(checked) =>
                        setSelected(checked ? [...selected, id] : selected.filter((x) => x !== id))
                      }
                    />
                  </TableCell>
                ) : null}
                {columns.map((column) => (
                  <TableCell key={column.key} align={column.align} className={column.className}>
                    {column.cell
                      ? column.cell(row, index)
                      : (readKey(row, column.key) as React.ReactNode) ?? null}
                  </TableCell>
                ))}
              </TableRow>
            );
          })
        )}
      </TableBody>
      {caption ? <TableCaption>{caption}</TableCaption> : null}
    </Table>
  );
}
DataTable.displayName = "DataTable";
