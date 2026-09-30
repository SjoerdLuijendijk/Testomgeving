import Link from "next/link";
import { requireTeamMember } from "../lib/auth";
import { getKnownBrands, getStoves } from "../lib/stove-queries";
import { signOut } from "./auth/actions";
import AddStoveForm from "./AddStoveForm";
import BrandLogo from "./BrandLogo";
import AdminPanel, { type AdminSection } from "./AdminPanel";
import StoveTable from "./StoveTable";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ tab?: string | string[]; sectie?: string | string[] }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { supabase, user, isMember } = await requireTeamMember();
  const { tab: requestedTab, sectie } = await searchParams;
  // "instellingen" is the tab's former name; its links opened the company details.
  const activeTab = requestedTab === "voorraad" ? "voorraad" : requestedTab === "admin" || requestedTab === "instellingen" ? "admin" : "toevoegen";
  const adminSection: AdminSection =
    sectie === "bedrijf" || sectie === "advertentie" || sectie === "webshop" ? sectie : requestedTab === "instellingen" ? "bedrijf" : "facturen";

  return (
    <div className="app-shell">
      <header className="site-header">
        <BrandLogo />
        {isMember && (
          <nav className="tabs" aria-label="Hoofdmenu">
            <Link href="/" aria-current={activeTab === "toevoegen" ? "page" : undefined}>Kachel toevoegen</Link>
            <Link href="/?tab=voorraad" aria-current={activeTab === "voorraad" ? "page" : undefined}>Voorraad</Link>
          </nav>
        )}
        <div className="header-actions">
          {isMember && (
            <Link href="/?tab=admin" className="admin-link" aria-current={activeTab === "admin" ? "page" : undefined}>
              <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
              </svg>
              <span>Admin</span>
            </Link>
          )}
          <form action={signOut} className="account">
            <span className="muted">{user.email}</span>
            <button className="text-button" type="submit">Uitloggen</button>
          </form>
        </div>
      </header>

      <main className={activeTab === "voorraad" ? "page-main page-main--wide" : "page-main"}>
        {!isMember ? (
          <div className="notice" role="alert">
            <strong>Geen toegang</strong>
            <p>Je account staat (nog) niet op de teamlijst. Vraag de beheerder om je toe te voegen.</p>
          </div>
        ) : activeTab === "toevoegen" ? (
          <AddStoveForm brands={await getKnownBrands(supabase)} />
        ) : activeTab === "admin" ? (
          <AdminPanel supabase={supabase} section={adminSection} />
        ) : (
          <StoveTable stoves={await getStoves(supabase)} />
        )}
      </main>
    </div>
  );
}
