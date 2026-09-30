import { useId } from "react";

type SelectFieldProps = {
  name: string;
  label: string;
  options: Record<string, string>;
  defaultValue?: string | null;
};

// Optional choice from a list; the empty first option stores "not filled in".
export default function SelectField({ name, label, options, defaultValue }: SelectFieldProps) {
  const id = useId();
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <select id={id} name={name} defaultValue={defaultValue ?? ""}>
        <option value="">Niet ingevuld</option>
        {Object.entries(options).map(([value, text]) => (
          <option key={value} value={value}>{text}</option>
        ))}
      </select>
    </>
  );
}
