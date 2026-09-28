import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";

// Verifies the session with Supabase Auth and checks the team allowlist.
// Returns a client bound to the user; RLS enforces the same rule in the database.
export async function requireTeamMember() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: isMember, error } = await supabase.rpc("is_team_member");
  if (error) throw error;

  return { supabase, user: userData.user, isMember: isMember === true };
}
