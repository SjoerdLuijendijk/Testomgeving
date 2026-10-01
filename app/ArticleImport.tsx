"use client";

import { useRef, useState, useTransition } from "react";
import { MAX_CSV_BYTES } from "../lib/articles";
import { importArticles, type ImportReport } from "./article-actions";

// "CSV importeren": reads the supplier CSV in the browser and imports it on the server.
export default function ArticleImport() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setReport(null);
    setError(null);
    if (file.size > MAX_CSV_BYTES) return setError("Het bestand is groter dan 1 MB.");
    const text = await file.text();
    startTransition(async () => {
      const result = await importArticles(text);
      if (result.ok) setReport(result.report);
      else setError(result.error);
    });
  }

  return (
    <>
      <button type="button" className="secondary-button toolbar-button" onClick={() => inputRef.current?.click()} disabled={pending}>
        {pending ? "Importeren…" : "CSV importeren"}
      </button>
      <input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={handleFile} />
      {(report || error) && (
        <div className="notice import-report" role="status">
          {error ? (
            <p className="field-error">{error}</p>
          ) : (
            report && (
              <>
                <p>
                  <strong>Import klaar:</strong> {report.created} toegevoegd, {report.updated} bijgewerkt
                  {report.skipped.length > 0 && `, ${report.skipped.length} overgeslagen`}.
                </p>
                {report.skipped.length > 0 && (
                  <ul>
                    {report.skipped.map(({ line, reason }) => <li key={line}>Regel {line}: {reason}</li>)}
                  </ul>
                )}
              </>
            )
          )}
          <button type="button" className="text-button" onClick={() => { setReport(null); setError(null); }}>Sluiten</button>
        </div>
      )}
    </>
  );
}
