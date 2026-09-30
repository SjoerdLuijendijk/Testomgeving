"use client";

import { useRef, useState, useTransition } from "react";
import { stoveProductName } from "../lib/stove-specs";
import type { Stove } from "../lib/stoves";
import { deleteStoveAction } from "./actions";

// Deletes a stove after asking whether its web shop product should go as well.
export default function DeleteStoveDialog({ stove }: { stove: Stove }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [fromShop, setFromShop] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const inShop = stove.shopProductId !== null || stove.shopListed;
  const titleId = `delete-stove-${stove.number}`;

  function open() {
    setFromShop(false);
    setError(null);
    dialogRef.current?.showModal();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await deleteStoveAction(stove.number, inShop && fromShop);
      if (result.ok) dialogRef.current?.close();
      else setError(result.error);
    });
  }

  return (
    <>
      <button type="button" className="icon-button icon-button--danger" onClick={open} title="Verwijderen" aria-label={`Kachel ${stove.number} verwijderen`}>
        <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      </button>
      <dialog ref={dialogRef} className="app-dialog" aria-labelledby={titleId}>
        <form onSubmit={handleSubmit} className="form-stack delete-form">
          <h2 id={titleId}>Kachel {stove.number} verwijderen?</h2>
          <p>
            {stoveProductName(stove)} en de foto&apos;s worden uit de app verwijderd. Dit kan niet ongedaan worden gemaakt.
          </p>
          {stove.invoices.length > 0 && <p>De facturen blijven bewaard onder Admin → Facturen.</p>}

          {inShop && (
            <label className="checkbox-field">
              <input type="checkbox" checked={fromShop} onChange={(event) => setFromShop(event.target.checked)} />
              <span>Ook uit de webshop halen (naar de prullenbak in WordPress)</span>
            </label>
          )}

          {error && <p className="field-error" role="alert">{error}</p>}
          <div className="button-row dialog-actions">
            <button type="button" className="secondary-button" onClick={() => dialogRef.current?.close()} disabled={pending}>
              Annuleren
            </button>
            <button type="submit" className="primary-button danger-button" disabled={pending}>
              {pending ? "Verwijderen…" : "Verwijderen"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
