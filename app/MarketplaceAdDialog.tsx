"use client";

import { useId, useRef, useState, useTransition } from "react";
import { MAX_AD_TEXT_LENGTH } from "../lib/ad-prompt";
import { getMarketplaceAd, saveMarketplaceAd, type MarketplaceAd } from "./ad-actions";
import { useDialog } from "./DialogProvider";

type Status = { kind: "error" | "info"; text: string } | null;

const OUTDATED_WARNING =
  "De kachel is bewerkt nadat deze tekst met de hand is aangepast. Controleer de gegevens (zoals de prijs) of klik op “Opnieuw”.";

// Shows the stored Marktplaats ad for a stove, to edit, save and copy. The trigger is hidden on phones via CSS.
export default function MarketplaceAdDialog({ stoveNumber }: { stoveNumber: number }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const requestRef = useRef(0);
  const [saved, setSaved] = useState<MarketplaceAd | null>(null);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>(null);
  const [pending, startTransition] = useTransition();
  const { confirm } = useDialog();
  const id = useId();

  const dirty = saved !== null && text !== saved.text;

  // Loads the stored ad (prepared when the stove was saved) or, with regenerate, makes a new one.
  function load(regenerate: boolean) {
    // Results of an earlier request (closed dialog, "Opnieuw") are ignored.
    const request = ++requestRef.current;
    setStatus(null);
    startTransition(async () => {
      const result = await getMarketplaceAd(stoveNumber, regenerate);
      if (request !== requestRef.current) return;
      if (!result.ok) {
        setStatus({ kind: "error", text: result.error });
        return;
      }
      setSaved(result.ad);
      setText(result.ad.text);
      if (regenerate) setStatus({ kind: "info", text: "Nieuwe tekst gemaakt en opgeslagen." });
    });
  }

  function open() {
    setSaved(null);
    setText("");
    dialogRef.current?.showModal();
    load(false);
  }

  async function regenerate() {
    if (saved?.edited || dirty) {
      const confirmed = await confirm({
        title: "Nieuwe tekst maken?",
        message: "Je aangepaste tekst wordt vervangen door een nieuwe tekst van de AI.",
        confirmLabel: "Nieuwe tekst maken",
        danger: true,
      });
      if (!confirmed) return;
    }
    load(true);
  }

  function save() {
    const request = ++requestRef.current;
    const value = text.trim();
    setStatus(null);
    startTransition(async () => {
      const result = await saveMarketplaceAd(stoveNumber, value);
      if (request !== requestRef.current) return;
      if (!result.ok) {
        setStatus({ kind: "error", text: result.error });
        return;
      }
      setSaved({ text: value, edited: true, outdated: false });
      setText(value);
      setStatus({ kind: "info", text: "Tekst opgeslagen. Werk de advertentie op Marktplaats en 2dehands ook bij." });
    });
  }

  async function close() {
    if (dirty) {
      const confirmed = await confirm({
        title: "Wijzigingen weggooien?",
        message: "Je aanpassingen aan de tekst zijn nog niet opgeslagen.",
        confirmLabel: "Weggooien",
        danger: true,
      });
      if (!confirmed) return;
    }
    dialogRef.current?.close();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus({ kind: "info", text: "Gekopieerd naar het klembord." });
    } catch {
      setStatus({ kind: "error", text: "Kopiëren lukte niet; selecteer de tekst en kopieer handmatig." });
    }
  }

  const titleId = `${id}-title`;
  const loading = pending && saved === null;
  return (
    <>
      <button type="button" className="text-button desktop-only" onClick={open}>Advertentie</button>
      <dialog
        ref={dialogRef}
        className="edit-dialog ad-dialog"
        aria-labelledby={titleId}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClose={() => requestRef.current++}
      >
        <h2 id={titleId}>Advertentie kachel {stoveNumber}</h2>
        <p className="muted">Pas de tekst zo nodig aan en sla hem op. Plaats of werk de advertentie daarna bij op Marktplaats en 2dehands.</p>
        {saved?.outdated && !dirty && <p className="ad-warning" role="note">{OUTDATED_WARNING}</p>}

        <label htmlFor={`${id}-text`} className="visually-hidden">Advertentietekst</label>
        <textarea
          id={`${id}-text`}
          className="ad-text"
          value={loading ? "" : text}
          placeholder={loading ? "Tekst wordt geladen…" : undefined}
          maxLength={MAX_AD_TEXT_LENGTH}
          onChange={(event) => {
            setText(event.target.value);
            setStatus(null);
          }}
          readOnly={pending}
          aria-busy={pending}
          rows={18}
        />

        <p className="ad-status" role="status">
          {status && <span className={status.kind === "error" ? "field-error" : undefined}>{status.text}</span>}
        </p>

        <div className="button-row dialog-actions">
          <button type="button" className="secondary-button" onClick={close}>Sluiten</button>
          <button type="button" className="secondary-button" onClick={regenerate} disabled={pending}>
            {pending ? "Bezig…" : "Opnieuw"}
          </button>
          <button type="button" className="secondary-button" onClick={copy} disabled={pending || !text}>Kopiëren</button>
          <button type="button" className="primary-button" onClick={save} disabled={pending || !dirty || !text.trim()}>Opslaan</button>
        </div>
      </dialog>
    </>
  );
}
