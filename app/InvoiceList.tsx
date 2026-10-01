"use client";

import type { InvoiceSummary } from "../lib/invoice-queries";
import { formatPrice } from "../lib/price";
import { useInvoiceDownload } from "./useInvoiceDownload";

const DATE_FORMAT = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

// All invoices, also those of stoves that have since been deleted, in the stock table layout.
export default function InvoiceList({ invoices }: { invoices: InvoiceSummary[] }) {
  const { download, pending } = useInvoiceDownload();

  if (invoices.length === 0) {
    return <div className="notice"><p>Er zijn nog geen facturen.</p></div>;
  }
  return (
    <div className="table-wrap" aria-busy={pending}>
      <table className="stove-table invoice-table">
        <thead>
          <tr>
            <th scope="col">Factuur</th>
            <th scope="col">Datum</th>
            <th scope="col">Klant</th>
            <th scope="col" className="cell-number">Kachel</th>
            <th scope="col" className="cell-numeric">Bedrag</th>
            <th scope="col" className="cell-actions"><span className="visually-hidden">PDF</span></th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id}>
              <td data-label="Factuur" className="cell-number">{invoice.number}</td>
              <td data-label="Datum" className="cell-nowrap">
                <time dateTime={invoice.issueDate}>{DATE_FORMAT.format(new Date(invoice.issueDate))}</time>
              </td>
              <td data-label="Klant">{invoice.customerName}</td>
              <td data-label="Kachel">{invoice.stoveNumber ?? "—"}</td>
              <td data-label="Bedrag" className="cell-numeric cell-nowrap">{formatPrice(invoice.totalCents, { alwaysCents: true })}</td>
              <td className="cell-actions">
                <button type="button" className="invoice-link" onClick={() => download(invoice.id)} disabled={pending} aria-label={`Factuur ${invoice.number} downloaden`}>
                  ↓ PDF
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
