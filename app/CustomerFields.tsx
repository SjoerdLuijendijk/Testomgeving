import type { DraftCustomer } from "../lib/invoice-draft";

const FIELDS: { name: keyof DraftCustomer; label: string; required?: boolean; type?: string; autoComplete: string; wide?: boolean }[] = [
  { name: "name", label: "Naam", required: true, autoComplete: "name", wide: true },
  { name: "address", label: "Adres", required: true, autoComplete: "street-address", wide: true },
  { name: "postal_code", label: "Postcode", required: true, autoComplete: "postal-code" },
  { name: "city", label: "Plaats", required: true, autoComplete: "address-level2" },
  { name: "email", label: "E-mail (optioneel)", type: "email", autoComplete: "email" },
  { name: "phone", label: "Telefoon (optioneel)", type: "tel", autoComplete: "tel" },
];

type CustomerFieldsProps = {
  customer: DraftCustomer;
  onChange: (customer: DraftCustomer) => void;
  /** Quotes only need a name; the address is optional. */
  addressOptional?: boolean;
};

export default function CustomerFields({ customer, onChange, addressOptional }: CustomerFieldsProps) {
  return (
    <fieldset className="invoice-section">
      <legend>Klantgegevens</legend>
      <div className="customer-grid">
        {FIELDS.map((field) => (
          <label key={field.name} className={field.wide ? "stacked-label customer-wide" : "stacked-label"}>
            <span>{field.label}{addressOptional && field.required && field.name !== "name" ? " (optioneel)" : ""}</span>
            <input
              name={`customer-${field.name}`}
              type={field.type ?? "text"}
              autoComplete={field.autoComplete}
              required={field.required && (!addressOptional || field.name === "name")}
              maxLength={field.name === "email" ? 320 : 200}
              value={customer[field.name]}
              onChange={(event) => onChange({ ...customer, [field.name]: event.target.value })}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
