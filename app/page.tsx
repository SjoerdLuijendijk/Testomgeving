import { FILES_BUCKET, supabase } from "../lib/supabase";
import { addNote, deleteNote } from "./actions";
import ExportPdfButton from "./ExportPdfButton";

export const dynamic = "force-dynamic";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export default async function Page() {
  const db = supabase();
  const { data: notes, error } = await db
    .from("notes")
    .select("id, text, created_at, note_files (id, path, name, size)")
    .order("created_at", { ascending: false });
  if (error) throw error;

  // Private bucket: hand out short-lived download links, named after the original file.
  const files = notes.flatMap((note) => note.note_files);
  const signed = await Promise.all(
    files.map((f) => db.storage.from(FILES_BUCKET).createSignedUrl(f.path, SIGNED_URL_TTL_SECONDS, { download: f.name })),
  );
  const urlByPath = new Map(files.map((f, i) => [f.path, signed[i].data?.signedUrl]));

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">N<span>.</span></span>
          <span className="brand-name">Notities</span>
        </div>
        <span className="header-caption">Jouw plek voor wat telt</span>
      </header>

      <main className="page-main">
        <div className="page-intro">
          <p className="eyebrow">JOUW OVERZICHT</p>
          <h1>Alles wat je wilt bewaren<span className="title-dot">.</span></h1>
          <p>Leg een gedachte vast, voeg bestanden toe en neem alles mee als PDF.</p>
        </div>

        <div className="content-grid">
          <section className="compose-panel" aria-labelledby="compose-title">
            <div className="panel-heading">
              <span className="panel-icon" aria-hidden="true">＋</span>
              <div>
                <p className="eyebrow">SNEL VASTLEGGEN</p>
                <h2 id="compose-title">Nieuwe notitie</h2>
              </div>
            </div>
            <form action={addNote} className="compose-form">
              <label htmlFor="note-text">Jouw notitie</label>
              <textarea id="note-text" name="text" maxLength={500} placeholder="Wat wil je onthouden?" rows={6} required />
              <label htmlFor="note-files">Bijlagen</label>
              <input id="note-files" name="files" type="file" multiple />
              <p className="field-hint">Bestanden samen maximaal 4 MB.</p>
              <button className="primary-button" type="submit">Notitie opslaan <span aria-hidden="true">↗</span></button>
            </form>
          </section>

          <section className="notes-section" aria-labelledby="notes-title">
            <div className="notes-heading">
              <div>
                <p className="eyebrow">VERZAMELING</p>
                <h2 id="notes-title">Recente notities</h2>
              </div>
              <span className="note-count">{notes.length} {notes.length === 1 ? "notitie" : "notities"}</span>
            </div>

            {notes.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon" aria-hidden="true">✦</span>
                <h3>Hier begint je verzameling</h3>
                <p>Schrijf links je eerste notitie en sla haar op.</p>
              </div>
            ) : (
              <ul className="notes-list">
                {notes.map((note) => (
                  <li key={note.id} className="note-card">
                    <article>
                      <div className="note-card-meta">
                        <span>NOTITIE {String(note.id).padStart(2, "0")}</span>
                        <time dateTime={note.created_at}>{new Date(note.created_at).toLocaleString("nl-NL", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</time>
                      </div>
                      <p className="note-content">{note.text}</p>
                      {note.note_files.length > 0 && (
                        <div className="attachment-group">
                          <p className="attachment-heading">Bijlagen <span>{note.note_files.length}</span></p>
                          <ul className="attachment-list">
                            {note.note_files.map((file) => (
                              <li key={file.id}>
                                <span className="file-mark" aria-hidden="true">↗</span>
                                {urlByPath.get(file.path) ? (
                                  <a href={urlByPath.get(file.path)}>{file.name}</a>
                                ) : (
                                  <span>{file.name}</span>
                                )}
                                <small>{Math.ceil(file.size / 1024)} KB</small>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="note-actions">
                        <ExportPdfButton note={{
                          id: note.id,
                          text: note.text,
                          createdAt: note.created_at,
                          files: note.note_files.map((file) => ({ name: file.name, url: urlByPath.get(file.path) ?? null })),
                        }} />
                        <form action={deleteNote}>
                          <input type="hidden" name="id" value={note.id} />
                          <button className="text-button" type="submit">Verwijderen</button>
                        </form>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
