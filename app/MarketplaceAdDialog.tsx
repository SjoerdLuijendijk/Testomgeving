"use client";

import { useId, useRef, useState, useTransition } from "react";
import { createMarketplaceAd } from "./ad-actions";

type CopyStatus = "idle" | "copied" | "failed";

// Generates an editable Marktplaats ad text for a stove. The trigger is hidden on phones via CSS.
export default function MarketplaceAdDialog({ stoveNumber }: { stoveNumber: number }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const requestRef = useRef(0);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const [pending, startTransition] = useTransition();
  const id = useId();

  function generate() {
    // Results of an earlier request (closed dialog, "Opnieuw") are ignored.
    const request = ++requestRef.current;
    setError(null);
    setCopyStatus("idle");
    startTransition(async () => {
      const result = await createMarketplaceAd(stoveNumber);
      if (request !== requestRef.current) return;
      if (result.ok) setText(result.text);
      else setError(result.error);
    });
  }

  function open() {
    setText("");
    dialogRef.current?.showModal();
    generate();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }

  const titleId = `${id}-title`;
  return (
    <>
      <button type="button" className="text-button desktop-only" onClick={open}>Advertentie</button>
      <dialog ref={dialogRef} className="edit-dialog ad-dialog" aria-labelledby={titleId} onClose={() => requestRef.current++}>
        <h2 id={titleId}>Advertentie kachel {stoveNumber}</h2>
        <p className="muted">Controleer de tekst en pas hem zo nodig aan voordat je hem op Marktplaats plaatst.</p>

        <label htmlFor={`${id}-text`} className="visually-hidden">Advertentietekst</label>
        <textarea
          id={`${id}-text`}
          className="ad-text"
          value={pending ? "" : text}
          placeholder={pending ? "Tekst wordt gemaakt…" : undefined}
          onChange={(event) => {
            setText(event.target.value);
            setCopyStatus("idle");
          }}
          readOnly={pending}
          aria-busy={pending}
          rows={18}
        />

        <p className="ad-status" role="status">
          {error ? <span className="field-error">{error}</span> : copyStatus === "copied" ? "Gekopieerd naar het klembord." : copyStatus === "failed" ? "Kopiëren lukte niet; selecteer de tekst en kopieer handmatig." : null}
        </p>

        <div className="button-row dialog-actions">
          <button type="button" className="secondary-button" onClick={() => dialogRef.current?.close()}>Sluiten</button>
          <button type="button" className="secondary-button" onClick={generate} disabled={pending}>
            {pending ? "Bezig…" : "Opnieuw"}
          </button>
          <button type="button" className="primary-button" onClick={copy} disabled={pending || !text}>Kopiëren</button>
        </div>
      </dialog>
    </>
  );
}
