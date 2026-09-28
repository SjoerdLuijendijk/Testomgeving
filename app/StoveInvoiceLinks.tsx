"use client";

import { useTransition } from "react";
import { downloadFile } from "../lib/download-file";
import type { StoveInvoice } from "../lib/stoves";
import { useDialog } from "./DialogProvider";
import { getInvoiceForPdf } from "./invoice-actions";

// Download links for invoices that were already made for this stove.
export default function StoveInvoiceLinks({ invoices }: { invoices: StoveInvoice[] }) {
  const [pending, startTransition] = useTransition();
  const { notify } = useDialog();

  function download(invoiceId: number) {
    startTransition(async () => {
      const result = await getInvoiceForPdf(invoiceId);
      if (!result.ok) {
        await notify(result.error);
        return;
      }
      const { createInvoicePdf, invoiceFileName } = await import("../lib/invoice-pdf");
      downloadFile(await createInvoicePdf(result.invoice), invoiceFileName(result.invoice));
    });
  }

  if (invoices.length === 0) return null;
  return (
    <span className="invoice-links" aria-busy={pending}>
      {invoices.map((invoice) => (
        <button key={invoice.id} type="button" className="invoice-link" onClick={() => download(invoice.id)} disabled={pending} title="Factuur downloaden">
          ↓ {invoice.number}
        </button>
      ))}
    </span>
  );
}
