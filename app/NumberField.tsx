import { useId } from "react";

type NumberFieldProps = {
  name: string;
  label: string;
  unit?: string;
  /** Allows one decimal place, entered as "5,5" or "5.5". */
  decimal?: boolean;
  min: number;
  max: number;
  placeholder?: string;
  defaultValue?: number | null;
};

// Optional numeric input with a label; the server validates the value again.
export default function NumberField({ name, label, unit, decimal = false, min, max, placeholder, defaultValue }: NumberFieldProps) {
  const id = useId();
  return (
    <>
      <label htmlFor={id}>
        {label} {unit && <span className="muted">({unit})</span>}
      </label>
      {decimal ? (
        // A text input keeps the Dutch decimal comma, which number inputs reject in some browsers.
        <input
          id={id}
          name={name}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          pattern="\d+([.,]\d)?"
          title={`Een getal met hoogstens één decimaal, tussen ${String(min).replace(".", ",")} en ${String(max).replace(".", ",")}`}
          placeholder={placeholder}
          defaultValue={defaultValue == null ? undefined : String(defaultValue).replace(".", ",")}
        />
      ) : (
        <input
          id={id}
          name={name}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={1}
          placeholder={placeholder}
          defaultValue={defaultValue ?? undefined}
        />
      )}
    </>
  );
}
