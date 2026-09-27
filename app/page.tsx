import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

function supabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!);
}

async function addNote(formData: FormData) {
  "use server";
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;
  const { error } = await supabase().from("notes").insert({ text });
  if (error) throw error;
  revalidatePath("/");
}

async function deleteNote(formData: FormData) {
  "use server";
  const { error } = await supabase().from("notes").delete().eq("id", Number(formData.get("id")));
  if (error) throw error;
  revalidatePath("/");
}

export default async function Page() {
  const { data: notes, error } = await supabase()
    .from("notes")
    .select("id, text, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (
    <main>
      <h1>Notities</h1>
      <form action={addNote}>
        <input name="text" maxLength={500} required />
        <button type="submit">Toevoegen</button>
      </form>
      <ul>
        {notes.map((note) => (
          <li key={note.id}>
            {note.text} <small>({new Date(note.created_at).toLocaleString("nl-NL")})</small>{" "}
            <form action={deleteNote} style={{ display: "inline" }}>
              <input type="hidden" name="id" value={note.id} />
              <button type="submit">Verwijderen</button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
