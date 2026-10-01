"use client";

import { useState } from "react";
import type { StoveNoteWithStove } from "../lib/stove-note-queries";
import { byHandover, type NoteStatus } from "../lib/stove-notes";
import DeliveryRow, { formatAmount, type DeliveryAmounts } from "./DeliveryRow";
import StoveNoteDialog from "./StoveNoteDialog";

// Today in the Netherlands as YYYY-MM-DD, to flag deliveries whose date has passed.
const todayIsoDate = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Amsterdam" }).format(new Date());

function amountsOf(note: StoveNoteWithStove): DeliveryAmounts {
  const priceCents = note.priceCents ?? note.stove.priceCents;
  const paidCents = note.paymentStatus === "paid" ? priceCents : note.paymentStatus === "deposit" ? (note.paidCents ?? 0) : 0;
  const dueCents = priceCents === null || paidCents === null ? null : Math.max(0, priceCents - paidCents);
  return { priceCents, isAskingPrice: note.priceCents === null && priceCents !== null, paidCents, dueCents };
}

const sum = (values: (number | null)[]) => values.reduce<number>((total, value) => total + (value ?? 0), 0);

// Sold stoves still to be delivered or picked up, nearest date first, in the same table layout as the
// stock, with the totals paid and still to pay.
export default function DeliveryList({ notes }: { notes: StoveNoteWithStove[] }) {
  const [openNote, setOpenNote] = useState<{ note: StoveNoteWithStove; status: NoteStatus } | null>(null);
  const today = todayIsoDate();
  const rows = notes
    .filter((note) => note.status === "sold")
    .sort(byHandover)
    .map((note) => ({ note, amounts: amountsOf(note) }));

  if (rows.length === 0) {
    return <div className="notice"><p>Er staan geen kachels klaar om af te leveren.</p></div>;
  }
  const unknownPrices = rows.filter(({ amounts }) => amounts.priceCents === null).length;

  return (
    <>
      <div className="table-wrap">
        <table className="stove-table delivery-table">
          <thead>
            <tr>
              <th scope="col" className="cell-number">Nr.</th>
              <th scope="col">Merk</th>
              <th scope="col">Wanneer</th>
              <th scope="col">Koper</th>
              <th scope="col">Adres</th>
              <th scope="col" className="cell-numeric">Prijs</th>
              <th scope="col" className="cell-numeric">Aanbetaald</th>
              <th scope="col" className="cell-numeric">Nog te betalen</th>
              <th scope="col">Afspraken</th>
              <th scope="col">Status</th>
              <th scope="col" className="cell-actions"><span className="visually-hidden">Bewerken</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ note, amounts }) => (
              <DeliveryRow key={note.id} note={note} amounts={amounts} today={today} onOpenNote={(row, status) => setOpenNote({ note: row, status })} />
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5}>
                {rows.length} {rows.length === 1 ? "kachel" : "kachels"}
                {unknownPrices > 0 && <span className="muted"> · {unknownPrices} zonder prijs, niet meegeteld</span>}
              </td>
              <td className="cell-numeric" data-label="Prijs">{formatAmount(sum(rows.map(({ amounts }) => amounts.priceCents)))}</td>
              <td className="cell-numeric" data-label="Aanbetaald">{formatAmount(sum(rows.map(({ amounts }) => amounts.paidCents)))}</td>
              <td className="cell-numeric cell-due" data-label="Nog te betalen">{formatAmount(sum(rows.map(({ amounts }) => amounts.dueCents)))}</td>
              <td colSpan={3} className="muted">incl. btw</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {openNote && <StoveNoteDialog stove={openNote.note.stove} note={openNote.note} status={openNote.status} onClose={() => setOpenNote(null)} />}
    </>
  );
}
