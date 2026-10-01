"use client";

import { useState } from "react";
import { formatPrice } from "../lib/price";
import type { StoveNoteWithStove } from "../lib/stove-note-queries";
import { byHandover, formatHandover, formatPayment, isOpenStatus, type NoteStatus, type StoveNote } from "../lib/stove-notes";
import NoteStatusMenu from "./NoteStatusMenu";
import StoveNoteDialog from "./StoveNoteDialog";

const FILTERS = { open: "Open", closed: "Afgesloten", all: "Alles" } as const;
type Filter = keyof typeof FILTERS;

const matchesFilter = (note: StoveNote, filter: Filter) => filter === "all" || (filter === "open") === isOpenStatus(note.status);


// All sales notes in a row, from the account menu.
export default function StoveNoteList({ notes }: { notes: StoveNoteWithStove[] }) {
  const [filter, setFilter] = useState<Filter>("open");
  const [openNote, setOpenNote] = useState<{ note: StoveNoteWithStove; status: NoteStatus } | null>(null);

  // Sold stoves still to deliver have their own list (Af te leveren), so they are left out here.
  const listed = notes.filter((note) => note.status !== "sold");
  const visible = listed.filter((note) => matchesFilter(note, filter));
  if (filter === "open") visible.sort(byHandover);

  return (
    <>
      <div className="kind-tabs" role="group" aria-label="Welke notities">
        {(Object.keys(FILTERS) as Filter[]).map((key) => (
          <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>
            {FILTERS[key]} <span>{listed.filter((note) => matchesFilter(note, key)).length}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="muted">
          {filter === "open" ? "Geen lopende onderhandelingen. Voeg er een toe via de status van een kachel of het notitie-icoon." : "Geen notities."}
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
                  <td data-label="Betaling">{formatPayment(note)}</td>
                  <td data-label="Afspraken" className="note-agreements" title={note.agreements ?? undefined}>{note.agreements ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="form-hint muted">Verkochte kachels die nog afgeleverd moeten worden staan onder Af te leveren (menu rechtsboven). Afgeleverde en geannuleerde notities worden een jaar na afsluiten automatisch verwijderd.</p>

      {openNote && <StoveNoteDialog stove={openNote.note.stove} note={openNote.note} status={openNote.status} onClose={() => setOpenNote(null)} />}
    </>
  );
}
