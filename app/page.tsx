import Link from "next/link";
import { requireTeamMember } from "../lib/auth";
import { getKnownBrands, getStoves } from "../lib/stove-queries";
import { signOut } from "./auth/actions";
import AddStoveForm from "./AddStoveForm";
import StoveTable from "./StoveTable";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ tab?: string | string[] }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { supabase, user, isMember } = await requireTeamMember();
  const activeTab = (await searchParams).tab === "voorraad" ? "voorraad" : "toevoegen";

  return (
    <div className="app-shell">
      <header className="site-header">
        <span className="brand-name">Woonwarmer</span>
        {isMember && (
          <nav className="tabs" aria-label="Hoofdmenu">
            <Link href="/" aria-current={activeTab === "toevoegen" ? "page" : undefined}>Kachel toevoegen</Link>
            <Link href="/?tab=voorraad" aria-current={activeTab === "voorraad" ? "page" : undefined}>Voorraad</Link>
          </nav>
        )}
        <form action={signOut} className="account">
          <span className="muted">{user.email}</span>
          <button className="text-button" type="submit">Uitloggen</button>
        </form>
      </header>

      <main className={activeTab === "voorraad" ? "page-main page-main--wide" : "page-main"}>
        {!isMember ? (
          <div className="notice" role="alert">
            <strong>Geen toegang</strong>
            <p>Je account staat (nog) niet op de teamlijst. Vraag de beheerder om je toe te voegen.</p>
          </div>
        ) : activeTab === "toevoegen" ? (
          <AddStoveForm brands={await getKnownBrands(supabase)} />
        ) : (
          <StoveTable stoves={await getStoves(supabase)} />
        )}
      </main>
    </div>
  );
}
