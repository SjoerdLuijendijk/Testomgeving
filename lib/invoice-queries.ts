import type { SupabaseClient } from "@supabase/supabase-js";
import type { Company, Invoice } from "./invoice";

const COMPANY_COLUMNS = "name, address, postal_code, city, kvk_number, vat_number, iban, email, phone, payment_term_days";

export async function getCompany(supabase: SupabaseClient): Promise<Company | null> {
  const { data, error } = await supabase.from("company_settings").select(COMPANY_COLUMNS).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getInvoice(supabase: SupabaseClient, id: number): Promise<Invoice | null> {
  const { data, error } = await supabase
    .from("invoices")
    .select(
      "invoice_number, issue_date, stove_number, seller, customer_name, customer_address, customer_postal_code, customer_city, customer_email, customer_phone, invoice_lines (position, description, quantity, unit_price_cents, vat_rate)",
    )
    .eq("id", id)
    .order("position", { referencedTable: "invoice_lines", ascending: true })
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    number: data.invoice_number,
    issueDate: data.issue_date,
    stoveNumber: data.stove_number,
    seller: data.seller,
    customer: {
      name: data.customer_name,
      address: data.customer_address,
      postal_code: data.customer_postal_code,
      city: data.customer_city,
      email: data.customer_email,
      phone: data.customer_phone,
    },
    lines: data.invoice_lines.map(({ description, quantity, unit_price_cents, vat_rate }) => ({ description, quantity, unit_price_cents, vat_rate })),
  };
}
