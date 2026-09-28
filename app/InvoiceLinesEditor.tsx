import { MAX_INVOICE_LINES, VAT_RATES, type VatRate } from "../lib/invoice";
import { emptyLine, type DraftLine } from "../lib/invoice-draft";

type InvoiceLinesEditorProps = {
  lines: DraftLine[];
  invalid: number[];
  onChange: (lines: DraftLine[]) => void;
};

export default function InvoiceLinesEditor({ lines, invalid, onChange }: InvoiceLinesEditorProps) {
  const update = (key: string, patch: Partial<DraftLine>) =>
    onChange(lines.map((line) => (line.key === key ? { ...line, ...patch } : line)));

  return (
    <fieldset className="invoice-section">
      <legend>Regels</legend>
      <ul className="invoice-lines">
        {lines.map((line, index) => (
          <li key={line.key} className={invalid.includes(index) ? "invoice-line is-invalid" : "invoice-line"}>
            <label className="stacked-label line-description">
              <span>Omschrijving</span>
              <input value={line.description} maxLength={200} onChange={(event) => update(line.key, { description: event.target.value })} />
            </label>
            <label className="stacked-label line-quantity">
              <span>Aantal</span>
              <input value={line.quantity} inputMode="numeric" onChange={(event) => update(line.key, { quantity: event.target.value })} />
            </label>
            <label className="stacked-label line-price">
              <span>Prijs incl. btw</span>
              <input value={line.price} inputMode="decimal" placeholder="bijv. 250" onChange={(event) => update(line.key, { price: event.target.value })} />
            </label>
            <label className="stacked-label line-vat">
              <span>Btw</span>
              <select value={line.vatRate} onChange={(event) => update(line.key, { vatRate: Number(event.target.value) as VatRate })}>
                {VAT_RATES.map((rate) => <option key={rate} value={rate}>{rate}%</option>)}
              </select>
            </label>
            <button
              type="button"
              className="line-remove"
              onClick={() => onChange(lines.filter((other) => other.key !== line.key))}
              disabled={lines.length === 1}
              aria-label={`Regel ${index + 1} verwijderen`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="secondary-button" onClick={() => onChange([...lines, emptyLine()])} disabled={lines.length >= MAX_INVOICE_LINES}>
        ＋ Regel toevoegen
      </button>
    </fieldset>
  );
}
