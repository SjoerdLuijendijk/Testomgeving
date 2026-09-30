"use client";

import { useTransition } from "react";
import { downloadFile } from "../lib/download-file";
import { useDialog } from "./DialogProvider";
import { getInvoiceForPdf } from "./invoice-actions";

// Builds an existing invoice's PDF in the browser and downloads it.
export function useInvoiceDownload() {
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

  return { download, pending };
}
