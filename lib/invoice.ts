export const VAT_RATES = [21, 9, 0] as const;
export type VatRate = (typeof VAT_RATES)[number];
export const DEFAULT_VAT_RATE: VatRate = 21;
export const MAX_INVOICE_LINES = 50;
export const MAX_QUANTITY = 1000;

export type Company = {
  name: string;
  address: string;
  postal_code: string;
  city: string;
  kvk_number: string;
  vat_number: string;
  iban: string;
  email: string | null;
  phone: string | null;
  payment_term_days: number;
};

export type Customer = {
  name: string;
  address: string;
  postal_code: string;
  city: string;
  email: string | null;
  phone: string | null;
};

/** Unit price in cents including VAT. */
export type InvoiceLine = { description: string; quantity: number; unit_price_cents: number; vat_rate: VatRate };

export type Invoice = {
  number: string | null; // null for a draft preview
  issueDate: string; // yyyy-mm-dd
  /** Null for a separate invoice that is not about a stove. */
  stoveNumber: number | null;
  seller: Company;
  customer: Customer;
  lines: InvoiceLine[];
};

export type VatGroup = { rate: VatRate; exclCents: number; vatCents: number; inclCents: number };

export function lineTotalCents(line: InvoiceLine) {
  return line.quantity * line.unit_price_cents;
}

// Prices include VAT; the VAT is calculated per rate over the summed line totals.
export function invoiceTotals(lines: InvoiceLine[]) {
  const groups: VatGroup[] = VAT_RATES.flatMap((rate) => {
    const inclCents = lines.filter((line) => line.vat_rate === rate).reduce((sum, line) => sum + lineTotalCents(line), 0);
    if (inclCents === 0 && !lines.some((line) => line.vat_rate === rate)) return [];
    const exclCents = Math.round((inclCents * 100) / (100 + rate));
    return [{ rate, exclCents, vatCents: inclCents - exclCents, inclCents }];
  });
  return {
    groups,
    exclCents: groups.reduce((sum, group) => sum + group.exclCents, 0),
    vatCents: groups.reduce((sum, group) => sum + group.vatCents, 0),
    inclCents: groups.reduce((sum, group) => sum + group.inclCents, 0),
  };
}

export function isVatRate(value: unknown): value is VatRate {
  return VAT_RATES.includes(value as VatRate);
}
