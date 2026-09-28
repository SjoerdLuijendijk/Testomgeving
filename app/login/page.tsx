import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import LoginForm from "./LoginForm";

type PageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/");

  const linkFailed = (await searchParams).error === "link";

  return (
    <main className="login-shell">
      <section className="login-card" aria-labelledby="login-title">
        <p className="brand-name">Woonwarmer</p>
        <h1 id="login-title">Inloggen</h1>
        <p className="muted">Je ontvangt een link per e-mail. Geen wachtwoord nodig.</p>
        {linkFailed && (
          <p className="field-error" role="alert">Deze inloglink is verlopen of al gebruikt. Vraag een nieuwe aan.</p>
        )}
        <LoginForm />
      </section>
    </main>
  );
}
