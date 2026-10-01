"use client";

import { useState } from "react";
import { formatPrice } from "../lib/price";
import type { StoveNoteWithStove } from "../lib/stove-note-queries";
import { formatHandover, isOpenStatus, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, type NoteStatus, type StoveNote } from "../lib/stove-notes";
import NoteStatusMenu from "./NoteStatusMenu";
import StoveNoteDialog from "./StoveNoteDialog";

const FILTERS = { open: "Open", closed: "Afgehandeld", all: "Alles" } as const;
type Filter = keyof typeof FILTERS;

const matchesFilter = (note: StoveNote, filter: Filter) => filter === "all" || (filter === "open") === isOpenStatus(note.status);

// Open notes with the nearest handover first; notes without a date after them, newest first.
function byHandover(a: StoveNote, b: StoveNote) {
  const keyA = a.handoverDate ? `${a.handoverDate} ${a.handoverTime ?? ""}` : null;
  const keyB = b.handoverDate ? `${b.handoverDate} ${b.handoverTime ?? ""}` : null;
  if (keyA && keyB && keyA !== keyB) return keyA < keyB ? -1 : 1;
  if (keyA !== keyB) return keyA ? -1 : 1;
  return b.id - a.id;
}

function paymentText(note: StoveNote) {
  const amount = note.paymentStatus === "deposit" && note.paidCents != null ? ` ${formatPrice(note.paidCents)}` : "";
  const method = note.paymentMethod ? ` (${PAYMENT_METHOD_LABELS[note.paymentMethod].toLowerCase()})` : "";
  return `${PAYMENT_STATUS_LABELS[note.paymentStatus]}${amount}${method}`;
}

// All sales notes in a row, from the account menu.
export default function StoveNoteList({ notes }: { notes: StoveNoteWithStove[] }) {
  const [filter, setFilter] = useState<Filter>("open");
  const [openNote, setOpenNote] = useState<{ note: StoveNoteWithStove; status: NoteStatus } | null>(null);

  const visible = notes.filter((note) => matchesFilter(note, filter));
  if (filter === "open") visible.sort(byHandover);

  return (
    <>
      <div className="kind-tabs" role="group" aria-label="Welke notities">
        {(Object.keys(FILTERS) as Filter[]).map((key) => (
          <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>
            {FILTERS[key]} <span>{notes.filter((note) => matchesFilter(note, key)).length}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="muted">
          {filter === "open" ? "Geen open notities. Voeg er een toe met het notitie-icoon bij een kachel, of door een kachel op verkocht te zetten." : "Geen notities."}
        </p>
      ) : (
        <div className="invoice-list note-list">
          <table>
            <thead>
              <tr>
                <th scope="col">Kachel</th>
                <th scope="col">Status</th>
                <th scope="col">Koper</th>
                <th scope="col">Ophalen / bezorgen</th>
                <th scope="col" className="cell-amount">Prijs</th>
                <th scope="col">Betaling</th>
                <th scope="col">Afspraken</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((note) => (
                <tr key={note.id}>
                  <td data-label="Kachel">
                    <button type="button" className="invoice-link" onClick={() => setOpenNote({ note, status: note.status })} aria-label={`Notitie bij kachel ${note.stoveNumber} openen`}>
                      {note.stoveNumber} {note.stove.brand}
                    </button>
                  </td>
                  <td data-label="Status">
                    <NoteStatusMenu stove={note.stove} note={note} onOpenNote={(_, status) => setOpenNote({ note, status })} />
                  </td>
                  <td data-label="Koper">{[note.buyerName, note.buyerPhone].filter(Boolean).join(" · ") || "—"}</td>
                  <td data-label="Ophalen / bezorgen">{formatHandover(note) ?? "—"}</td>
                  <td data-label="Prijs" className="cell-amount">{note.priceCents != null ? formatPrice(note.priceCents) : "—"}</td>
                  <td data-label="Betaling">{paymentText(note)}</td>
                  <td data-label="Afspraken" className="note-agreements" title={note.agreements ?? undefined}>{note.agreements ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="form-hint muted">Afgehandelde en geannuleerde notities worden een jaar na afsluiten automatisch verwijderd.</p>

      {openNote && <StoveNoteDialog stove={openNote.note.stove} note={openNote.note} status={openNote.status} onClose={() => setOpenNote(null)} />}
    </>
  );
}
