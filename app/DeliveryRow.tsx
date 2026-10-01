"use client";

import { useState } from "react";
import { formatPrice } from "../lib/price";
import type { StoveNoteWithStove } from "../lib/stove-note-queries";
import { formatHandover, HANDOVER_LABELS, PAYMENT_METHOD_LABELS, type NoteStatus } from "../lib/stove-notes";
import NoteStatusMenu from "./NoteStatusMenu";

export type DeliveryAmounts = {
  /** The agreed sale price, or the asking price when none was agreed. */
  priceCents: number | null;
  isAskingPrice: boolean;
  paidCents: number | null;
  dueCents: number | null;
};

export const formatAmount = (cents: number | null) => (cents === null ? "—" : formatPrice(cents));

type DeliveryRowProps = {
  note: StoveNoteWithStove;
  amounts: DeliveryAmounts;
  /** YYYY-MM-DD, to flag a date that has passed. */
  today: string;
  onOpenNote: (note: StoveNoteWithStove, status: NoteStatus) => void;
};

// One stove to deliver, laid out like a row of the stock table (a compact card on phones).
export default function DeliveryRow({ note, amounts, today, onOpenNote }: DeliveryRowProps) {
  const [expanded, setExpanded] = useState(false);
  const overdue = note.handoverDate !== null && note.handoverDate < today;
  const address = [note.buyerAddress, [note.buyerPostalCode, note.buyerCity].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const rowClass = [overdue && "is-overdue", expanded && "is-expanded"].filter(Boolean).join(" ");

  return (
    <tr className={rowClass || undefined}>
      <td data-label="Nr." className="cell-number">{note.stoveNumber}</td>
      <td data-label="Merk" className="cell-brand">{note.stove.brand}</td>
      <td data-label="Wanneer" className="cell-when cell-nowrap">
        {formatHandover(note) ?? (note.handover ? `${HANDOVER_LABELS[note.handover]}, nog geen datum` : "Nog geen datum")}
        {overdue && <span className="delivery-overdue"> · verstreken</span>}
      </td>
      <td data-label="Koper" className="cell-detail">
        {note.buyerName ?? "—"}
        {note.buyerPhone && (
          <>
            {" · "}
            <a href={`tel:${note.buyerPhone.replace(/[^\d+]/g, "")}`}>{note.buyerPhone}</a>
          </>
        )}
      </td>
      <td data-label="Adres" className="cell-detail cell-wrap">{address || "—"}</td>
      <td data-label="Prijs" className="cell-detail cell-nowrap cell-numeric">
        {formatAmount(amounts.priceCents)}
        {amounts.isAskingPrice && <span className="muted"> (vraagprijs)</span>}
      </td>
      <td data-label="Aanbetaald" className="cell-detail cell-nowrap cell-numeric">
        {formatAmount(amounts.paidCents)}
        {note.paymentMethod && amounts.paidCents ? <span className="muted"> {PAYMENT_METHOD_LABELS[note.paymentMethod].toLowerCase()}</span> : null}
      </td>
      <td data-label="Nog te betalen" className="cell-price cell-nowrap cell-numeric">{formatAmount(amounts.dueCents)}</td>
      <td data-label="Afspraken" className="cell-detail cell-wrap">{note.agreements ?? "—"}</td>
      <td data-label="Status" className="cell-status cell-sold">
        <NoteStatusMenu stove={note.stove} note={note} onOpenNote={(_, status) => onOpenNote(note, status)} />
      </td>
      <td className="cell-detail cell-actions">
        <button type="button" className="icon-button" onClick={() => onOpenNote(note, note.status)} title="Gegevens bewerken" aria-label={`Gegevens kachel ${note.stoveNumber} bewerken`}>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>
      </td>
      <td className="cell-toggle">
        <button
          type="button"
          className="card-toggle"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-label={`Details van kachel ${note.stoveNumber} ${expanded ? "verbergen" : "tonen"}`}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </td>
    </tr>
  );
}
