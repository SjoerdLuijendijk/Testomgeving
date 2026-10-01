"use client";

import type { NoteStatus, StoveNote } from "../lib/stove-notes";
import type { Stove } from "../lib/stoves";
import StatusMenu, { type StatusOption } from "./StatusMenu";
import { useNoteClosing } from "./useNoteClosing";

type SoldToggleProps = {
  stove: Stove;
  /** Opens the note dialog: an existing note, or a new one, with the status it moves to. */
  onOpenNote: (note: StoveNote | null, status: NoteStatus) => void;
};

// Status of a used (single-unit) stove: Te koop, In onderhandeling or Verkocht, chosen from a list
// under the pill. Negotiating and selling open the note dialog for the (optional) details.
export default function SoldToggle({ stove, onOpenNote }: SoldToggleProps) {
  const { closeNote, restockSoldStove, pending } = useNoteClosing();
  const sold = Boolean(stove.soldAt);
  const negotiation = sold ? undefined : stove.notes.find((note) => note.status === "negotiating");
  const sale = sold ? stove.notes.find((note) => note.status === "sold") : undefined;

  const forSale: StatusOption = {
    key: "available",
    label: "Te koop",
    tone: "available",
    current: !sold && !negotiation,
    onSelect: sold
      ? () => (sale ? closeNote(stove, sale, "cancelled", "always") : restockSoldStove(stove.number))
      : negotiation
        ? () => closeNote(stove, negotiation, "cancelled")
        : undefined,
  };
  const negotiating: StatusOption = {
    key: "negotiating",
    label: "In onderhandeling",
    tone: "negotiating",
    current: Boolean(negotiation),
    onSelect: sold ? undefined : () => onOpenNote(negotiation ?? null, "negotiating"),
  };
  const soldOption: StatusOption = {
    key: "sold",
    label: "Verkocht",
    tone: "sold",
    current: sold,
    onSelect: sold ? (sale ? () => onOpenNote(sale, "sold") : undefined) : () => onOpenNote(negotiation ?? null, "sold"),
  };
  const options = [forSale, negotiating, soldOption];
  if (sale) options.push({ key: "done", label: "Afgehandeld (betaald en opgehaald)", tone: "done", onSelect: () => closeNote(stove, sale, "done") });

  const current = sold ? soldOption : negotiation ? negotiating : forSale;
  return <StatusMenu label={current.label} tone={current.tone} options={options} ariaLabel={`Kachel ${stove.number}`} disabled={pending} />;
}
