import { formatHandover, NOTE_STATUS_LABELS, type StoveNote } from "../lib/stove-notes";

// One label per open note of a stove; a click opens the note.
export default function StoveNoteBadges({ notes, onOpen }: { notes: StoveNote[]; onOpen: (note: StoveNote) => void }) {
  if (notes.length === 0) return null;
  return (
    <span className="note-badges">
      {notes.map((note) => {
        const handover = formatHandover(note);
        const label = [NOTE_STATUS_LABELS[note.status], note.buyerName, handover].filter(Boolean).join(" · ");
        return (
          <button key={note.id} type="button" className={`note-badge note-badge--${note.status}`} onClick={() => onOpen(note)} title={`Notitie openen: ${label}`}>
            {NOTE_STATUS_LABELS[note.status]}
            {handover && <span className="note-badge-detail"> · {handover}</span>}
          </button>
        );
      })}
    </span>
  );
}
