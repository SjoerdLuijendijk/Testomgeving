type ChoiceGroupProps = {
  legend: string;
  name: string;
  options: Record<string, string>;
};

// Required radio group rendered as large tap targets.
export default function ChoiceGroup({ legend, name, options }: ChoiceGroupProps) {
  return (
    <fieldset className="choice-group">
      <legend>{legend}</legend>
      <div className="choice-options">
        {Object.entries(options).map(([value, label]) => (
          <label key={value}>
            <input type="radio" name={name} value={value} required />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
