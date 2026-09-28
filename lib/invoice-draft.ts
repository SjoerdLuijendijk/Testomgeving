import { DEFAULT_VAT_RATE, MAX_QUANTITY, type Customer, type InvoiceLine, type VatRate } from "./invoice";
import { formatPriceInput, parsePriceToCents } from "./price";
import { CONDITION_LABELS, type Stove } from "./stoves";

/** Invoice line as edited in the form: quantity and price are still text. */
export type DraftLine = { key: string; description: string; quantity: string; price: string; vatRate: VatRate };
export type DraftCustomer = Record<keyof Customer, string>;

export const EMPTY_CUSTOMER: DraftCustomer = { name: "", address: "", postal_code: "", city: "", email: "", phone: "" };

let keyCounter = 0;
function nextKey() {
  keyCounter += 1;
  return `line-${keyCounter}`;
}

export function emptyLine(): DraftLine {
  return { key: nextKey(), description: "", quantity: "1", price: "", vatRate: DEFAULT_VAT_RATE };
}

export function stoveLine(stove: Stove): DraftLine {
  const condition = stove.condition ? `, ${CONDITION_LABELS[stove.condition].toLowerCase()}` : "";
  return {
    key: nextKey(),
    description: `Kachel ${stove.number} – ${stove.brand} ${stove.model}${condition}`,
    quantity: "1",
    price: stove.priceCents ? formatPriceInput(stove.priceCents) : "",
    vatRate: DEFAULT_VAT_RATE,
  };
}

function parseQuantity(value: string) {
  const quantity = Number(value.trim());
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= MAX_QUANTITY ? quantity : null;
}

// Converts the edited lines; lines that are not complete yet are reported by index.
export function toInvoiceLines(lines: DraftLine[]) {
  const valid: InvoiceLine[] = [];
  const invalid: number[] = [];
  lines.forEach((line, index) => {
    const quantity = parseQuantity(line.quantity);
    const price = parsePriceToCents(line.price, { allowZero: true });
    const description = line.description.trim();
    if (!description || quantity === null || price === null) invalid.push(index);
    else valid.push({ description, quantity, unit_price_cents: price, vat_rate: line.vatRate });
  });
  return { valid, invalid };
}

export function toCustomer(draft: DraftCustomer): Customer {
  const clean = (value: string) => value.trim();
  return {
    name: clean(draft.name),
    address: clean(draft.address),
    postal_code: clean(draft.postal_code),
    city: clean(draft.city),
    email: clean(draft.email) || null,
    phone: clean(draft.phone) || null,
  };
}

export function todayIsoDate() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}
