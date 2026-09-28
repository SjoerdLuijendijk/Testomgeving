"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";

export type LoginState = { status: "idle" | "sent" | "error"; message?: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendMagicLink(_state: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email) || email.length > 320) {
    return { status: "error", message: "Vul een geldig e-mailadres in." };
  }

  const origin = (await headers()).get("origin");
  const supabase = await createClient();
  // Only existing (invited) users get a link; no accounts are created from this form.
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: `${origin}/auth/confirm` },
  });

  // Same answer for unknown addresses, so the form does not reveal who has an account.
  if (error && error.status !== 422 && error.code !== "otp_disabled") {
    return { status: "error", message: "De e-mail kon niet worden verstuurd. Probeer het later opnieuw." };
  }
  return { status: "sent", message: email };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
