"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { FILES_BUCKET, MAX_UPLOAD_BYTES, supabase } from "../lib/supabase";

export async function addNote(formData: FormData) {
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  if (totalSize > MAX_UPLOAD_BYTES) throw new Error("Bestanden zijn samen groter dan 4 MB.");

  const db = supabase();
  const { data: note, error } = await db.from("notes").insert({ text }).select("id").single();
  if (error) throw error;

  for (const file of files) {
    const path = `${note.id}/${randomUUID()}`;
    const { error: uploadError } = await db.storage
      .from(FILES_BUCKET)
      .upload(path, file, { contentType: file.type || undefined });
    if (uploadError) throw uploadError;

    const { error: rowError } = await db
      .from("note_files")
      .insert({ note_id: note.id, path, name: file.name.slice(0, 255), size: file.size });
    if (rowError) throw rowError;
  }

  revalidatePath("/");
}

export async function deleteNote(formData: FormData) {
  const id = Number(formData.get("id"));
  const db = supabase();

  const { data: files, error: filesError } = await db.from("note_files").select("path").eq("note_id", id);
  if (filesError) throw filesError;
  if (files.length > 0) {
    const { error: removeError } = await db.storage.from(FILES_BUCKET).remove(files.map((f) => f.path));
    if (removeError) throw removeError;
  }

  // note_files rows are removed by the foreign key's ON DELETE CASCADE.
  const { error } = await db.from("notes").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/");
}
