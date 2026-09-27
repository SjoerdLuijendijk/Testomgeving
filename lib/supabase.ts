import { createClient } from "@supabase/supabase-js";

export const FILES_BUCKET = "note-files";

// Must stay below the Server Action body limit in next.config.ts (and Vercel's 4.5 MB request cap).
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export function supabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!);
}
