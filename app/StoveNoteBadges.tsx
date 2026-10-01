import type { NoteStove } from "../lib/stove-note-queries";
import type { NoteStatus, StoveNote } from "../lib/stove-notes";
import NoteStatusMenu from "./NoteStatusMenu";

type StoveNoteBadgesProps = {
  stove: Pick<NoteStove, "number" | "madeToOrder">;
  notes: StoveNote[];
  onOpenNote: (note: StoveNote, status: NoteStatus) => void;
};

// One status label per open note of a stove, each with its own status list.
export default function StoveNoteBadges({ stove, notes, onOpenNote }: StoveNoteBadgesProps) {
  if (notes.length === 0) return null;
  return (
    <span className="note-badges">
      {notes.map((note) => <NoteStatusMenu key={note.id} stove={stove} note={note} onOpenNote={onOpenNote} showHandover />)}
    </span>
  );
}
