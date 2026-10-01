"use client";

import { useState } from "react";
import { formatPrice } from "../lib/price";
import type { StoveNoteWithStove } from "../lib/stove-note-queries";
import { formatHandover, formatPayment, type NoteStatus } from "../lib/stove-notes";
import NoteStatusMenu from "./NoteStatusMenu";

type NoteRowProps = {
  note: StoveNoteWithStove;
  onOpenNote: (note: StoveNoteWithStove, status: NoteStatus) => void;
};

// One negotiation (or closed note), laid out like a row of the stock table (a compact card on phones).
export default function NoteRow({ note, onOpenNote }: NoteRowProps) {
  const [expanded, setExpanded] = useState(false);
  const priceCents = note.priceCents ?? note.stove.priceCents;

  return (
    <tr className={expanded ? "is-expanded" : undefined}>
      <td data-label="Nr." className="cell-number">{note.stoveNumber}</td>
      <td data-label="Merk" className="cell-brand">{note.stove.brand}</td>
      <td data-label="Ophalen / bezorgen" className="cell-when cell-nowrap">{formatHandover(note) ?? "—"}</td>
      <td data-label="Koper" className="cell-detail">
        {note.buyerName ?? "—"}
        {note.buyerPhone && (
          <>
            {" · "}
            <a href={`tel:${note.buyerPhone.replace(/[^\d+]/g, "")}`}>{note.buyerPhone}</a>
          </>
        )}
      </td>
      <td data-label="Prijs" className="cell-price cell-nowrap cell-numeric">
        {priceCents === null ? "—" : formatPrice(priceCents)}
        {note.priceCents === null && priceCents !== null && <span className="muted"> (vraagprijs)</span>}
      </td>
      <td data-label="Betaling" className="cell-detail cell-nowrap">{formatPayment(note)}</td>
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
