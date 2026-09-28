"use client";

import { useRef, useState, useTransition } from "react";
import type { Stove } from "../lib/stoves";
import { updateStove } from "./actions";
import StoveFields from "./StoveFields";

export default function EditStoveDialog({ stove, brands }: { stove: Stove; brands: string[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [formKey, setFormKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function open() {
    // Remount the form so it starts from the latest saved values.
    setFormKey((key) => key + 1);
    setError(null);
    dialogRef.current?.showModal();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await updateStove(stove.number, formData);
      if (result.ok) dialogRef.current?.close();
      else setError(result.error);
    });
  }

  const titleId = `edit-stove-${stove.number}`;
  return (
    <>
      <button type="button" className="text-button" onClick={open}>Bewerken</button>
      <dialog ref={dialogRef} className="edit-dialog" aria-labelledby={titleId}>
        <form key={formKey} onSubmit={handleSubmit} className="form-stack">
          <h2 id={titleId}>Kachel {stove.number} bewerken</h2>
          <StoveFields brands={brands} stove={stove} />
          {error && <p className="field-error" role="alert">{error}</p>}
          <div className="button-row dialog-actions">
            <button type="button" className="secondary-button" onClick={() => dialogRef.current?.close()} disabled={pending}>
              Annuleren
            </button>
            <button type="submit" className="primary-button" disabled={pending}>
              {pending ? "Opslaan…" : "Wijzigingen opslaan"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
