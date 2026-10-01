"use client";

import type { NoteStove } from "../lib/stove-note-queries";
import { formatHandover, NOTE_STATUS_LABELS, type NoteStatus, type StoveNote } from "../lib/stove-notes";
import StatusMenu, { type StatusOption } from "./StatusMenu";
import { useNoteClosing } from "./useNoteClosing";

type NoteStatusMenuProps = {
  stove: Pick<NoteStove, "number" | "madeToOrder">;
  note: StoveNote;
  /** Opens the note dialog with the status the note moves to (its own status to view the details). */
  onOpenNote: (note: StoveNote, status: NoteStatus) => void;
  /** Adds the pickup or delivery moment to the label. */
  showHandover?: boolean;
};

// The status of one note, changed from a list under the pill.
export default function NoteStatusMenu({ stove, note, onOpenNote, showHandover }: NoteStatusMenuProps) {
  const { closeNote, pending } = useNoteClosing();
  const option = (status: NoteStatus, onSelect?: () => void): StatusOption => ({
    key: status,
    label: NOTE_STATUS_LABELS[status],
    tone: status,
    current: note.status === status,
    onSelect,
  });

  const options =
    note.status === "negotiating"
      ? [option("negotiating"), { ...option("sold", () => onOpenNote(note, "sold")), label: "Verkocht" }, option("cancelled", () => closeNote(stove, note, "cancelled"))]
      : note.status === "sold"
        ? [option("sold"), option("done", () => closeNote(stove, note, "done")), option("cancelled", () => closeNote(stove, note, "cancelled"))]
        : [option(note.status)];

  const handover = showHandover ? formatHandover(note) : null;
  return (
    <StatusMenu
      label={handover ? `${NOTE_STATUS_LABELS[note.status]} · ${handover}` : NOTE_STATUS_LABELS[note.status]}
      tone={note.status}
      options={options}
      ariaLabel={`Notitie kachel ${stove.number}`}
      disabled={pending}
      compact
      onEditDetails={() => onOpenNote(note, note.status)}
    />
  );
}
