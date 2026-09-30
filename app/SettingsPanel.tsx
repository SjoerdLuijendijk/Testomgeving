import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_AD_PROMPT } from "../lib/ad-prompt";
import { getCompany } from "../lib/invoice-queries";
import { getAdPrompt } from "../lib/marketplace-ad-store";
import AdPromptForm from "./AdPromptForm";
import CompanySettingsForm from "./CompanySettingsForm";
import ShopImportPanel from "./ShopImportPanel";

export type SettingsSection = "bedrijf" | "advertentie" | "webshop";

const SECTIONS: { key: SettingsSection; label: string; href: string }[] = [
  { key: "bedrijf", label: "Bedrijfsgegevens", href: "/?tab=instellingen" },
  { key: "advertentie", label: "Advertentie", href: "/?tab=instellingen&sectie=advertentie" },
  { key: "webshop", label: "Webshop", href: "/?tab=instellingen&sectie=webshop" },
];

export default async function SettingsPanel({ supabase, section }: { supabase: SupabaseClient; section: SettingsSection }) {
  return (
    <section className="panel" aria-labelledby="settings-title">
      <h1 id="settings-title">Instellingen</h1>
      <nav className="sub-tabs" aria-label="Instellingen">
        {SECTIONS.map(({ key, label, href }) => (
          <Link key={key} href={href} aria-current={section === key ? "page" : undefined}>{label}</Link>
        ))}
      </nav>
      {section === "webshop" ? (
        <ShopImportPanel />
      ) : section === "advertentie" ? (
        <AdPromptForm prompt={(await getAdPrompt(supabase)) ?? DEFAULT_AD_PROMPT} />
      ) : (
        <CompanySettingsForm company={await getCompany(supabase)} />
      )}
    </section>
  );
}
