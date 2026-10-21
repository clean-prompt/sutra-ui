/** ComparisonTable: product-vs-alternatives matrix with marks and footnotes. */
import * as React from "react";
import { RiCheckLine, RiCloseLine, RiContrastLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { useSafeId } from "../hooks/use-safe-id";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../primitives/table";

export type ComparisonMark = "yes" | "no" | "partial";

export interface ComparisonProduct {
  id: string;
  name: string;
  /** Your product: highlighted column. */
  highlight?: boolean;
}

export interface ComparisonRow {
  feature: string;
  description?: string;
  /** "yes" | "no" | "partial" render as marks; other strings as text. */
  values: Record<string, ComparisonMark | (string & {})>;
  /** Footnote id (from `footnotes`). */
  footnote?: string;
}

export interface ComparisonFootnote {
  id: string;
  text: React.ReactNode;
}

export interface ComparisonTableProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Columns of the table; each has an `id`, a `name` and an optional `highlight` for your own product. */
  products: ComparisonProduct[];
  /** Feature rows; each has a `feature` and `values` keyed by product id (`yes`, `no`, `partial` or text). */
  rows: ComparisonRow[];
  /** Footnotes listed under the table; rows reference them by id. */
  footnotes?: ComparisonFootnote[];
  /**
   * Visually hidden caption that names the table for assistive technology.
   * @default "Product comparison"
   */
  caption?: string;
}

function Mark({ value }: { value: string | undefined }) {
  if (value === "yes")
    return (
      <span data-mark="yes" className="inline-flex size-6 items-center justify-center rounded-full bg-success-soft text-success">
        <RiCheckLine aria-hidden className="size-4" />
        <span className="sr-only">Yes</span>
      </span>
    );
  if (value === "partial")
    return (
      <span data-mark="partial" className="inline-flex size-6 items-center justify-center rounded-full bg-warning-soft text-warning-soft-foreground">
        <RiContrastLine aria-hidden className="size-4" />
        <span className="sr-only">Partial</span>
      </span>
    );
  if (value === "no" || value == null)
    return (
      <span data-mark="no" className="inline-flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <RiCloseLine aria-hidden className="size-4" />
        <span className="sr-only">No</span>
      </span>
    );
  return <span className="text-sm text-foreground">{value}</span>;
}

/** Product-vs-alternatives matrix with check / cross / partial marks and numbered footnotes. */
export const ComparisonTable = React.forwardRef<HTMLDivElement, ComparisonTableProps>(
  ({ products, rows, footnotes = [], caption = "Product comparison", className, ...props }, ref) => {
    const uid = useSafeId("comparison");
    const fnNumber = (id: string) => footnotes.findIndex((f) => f.id === id) + 1;
    return (
      <div ref={ref} className={cn("flex flex-col gap-3", className)} {...props}>
        <Table>
          <caption className="sr-only">{caption}</caption>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-48 ps-4">Feature</TableHead>
              {products.map((p) => (
                <TableHead key={p.id} align="center" className={cn("min-w-28", p.highlight && "bg-primary-soft text-primary-soft-foreground")}>
                  {p.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const n = r.footnote ? fnNumber(r.footnote) : 0;
              return (
                <TableRow key={r.feature}>
                  <th scope="row" className="border-b border-border px-4 py-3 text-start align-middle font-normal">
                    <span className="text-sm font-medium text-foreground">{r.feature}</span>
                    {n > 0 && (
                      <sup className="ms-0.5">
                        <a id={`${uid}-ref-${r.footnote}`} href={`#${uid}-fn-${r.footnote}`} aria-label={`Footnote ${n}`} className={cn("rounded-xs text-primary hover:underline", focusRing)}>
                          {n}
                        </a>
                      </sup>
                    )}
                    {r.description && <span className="block text-xs text-muted-foreground">{r.description}</span>}
                  </th>
                  {products.map((p) => (
                    <TableCell key={p.id} align="center" className={cn(p.highlight && "bg-primary-soft/30")}>
                      <Mark value={r.values[p.id]} />
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {footnotes.length > 0 && (
          <ol aria-label="Footnotes" className="flex list-decimal flex-col gap-1 ps-5 text-xs text-muted-foreground">
            {footnotes.map((f) => (
              <li key={f.id} id={`${uid}-fn-${f.id}`}>
                {f.text}
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  }
);
ComparisonTable.displayName = "ComparisonTable";
