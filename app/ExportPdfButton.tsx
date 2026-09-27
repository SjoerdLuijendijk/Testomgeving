"use client";

import { useState } from "react";
import type { PdfNoteFile } from "../lib/create-note-pdf";

type Props = {
  note: {
    id: number;
    text: string;
    createdAt: string;
    files: PdfNoteFile[];
  };
};

export default function ExportPdfButton({ note }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function downloadPdf() {
    setBusy(true);
    setError("");
    try {
      const { createNotePdf } = await import("../lib/create-note-pdf");
      const bytes = await createNotePdf(note);
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `notitie-${note.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "De PDF kon niet worden gemaakt.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="pdf-button" type="button" onClick={downloadPdf} disabled={busy}>
        <span aria-hidden="true">↓</span> {busy ? "PDF maken…" : "Download PDF"}
      </button>
      {error && <small className="inline-error" role="alert">{error}</small>}
    </>
  );
}
