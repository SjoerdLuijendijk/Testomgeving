"use client";

import { useState } from "react";
import type { StoveNoteWithStove } from "../lib/stove-note-queries";
import { byHandover, HANDOVER_LABELS, isOpenStatus, type NoteStatus } from "../lib/stove-notes";
import { todayInNetherlands } from "../lib/today";
import NoteStatusMenu from "./NoteStatusMenu";
import StoveNoteDialog from "./StoveNoteDialog";

const DAY_FORMAT = new Intl.DateTimeFormat("nl-NL", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const SHORT_DAY_FORMAT = new Intl.DateTimeFormat("nl-NL", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dayTitle(isoDate: string, today: string) {
  const label = DAY_FORMAT.format(new Date(`${isoDate}T00:00:00Z`));
  if (isoDate === today) return `Vandaag · ${label}`;
  if (isoDate === addDays(today, 1)) return `Morgen · ${label}`;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// Appointments of open notes (viewings, pickups, deliveries) grouped per day, from today on. Open
// appointments whose day has passed come first, so nothing is forgotten.
export default function AgendaList({ notes }: { notes: StoveNoteWithStove[] }) {
  const [openNote, setOpenNote] = useState<{ note: StoveNoteWithStove; status: NoteStatus } | null>(null);
  const today = todayInNetherlands();
  const open = notes.filter((note) => isOpenStatus(note.status));
  const dated = open.filter((note) => note.handoverDate !== null).sort(byHandover);
  const undated = open.length - dated.length;

  const days = new Map<string, StoveNoteWithStove[]>();
  for (const note of dated) {
    const key = note.handoverDate! < today ? "past" : note.handoverDate!;
    days.set(key, [...(days.get(key) ?? []), note]);
  }

  return (
    <>
      {days.size === 0 ? (
        <div className="notice">
          <p>Er staan geen afspraken in de agenda. Vul bij een notitie een soort afspraak met datum in.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="stove-table agenda-table">
            <thead>
              <tr>
                <th scope="col">Tijd</th>
                <th scope="col">Afspraak</th>
                <th scope="col" className="cell-number">Nr.</th>
                <th scope="col">Merk</th>
                <th scope="col">Koper</th>
                <th scope="col">Adres</th>
                <th scope="col">Afspraken</th>
                <th scope="col">Status</th>
                <th scope="col" className="cell-actions"><span className="visually-hidden">Bewerken</span></th>
              </tr>
            </thead>
            {[...days].map(([day, dayNotes]) => (
              <tbody key={day}>
                <tr className={day === "past" ? "agenda-day is-overdue" : day === today ? "agenda-day is-today" : "agenda-day"}>
                  <th scope="colgroup" colSpan={9}>
                    {day === "past" ? "Verstreken, nog open" : dayTitle(day, today)}
                    <span className="agenda-day-count">{dayNotes.length}</span>
                  </th>
                </tr>
                {dayNotes.map((note) => {
                  const address = [note.buyerAddress, [note.buyerPostalCode, note.buyerCity].filter(Boolean).join(" ")].filter(Boolean).join(", ");
                  return (
                      <tr key={note.id}>
                        <td data-label="Tijd" className="cell-nowrap agenda-time">
                          {day === "past" && <span className="delivery-overdue">{SHORT_DAY_FORMAT.format(new Date(`${note.handoverDate}T00:00:00Z`))} </span>}
                          {note.handoverTime ?? "—"}
                        </td>
                        <td data-label="Afspraak" className="cell-nowrap">
                          {note.handover ? <span className={`agenda-kind agenda-kind--${note.handover}`}>{HANDOVER_LABELS[note.handover]}</span> : "—"}
                        </td>
                        <td data-label="Nr." className="cell-number">{note.stoveNumber}</td>
                        <td data-label="Merk" className="cell-brand">{note.stove.brand}</td>
                        <td data-label="Koper">
                          {note.buyerName ?? "—"}
                          {note.buyerPhone && (
                            <>
                              {" · "}
                              <a href={`tel:${note.buyerPhone.replace(/[^\d+]/g, "")}`}>{note.buyerPhone}</a>
                            </>
                          )}
                        </td>
                        <td data-label="Adres" className="cell-wrap">{address || "—"}</td>
                        <td data-label="Afspraken" className="cell-wrap">{note.agreements ?? "—"}</td>
                        <td data-label="Status" className="cell-status">
                          <NoteStatusMenu stove={note.stove} note={note} onOpenNote={(_, status) => setOpenNote({ note, status })} />
                        </td>
                        <td className="cell-actions">
                          <button type="button" className="icon-button" onClick={() => setOpenNote({ note, status: note.status })} title="Gegevens bewerken" aria-label={`Afspraak kachel ${note.stoveNumber} bewerken`}>
                            <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                  );
                })}
              </tbody>
            ))}
          </table>
        </div>
      )}
      {undated > 0 && (
        <p className="form-hint muted agenda-undated">
          {undated} open {undated === 1 ? "notitie heeft" : "notities hebben"} nog geen datum; die staan onder Notities en Af te leveren.
        </p>
      )}

      {openNote && <StoveNoteDialog stove={openNote.note.stove} note={openNote.note} status={openNote.status} onClose={() => setOpenNote(null)} />}
    </>
  );
}
