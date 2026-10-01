"use client";

import { useState } from "react";
import { formatPrice } from "../lib/price";
import type { StoveNoteWithStove } from "../lib/stove-note-queries";
import { byHandover, formatHandover, HANDOVER_LABELS, PAYMENT_METHOD_LABELS, type NoteStatus } from "../lib/stove-notes";
import NoteStatusMenu from "./NoteStatusMenu";
import StoveNoteDialog from "./StoveNoteDialog";

// Today in the Netherlands as YYYY-MM-DD, to flag deliveries whose date has passed.
const todayIsoDate = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Amsterdam" }).format(new Date());

const money = (cents: number | null) => (cents === null ? "—" : formatPrice(cents));

// Sale price (the asking price when none was agreed), what has been paid, and what is still to pay.
function amounts(note: StoveNoteWithStove) {
  const priceCents = note.priceCents ?? note.stove.priceCents;
  const paidCents = note.paymentStatus === "paid" ? priceCents : note.paymentStatus === "deposit" ? (note.paidCents ?? 0) : 0;
  const dueCents = priceCents === null || paidCents === null ? null : Math.max(0, priceCents - paidCents);
  return { priceCents, isAskingPrice: note.priceCents === null && priceCents !== null, paidCents, dueCents };
}

const sum = (values: (number | null)[]) => values.reduce<number>((total, value) => total + (value ?? 0), 0);

// Sold stoves still to be delivered or picked up, nearest date first, with their agreements and the
// totals paid and still to pay.
export default function DeliveryList({ notes }: { notes: StoveNoteWithStove[] }) {
  const [openNote, setOpenNote] = useState<{ note: StoveNoteWithStove; status: NoteStatus } | null>(null);
  const deliveries = notes.filter((note) => note.status === "sold").sort(byHandover);
  const today = todayIsoDate();

  if (deliveries.length === 0) {
    return <p className="muted">Er staan geen kachels klaar om af te leveren.</p>;
  }
  const rows = deliveries.map((note) => ({ note, ...amounts(note) }));
  const unknownPrices = rows.filter((row) => row.priceCents === null).length;

  return (
    <>
      <div className="invoice-list delivery-list">
        <table>
          <thead>
            <tr>
              <th scope="col">Kachel</th>
              <th scope="col">Wanneer</th>
              <th scope="col">Koper</th>
              <th scope="col">Adres</th>
              <th scope="col" className="cell-amount">Prijs</th>
              <th scope="col" className="cell-amount">Aanbetaald</th>
              <th scope="col" className="cell-amount">Nog te betalen</th>
              <th scope="col">Afspraken</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ note, priceCents, isAskingPrice, paidCents, dueCents }) => {
              const overdue = note.handoverDate !== null && note.handoverDate < today;
              const address = [note.buyerAddress, [note.buyerPostalCode, note.buyerCity].filter(Boolean).join(" ")].filter(Boolean).join(", ");
              return (
                <tr key={note.id} className={overdue ? "is-overdue" : undefined}>
                  <td data-label="Kachel">
                    <button type="button" className="invoice-link" onClick={() => setOpenNote({ note, status: note.status })} aria-label={`Gegevens kachel ${note.stoveNumber} bewerken`}>
                      {note.stoveNumber} {note.stove.brand}
                    </button>
                  </td>
                  <td data-label="Wanneer">
                    {formatHandover(note) ?? (note.handover ? `${HANDOVER_LABELS[note.handover]}, nog geen datum` : "Nog geen datum")}
                    {overdue && <span className="delivery-overdue"> · verstreken</span>}
                  </td>
                  <td data-label="Koper">
                    {note.buyerName ?? "—"}
                    {note.buyerPhone && (
                      <>
                        <br />
                        <a href={`tel:${note.buyerPhone.replace(/[^\d+]/g, "")}`}>{note.buyerPhone}</a>
                      </>
                    )}
                  </td>
                  <td data-label="Adres">{address || "—"}</td>
                  <td data-label="Prijs" className="cell-amount">
                    {money(priceCents)}
                    {isAskingPrice && <span className="muted"> (vraagprijs)</span>}
                  </td>
                  <td data-label="Aanbetaald" className="cell-amount">
                    {money(paidCents)}
                    {note.paymentMethod && paidCents ? <span className="muted"> {PAYMENT_METHOD_LABELS[note.paymentMethod].toLowerCase()}</span> : null}
                  </td>
                  <td data-label="Nog te betalen" className="cell-amount cell-due">{money(dueCents)}</td>
                  <td data-label="Afspraken" className="delivery-agreements">{note.agreements ?? "—"}</td>
                  <td data-label="Status">
                    <NoteStatusMenu stove={note.stove} note={note} onOpenNote={(_, status) => setOpenNote({ note, status })} />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={4}>
                Totaal {rows.length} {rows.length === 1 ? "kachel" : "kachels"}
              </th>
              <td className="cell-amount">{money(sum(rows.map((row) => row.priceCents)))}</td>
              <td className="cell-amount">{money(sum(rows.map((row) => row.paidCents)))}</td>
              <td className="cell-amount cell-due">{money(sum(rows.map((row) => row.dueCents)))}</td>
              <td colSpan={2} className="muted">
                {unknownPrices > 0 && `${unknownPrices} zonder prijs, niet meegeteld`}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {openNote && <StoveNoteDialog stove={openNote.note.stove} note={openNote.note} status={openNote.status} onClose={() => setOpenNote(null)} />}
    </>
  );
}
