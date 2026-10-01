"use client";

import { useState } from "react";
import { formatPrice } from "../lib/price";
import type { StoveNoteWithStove } from "../lib/stove-note-queries";
import { byHandover, formatHandover, formatPayment, HANDOVER_LABELS, type NoteStatus } from "../lib/stove-notes";
import NoteStatusMenu from "./NoteStatusMenu";
import StoveNoteDialog from "./StoveNoteDialog";

// Today in the Netherlands as YYYY-MM-DD, to flag deliveries whose date has passed.
const todayIsoDate = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Amsterdam" }).format(new Date());

// Sold stoves still to be delivered or picked up, nearest date first, each with its agreements.
export default function DeliveryList({ notes }: { notes: StoveNoteWithStove[] }) {
  const [openNote, setOpenNote] = useState<{ note: StoveNoteWithStove; status: NoteStatus } | null>(null);
  const deliveries = notes.filter((note) => note.status === "sold").sort(byHandover);
  const today = todayIsoDate();

  if (deliveries.length === 0) {
    return <p className="muted">Er staan geen kachels klaar om af te leveren.</p>;
  }
  return (
    <>
      <ul className="delivery-list">
        {deliveries.map((note) => {
          const overdue = note.handoverDate !== null && note.handoverDate < today;
          const address = [note.buyerAddress, [note.buyerPostalCode, note.buyerCity].filter(Boolean).join(" ")].filter(Boolean).join(", ");
          return (
            <li key={note.id} className={overdue ? "delivery-card is-overdue" : "delivery-card"}>
              <div className="delivery-card-header">
                <h2>
                  Kachel {note.stoveNumber} <span className="muted">{note.stove.brand}</span>
                </h2>
                <NoteStatusMenu stove={note.stove} note={note} onOpenNote={(_, status) => setOpenNote({ note, status })} />
              </div>
              <p className="delivery-when">
                {formatHandover(note) ?? (note.handover ? `${HANDOVER_LABELS[note.handover]}, datum nog niet afgesproken` : "Datum nog niet afgesproken")}
                {overdue && <span className="delivery-overdue"> · datum is verstreken</span>}
              </p>
              <dl className="delivery-details">
                <div>
                  <dt>Koper</dt>
                  <dd>
                    {note.buyerName ?? "—"}
                    {note.buyerPhone && <> · <a href={`tel:${note.buyerPhone.replace(/[^\d+]/g, "")}`}>{note.buyerPhone}</a></>}
                    {note.buyerEmail && <> · <a href={`mailto:${note.buyerEmail}`}>{note.buyerEmail}</a></>}
                  </dd>
                </div>
                {address && (
                  <div>
                    <dt>Adres</dt>
                    <dd>{address}</dd>
                  </div>
                )}
                <div>
                  <dt>Prijs</dt>
                  <dd>{note.priceCents != null ? formatPrice(note.priceCents) : "—"} · {formatPayment(note)}</dd>
                </div>
                <div>
                  <dt>Afspraken</dt>
                  <dd className="delivery-agreements">{note.agreements ?? "—"}</dd>
                </div>
              </dl>
              <button type="button" className="text-button" onClick={() => setOpenNote({ note, status: note.status })}>
                Gegevens bewerken
              </button>
            </li>
          );
        })}
      </ul>

      {openNote && <StoveNoteDialog stove={openNote.note.stove} note={openNote.note} status={openNote.status} onClose={() => setOpenNote(null)} />}
    </>
  );
}
