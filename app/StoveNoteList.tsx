"use client";

import { useState } from "react";
import type { StoveNoteWithStove } from "../lib/stove-note-queries";
import { byHandover, type NoteStatus, type StoveNote } from "../lib/stove-notes";
import NoteRow from "./NoteRow";
import StoveNoteDialog from "./StoveNoteDialog";

const FILTERS = { open: "Lopend", closed: "Afgesloten", all: "Alles" } as const;
type Filter = keyof typeof FILTERS;

const matchesFilter = (note: StoveNote, filter: Filter) => filter === "all" || (filter === "open") === (note.status === "negotiating");

// Stoves in negotiation (and closed notes), from the account menu, in the stock table layout. Sold
// stoves still to deliver have their own list (Af te leveren), so they are left out here.
export default function StoveNoteList({ notes }: { notes: StoveNoteWithStove[] }) {
  const [filter, setFilter] = useState<Filter>("open");
  const [openNote, setOpenNote] = useState<{ note: StoveNoteWithStove; status: NoteStatus } | null>(null);

  const listed = notes.filter((note) => note.status !== "sold");
  const visible = listed.filter((note) => matchesFilter(note, filter));
  if (filter === "open") visible.sort(byHandover);

  return (
    <section aria-labelledby="notes-title">
      <div className="stock-toolbar">
        <div className="stock-title-row">
          <h1 id="notes-title">In onderhandeling</h1>
        </div>
        <div className="kind-tabs" role="group" aria-label="Welke onderhandelingen">
          {(Object.keys(FILTERS) as Filter[]).map((key) => (
            <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>
              {FILTERS[key]} <span>{listed.filter((note) => matchesFilter(note, key)).length}</span>
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="notice">
          <p>{filter === "open" ? "Geen lopende onderhandelingen. Zet een kachel via zijn status op In onderhandeling." : "Niets gevonden."}</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="stove-table note-table">
            <thead>
              <tr>
                <th scope="col" className="cell-number">Nr.</th>
                <th scope="col">Merk</th>
                <th scope="col">Ophalen / bezorgen</th>
                <th scope="col">Koper</th>
                <th scope="col" className="cell-numeric">Prijs</th>
                <th scope="col">Betaling</th>
                <th scope="col">Afspraken</th>
                <th scope="col">Status</th>
                <th scope="col" className="cell-actions"><span className="visually-hidden">Bewerken</span></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((note) => (
                <NoteRow key={note.id} note={note} onOpenNote={(row, status) => setOpenNote({ note: row, status })} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openNote && <StoveNoteDialog stove={openNote.note.stove} note={openNote.note} status={openNote.status} onClose={() => setOpenNote(null)} />}
    </section>
  );
}
