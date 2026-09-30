import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_AD_PROMPT } from "../lib/ad-prompt";
import { getCompany, listInvoices } from "../lib/invoice-queries";
import { getAdPrompt } from "../lib/marketplace-ad-store";
import { countUnlinkedStoves } from "../lib/woocommerce/link";
import AdPromptForm from "./AdPromptForm";
import CompanySettingsForm from "./CompanySettingsForm";
import InvoiceList from "./InvoiceList";
import ShopImportPanel from "./ShopImportPanel";
import ShopLinkAllPanel from "./ShopLinkAllPanel";
import ShopStockPanel from "./ShopStockPanel";

export type AdminSection = "facturen" | "bedrijf" | "advertentie" | "webshop";

const ADMIN_SECTIONS: { key: AdminSection; label: string; href: string }[] = [
  { key: "facturen", label: "Facturen", href: "/?tab=admin" },
  { key: "bedrijf", label: "Bedrijfsgegevens", href: "/?tab=admin&sectie=bedrijf" },
  { key: "advertentie", label: "Advertentie", href: "/?tab=admin&sectie=advertentie" },
  { key: "webshop", label: "Webshop", href: "/?tab=admin&sectie=webshop" },
];

export default async function AdminPanel({ supabase, section }: { supabase: SupabaseClient; section: AdminSection }) {
  return (
    <section className="panel" aria-labelledby="admin-title">
      <h1 id="admin-title">Admin</h1>
      <nav className="sub-tabs" aria-label="Admin">
        {ADMIN_SECTIONS.map(({ key, label, href }) => (
          <Link key={key} href={href} aria-current={section === key ? "page" : undefined}>{label}</Link>
        ))}
      </nav>
      {section === "webshop" ? (
        <>
          <ShopImportPanel />
          <ShopLinkAllPanel unlinkedCount={await countUnlinkedStoves(supabase)} />
          <ShopStockPanel />
        </>
      ) : section === "advertentie" ? (
        <AdPromptForm prompt={(await getAdPrompt(supabase)) ?? DEFAULT_AD_PROMPT} />
      ) : section === "bedrijf" ? (
        <CompanySettingsForm company={await getCompany(supabase)} />
      ) : (
        <InvoiceList invoices={await listInvoices(supabase)} />
      )}
    </section>
  );
}
