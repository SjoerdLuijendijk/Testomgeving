type ChoiceGroupProps = {
  legend: string;
  name: string;
  options: Record<string, string>;
  defaultValue?: string | null;
};

// Required radio group rendered as large tap targets.
export default function ChoiceGroup({ legend, name, options, defaultValue }: ChoiceGroupProps) {
  return (
    <fieldset className="choice-group">
      <legend>{legend}</legend>
      <div className="choice-options">
        {Object.entries(options).map(([value, label]) => (
          <label key={value}>
            <input type="radio" name={name} value={value} required defaultChecked={value === defaultValue} />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
