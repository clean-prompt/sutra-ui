/** UsageInvoiceTable: invoice history with download / pay actions. */
import * as React from "react";
import { RiDownloadLine } from "@remixicon/react";
import { Badge } from "../../primitives/badge";
import { type Tone } from "../../lib/tone";
import { Button } from "../../primitives/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../primitives/table";
import { formatPrice } from "./billing-format";
import { formatDay } from "./billing-internal";

/* ------------------------------------------------------------------ */
/* UsageInvoiceTable                                                   */
/* ------------------------------------------------------------------ */

export type InvoiceStatus = "paid" | "due" | "failed" | "refunded";

export interface BillingInvoice {
  id: string;
  number?: string;
  date: Date | string;
  /** Minor units. */
  amount: number;
  currency?: string;
  status: InvoiceStatus;
  description?: string;
}

export interface UsageInvoiceTableProps extends React.HTMLAttributes<HTMLTableElement> {
  /** Invoices to list, each with a number, date, amount and status. */
  invoices: BillingInvoice[];
  /** BCP 47 locale used to format amounts and dates. Default "en-US". */
  locale?: string;
  /** Called with the invoice when the user presses Download; the action is hidden when unset. */
  onDownload?: (invoice: BillingInvoice) => void;
  /** Called with the invoice when the user presses Pay on an open one; the action is hidden when unset. */
  onPay?: (invoice: BillingInvoice) => void;
  /** Shown when there are no invoices. Default "No invoices yet". */
  emptyState?: React.ReactNode;
  /** Content shown when there is nothing to list. @deprecated Use `emptyState`. */
  emptyLabel?: React.ReactNode;
}

const invoiceStatus: Record<InvoiceStatus, { label: string; tone: Tone }> = {
  paid: { label: "Paid", tone: "success" },
  due: { label: "Due", tone: "warning" },
  failed: { label: "Failed", tone: "destructive" },
  refunded: { label: "Refunded", tone: "neutral" },
};

/** Invoice history: date, description, amount, paid/due/failed status and download / pay actions. */
export const UsageInvoiceTable = React.forwardRef<HTMLTableElement, UsageInvoiceTableProps>(
  ({ invoices, locale = "en-US", onDownload, onPay, emptyState, emptyLabel, className, ...props }, ref) => (
    <Table ref={ref} className={className} data-slot="usage-invoice-table" {...props}>
      <caption className="sr-only">Invoices</caption>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Invoice</TableHead>
          <TableHead align="right">Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead align="right">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} align="center" className="py-8 text-muted-foreground">
              {emptyState ?? emptyLabel ?? "No invoices yet"}
            </TableCell>
          </TableRow>
        ) : (
          invoices.map((inv) => {
            const st = invoiceStatus[inv.status];
            const label = inv.number ?? inv.id;
            return (
              <TableRow key={inv.id} data-status={inv.status}>
                <TableCell className="whitespace-nowrap tabular-nums">{formatDay(inv.date, locale)}</TableCell>
                <TableCell>
                  <span className="block font-medium text-foreground">{label}</span>
                  {inv.description && <span className="block text-xs text-muted-foreground">{inv.description}</span>}
                </TableCell>
                <TableCell align="right" className="tabular-nums">
                  {formatPrice(inv.amount, inv.currency ?? "USD", locale)}
                </TableCell>
                <TableCell>
                  <Badge size="sm" tone={st.tone} variant="soft">
                    {st.label}
                  </Badge>
                </TableCell>
                <TableCell align="right">
                  <div className="flex justify-end gap-1">
                    {onPay && (inv.status === "due" || inv.status === "failed") && (
                      <Button size="xs" variant="outline" onClick={() => onPay(inv)} aria-label={`Pay invoice ${label}`}>
                        Pay now
                      </Button>
                    )}
                    {onDownload && (
                      <Button size="icon-xs" variant="ghost" onClick={() => onDownload(inv)} aria-label={`Download invoice ${label}`}>
                        <RiDownloadLine aria-hidden />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  )
);
UsageInvoiceTable.displayName = "UsageInvoiceTable";
