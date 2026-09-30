import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_AD_PROMPT } from "../lib/ad-prompt";
import { ADMIN_SECTIONS, type AdminSection } from "../lib/admin-sections";
import { getCompany, listInvoices } from "../lib/invoice-queries";
import { getAdPrompt } from "../lib/marketplace-ad-store";
import { countUnlinkedStoves } from "../lib/woocommerce/link";
import AdPromptForm from "./AdPromptForm";
import CompanySettingsForm from "./CompanySettingsForm";
import InvoiceList from "./InvoiceList";
import ShopImportPanel from "./ShopImportPanel";
import ShopLinkAllPanel from "./ShopLinkAllPanel";

// One management page, opened from the account menu.
export default async function AdminPanel({ supabase, section }: { supabase: SupabaseClient; section: AdminSection }) {
  return (
    <section className="panel" aria-labelledby="admin-title">
      <h1 id="admin-title">{ADMIN_SECTIONS.find(({ key }) => key === section)?.label}</h1>
      {section === "webshop" ? (
        <>
          <ShopImportPanel />
          <ShopLinkAllPanel unlinkedCount={await countUnlinkedStoves(supabase)} />
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
