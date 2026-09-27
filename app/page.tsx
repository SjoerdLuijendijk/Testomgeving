import { FILES_BUCKET, supabase } from "../lib/supabase";
import { addNote, deleteNote } from "./actions";

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
    <main>
      <h1>Notities</h1>
      <form action={addNote}>
        <input name="text" maxLength={500} required />
        <input name="files" type="file" multiple />
        <button type="submit">Toevoegen</button>
        <small> (max. 4 MB aan bestanden per notitie)</small>
      </form>
      <ul>
        {notes.map((note) => (
          <li key={note.id}>
            {note.text} <small>({new Date(note.created_at).toLocaleString("nl-NL")})</small>{" "}
            <form action={deleteNote} style={{ display: "inline" }}>
              <input type="hidden" name="id" value={note.id} />
              <button type="submit">Verwijderen</button>
            </form>
            {note.note_files.length > 0 && (
              <ul>
                {note.note_files.map((file) => (
                  <li key={file.id}>
                    <a href={urlByPath.get(file.path)}>{file.name}</a>{" "}
                    <small>({Math.ceil(file.size / 1024)} KB)</small>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
