import Link from "next/link";
import { requireTeamMember } from "../lib/auth";
import type { AdminSection } from "../lib/admin-sections";
import { getKnownBrands, getStoves } from "../lib/stove-queries";
import AccountMenu from "./AccountMenu";
import AddStoveForm from "./AddStoveForm";
import AdminPanel from "./AdminPanel";
import BrandLogo from "./BrandLogo";
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
            <Link href="/" aria-current={activeTab === "toevoegen" ? "page" : undefined}>
              <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Kachel toevoegen
            </Link>
            <Link href="/?tab=voorraad" aria-current={activeTab === "voorraad" ? "page" : undefined}>Voorraad</Link>
          </nav>
        )}
        <AccountMenu email={user.email} showSections={isMember} activeSection={activeTab === "admin" ? adminSection : null} />
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
