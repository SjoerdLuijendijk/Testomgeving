import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/");

  return (
    <main className="login-shell">
      <section className="login-card" aria-labelledby="login-title">
        <p className="brand-name">Woonwarmer</p>
        <h1 id="login-title">Inloggen</h1>
        <p className="muted">Nog geen account? Vraag de beheerder om er een voor je aan te maken.</p>
        <LoginForm />
      </section>
    </main>
  );
}
