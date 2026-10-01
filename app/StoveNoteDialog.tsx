"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { formatPrice, formatPriceInput } from "../lib/price";
import type { NoteStove } from "../lib/stove-note-queries";
import {
  HANDOVER_LABELS,
  HANDOVER_TIMES,
  MAX_AGREEMENTS_LENGTH,
  NOTE_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  type NoteStatus,
  type PaymentStatus,
  type StoveNote,
} from "../lib/stove-notes";
import { makeStoveMadeToOrder } from "./actions";
import { useDialog } from "./DialogProvider";
import { saveStoveNote } from "./note-actions";

const BUYER_FIELDS: { name: string; key: keyof StoveNote; label: string; type?: string; autoComplete: string; maxLength: number; wide?: boolean }[] = [
  { name: "buyer_name", key: "buyerName", label: "Naam", autoComplete: "off", maxLength: 200, wide: true },
  { name: "buyer_phone", key: "buyerPhone", label: "Telefoon", type: "tel", autoComplete: "off", maxLength: 40 },
  { name: "buyer_email", key: "buyerEmail", label: "E-mail", type: "email", autoComplete: "off", maxLength: 320 },
  { name: "buyer_address", key: "buyerAddress", label: "Adres", autoComplete: "off", maxLength: 200, wide: true },
  { name: "buyer_postal_code", key: "buyerPostalCode", label: "Postcode", autoComplete: "off", maxLength: 20 },
  { name: "buyer_city", key: "buyerCity", label: "Plaats", autoComplete: "off", maxLength: 100 },
];

type StoveNoteDialogProps = {
  stove: NoteStove;
  /** Null for a new note. */
  note: StoveNote | null;
  /**
   * The status the note gets on saving: its own status, or the one chosen in the status list.
   * Omitted for a new note whose kind (sale or negotiation) is chosen in the dialog itself.
   */
  status?: NoteStatus;
  onClose: () => void;
};

// Details of a negotiation or sale: buyer, handover, price, payment and agreements, all optional. The
// status is chosen beforehand in the status list. Rendered only while open.
export default function StoveNoteDialog({ stove, note, status: givenStatus, onClose }: StoveNoteDialogProps) {
  const [chosenStatus, setChosenStatus] = useState<NoteStatus>("sold");
  const status = givenStatus ?? chosenStatus;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  // Set on the first change, so a click next to the dialog never throws away typed details.
  const changedRef = useRef(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(note?.paymentStatus ?? "open");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { choose } = useDialog();

  useEffect(() => {
    // Development runs effects twice; showModal throws on a dialog that is already open.
    if (!dialogRef.current?.open) dialogRef.current?.showModal();
    // Start on the title instead of the first field, so phones neither jump to a field nor open the
    // keyboard straight away.
    titleRef.current?.focus({ preventScroll: true });
    dialogRef.current?.scrollTo({ top: 0 });
  }, []);

  const becomesSold = status === "sold" && note?.status !== "sold";
  const sellsLastUnit = becomesSold && stove.condition === "new" && !stove.madeToOrder && stove.stockQuantity === 1;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);

    // Selling the last unit of a new stove: archive it, or keep offering it made to order.
    let keepMadeToOrder = false;
    if (sellsLastUnit) {
      const choice = await choose({
        title: `Laatste kachel ${stove.number} verkocht`,
        message:
          "In archief plaatsen: de kachel is uitverkocht en gaat naar het Verkocht archief (menu rechtsboven). Op bestelling: de kachel blijft te koop en wordt voortaan bij de leverancier besteld.",
        choices: [
          { value: "order", label: "Op bestelling leverbaar" },
          { value: "archive", label: "In archief plaatsen" },
        ],
      });
      if (choice === null) return;
      keepMadeToOrder = choice === "order";
    }

    startTransition(async () => {
      // Made to order first, so the sale does not take the last unit from the stock.
      if (keepMadeToOrder) {
        const result = await makeStoveMadeToOrder(stove.number);
        if (!result.ok) return setError(result.error);
      }
      const result = await saveStoveNote(stove.number, note?.id ?? null, formData);
      if (!result.ok) return setError(result.error);
      dialogRef.current?.close();
    });
  }

  // A click on the backdrop (outside the dialog box) closes it while nothing has been changed.
  function handleBackdropClick(event: React.MouseEvent<HTMLDialogElement>) {
    const dialog = dialogRef.current;
    if (!dialog || event.target !== dialog || changedRef.current || pending) return;
    const rect = dialog.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!inside) dialog.close();
  }

  const titleId = `note-title-${stove.number}-${note?.id ?? "new"}`;
  return (
    <dialog ref={dialogRef} className="edit-dialog note-dialog" aria-labelledby={titleId} onClose={onClose} onClick={handleBackdropClick}>
      <form onSubmit={handleSubmit} onChange={() => (changedRef.current = true)} className="form-stack">
        <input type="hidden" name="status" value={status} />
        <div>
          <h2 id={titleId} ref={titleRef} tabIndex={-1} className="dialog-title">
            Kachel {stove.number} <span className="muted">{stove.brand}</span>
          </h2>
          {givenStatus === undefined && (
            <div className="choice-options note-kind-options" role="radiogroup" aria-label="Soort">
              {(["sold", "negotiating"] as const).map((value) => (
                <label key={value}>
                  <input type="radio" checked={chosenStatus === value} onChange={() => setChosenStatus(value)} />
                  <span>{value === "sold" ? (stove.condition === "new" ? "1 verkocht" : "Verkocht") : "In onderhandeling"}</span>
                </label>
              ))}
            </div>
          )}
          <p className="note-dialog-status">
            {givenStatus !== undefined && <span className={`note-badge note-badge--${status}`}>{becomesSold ? "Verkocht" : NOTE_STATUS_LABELS[status]}</span>}
            <span className="muted">
              {becomesSold && !stove.madeToOrder
                ? stove.condition === "new"
                  ? "Bij opslaan gaat de voorraad 1 omlaag."
                  : "Bij opslaan gaat de kachel naar het Verkocht archief en wordt hij nergens meer aangeboden."
                : status === "negotiating"
                  ? "De kachel blijft gewoon te koop."
                  : "Alle velden zijn optioneel."}
            </span>
          </p>
        </div>

        {becomesSold && (
          <fieldset className="invoice-section">
            <legend>Afleveren</legend>
            <div className="choice-options">
              <label>
                <input type="radio" name="delivery" value="now" required />
                <span>Direct afgeleverd</span>
              </label>
              <label>
                <input type="radio" name="delivery" value="later" required />
                <span>Nog af te leveren</span>
              </label>
            </div>
            <p className="form-hint muted">Nog af te leveren: de kachel komt in de lijst Af te leveren (menu rechtsboven) tot je hem op Afgeleverd zet.</p>
          </fieldset>
        )}

        <fieldset className="invoice-section">
          <legend>Koper <span className="muted">(optioneel)</span></legend>
          <div className="customer-grid">
            {BUYER_FIELDS.map((field) => (
              <label key={field.name} className={field.wide ? "stacked-label customer-wide" : "stacked-label"}>
                <span>{field.label}</span>
                <input name={field.name} type={field.type ?? "text"} autoComplete={field.autoComplete} maxLength={field.maxLength} defaultValue={(note?.[field.key] as string | null) ?? ""} />
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="invoice-section">
          <legend>Ophalen of bezorgen <span className="muted">(met datum in de agenda)</span></legend>
          <div className="customer-grid">
            <label className="stacked-label customer-wide">
              <span>Hoe</span>
              <select name="handover" defaultValue={note?.handover ?? ""}>
                <option value="">Nog niet bekend</option>
                {Object.entries(HANDOVER_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="stacked-label">
              <span>Datum</span>
              <input name="handover_date" type="date" defaultValue={note?.handoverDate ?? ""} />
            </label>
            <label className="stacked-label">
              <span>Tijd</span>
              <select name="handover_time" defaultValue={note?.handoverTime ?? ""}>
                <option value="">—</option>
                {/* A time saved earlier that is not on a quarter stays selectable. */}
                {note?.handoverTime && !HANDOVER_TIMES.includes(note.handoverTime) && <option value={note.handoverTime}>{note.handoverTime}</option>}
                {HANDOVER_TIMES.map((time) => <option key={time} value={time}>{time}</option>)}
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset className="invoice-section">
          <legend>Prijs en betaling</legend>
          <div className="customer-grid">
            <label className="stacked-label customer-wide">
              <span>Verkoopprijs (€)</span>
              <input
                name="price"
                inputMode="decimal"
                placeholder={stove.priceCents ? `Vraagprijs ${formatPrice(stove.priceCents)}` : undefined}
                defaultValue={note?.priceCents != null ? formatPriceInput(note.priceCents) : ""}
              />
            </label>
            <label className="stacked-label">
              <span>Betaling</span>
              <select name="payment_status" value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as PaymentStatus)}>
                {Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="stacked-label">
              <span>Betaalwijze</span>
              <select name="payment_method" defaultValue={note?.paymentMethod ?? ""}>
                <option value="">—</option>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            {paymentStatus === "deposit" && (
              <label className="stacked-label customer-wide">
                <span>Aanbetaald bedrag (€)</span>
                <input name="paid" inputMode="decimal" defaultValue={note?.paidCents != null ? formatPriceInput(note.paidCents) : ""} />
              </label>
            )}
          </div>
        </fieldset>

        <label className="stacked-label invoice-section">
          <span>Aanvullende afspraken</span>
          <textarea name="agreements" rows={4} maxLength={MAX_AGREEMENTS_LENGTH} defaultValue={note?.agreements ?? ""} />
        </label>

        {error && <p className="field-error" role="alert">{error}</p>}
        <div className="button-row dialog-actions">
          <button type="button" className="secondary-button" onClick={() => dialogRef.current?.close()} disabled={pending}>
            Annuleren
          </button>
          <button type="submit" className="primary-button" disabled={pending}>
            {pending ? "Opslaan…" : "Opslaan"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
