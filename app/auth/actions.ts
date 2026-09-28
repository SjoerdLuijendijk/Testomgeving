"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";

export type LoginState = { error?: string; email?: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PASSWORD_LENGTH = 72;

export async function signIn(_state: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!EMAIL_PATTERN.test(email) || email.length > 320 || !password || password.length > MAX_PASSWORD_LENGTH) {
    return { error: "Vul je e-mailadres en wachtwoord in.", email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.status === 429) {
      return { error: "Te veel inlogpogingen. Wacht een paar minuten en probeer het opnieuw.", email };
    }
    if (error.code !== "invalid_credentials") {
      // Code and status only; never log the e-mail address or password.
      console.error("Sign-in failed", { code: error.code, status: error.status });
    }
    // Same answer for unknown addresses and wrong passwords, so the form does not reveal who has an account.
    return { error: "E-mailadres of wachtwoord klopt niet.", email };
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
