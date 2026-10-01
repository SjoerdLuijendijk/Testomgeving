"use client";

import type { NoteStatus, StoveNote } from "../lib/stove-notes";
import type { Stove } from "../lib/stoves";
import StatusMenu, { type StatusOption } from "./StatusMenu";
import { useNoteClosing } from "./useNoteClosing";

/**
 * The open note a stove's status pill stands for: its negotiation, or for a sold used stove the sale
 * still to deliver. Other open notes show as separate labels.
 */
export function pillNote(stove: Stove): StoveNote | undefined {
  if (!stove.soldAt) return stove.notes.find((note) => note.status === "negotiating");
  return stove.condition === "new" ? undefined : stove.notes.find((note) => note.status === "sold");
}

type StoveStatusProps = {
  stove: Stove;
  /** Opens the note dialog: an existing note, or a new one, with the status it moves to. */
  onOpenNote: (note: StoveNote | null, status: NoteStatus) => void;
};

// Status of a stove: Te koop, In onderhandeling or Verkocht, chosen from a list under the pill.
// Negotiating and selling open the note dialog for the (optional) details; selling a stove that keeps
// stock takes one unit. The stock itself is changed in its own column.
export default function StoveStatus({ stove, onOpenNote }: StoveStatusProps) {
  const { closeNote, restockSoldStove, pending } = useNoteClosing();
  const sold = Boolean(stove.soldAt);
  const note = pillNote(stove);
  const negotiation = note?.status === "negotiating" ? note : undefined;
  const sale = note?.status === "sold" ? note : undefined;

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
    onSelect: sold ? undefined : () => onOpenNote(null, "negotiating"),
  };
  const soldOption: StatusOption = {
    key: "sold",
    label: sold && stove.condition === "new" ? "Uitverkocht" : "Verkocht",
    tone: "sold",
    current: sold,
    onSelect: sold ? undefined : () => onOpenNote(negotiation ?? null, "sold"),
  };
  const options = [forSale, negotiating, soldOption];
  if (sale) options.push({ key: "done", label: "Afgeleverd", tone: "done", onSelect: () => closeNote(stove, sale, "done") });

  // A sold stove that is still to be delivered says so on its pill.
  const current = sale ? { ...soldOption, label: "Af te leveren" } : sold ? soldOption : negotiation ? negotiating : forSale;
  return (
    <StatusMenu
      label={current.label}
      tone={current.tone}
      options={options}
      ariaLabel={`Kachel ${stove.number}`}
      disabled={pending}
      onEditDetails={note ? () => onOpenNote(note, note.status) : undefined}
    />
  );
}
