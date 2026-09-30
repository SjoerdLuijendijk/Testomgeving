import { useId } from "react";
import {
  EFFICIENCY_PERCENT,
  ENERGY_LABELS,
  MAX_DESCRIPTION_LENGTH,
  MAX_TEXT_LENGTH,
  POWER_KW,
  WARRANTY_YEARS,
  WEIGHT_KG,
  type Stove,
} from "../lib/stoves";
import NumberField from "./NumberField";
import SelectField from "./SelectField";

const YES_NO = { yes: "Ja", no: "Nee" };
const ENERGY_LABEL_OPTIONS = Object.fromEntries(ENERGY_LABELS.map((label) => [label, label]));

const YES_NO_FIELDS = [
  { name: "externalAirSupply", label: "Externe zuurstof", key: "externalAirSupply" },
  { name: "newFirebox", label: "Nieuw binnenwerk", key: "newFirebox" },
  { name: "thermostat", label: "Thermostaat", key: "thermostat" },
] as const;

function yesNoValue(value: boolean | null | undefined) {
  return value == null ? null : value ? "yes" : "no";
}

// Optional product details for the web shop, shared by the add form and the edit dialog.
export default function StoveSpecFields({ stove }: { stove?: Stove }) {
  const id = useId();
  // Keep the extra details open when editing a stove that already has some of them.
  const hasMoreDetails = Boolean(
    stove &&
      (stove.minPowerKw ?? stove.maxPowerKw ?? stove.efficiencyPercent ?? stove.energyLabel ?? stove.warrantyYears ?? stove.material ?? stove.description) != null,
  );

  return (
    <>
      <NumberField name="power" label="Vermogen" unit="kW" decimal min={POWER_KW.min} max={POWER_KW.max} placeholder="bijv. 8 of 5,5" defaultValue={stove?.powerKw} />
      <NumberField name="weight" label="Gewicht" unit="kg" min={WEIGHT_KG.min} max={WEIGHT_KG.max} defaultValue={stove?.weightKg} />

      {YES_NO_FIELDS.map(({ name, label, key }) => (
        <SelectField key={name} name={name} label={label} options={YES_NO} defaultValue={yesNoValue(stove?.[key])} />
      ))}

      <details className="more-fields" open={hasMoreDetails}>
        <summary>Meer productgegevens</summary>
        <div className="more-fields-body">
          <NumberField name="minPower" label="Minimaal vermogen" unit="kW" decimal min={POWER_KW.min} max={POWER_KW.max} defaultValue={stove?.minPowerKw} />
          <NumberField name="maxPower" label="Maximaal vermogen" unit="kW" decimal min={POWER_KW.min} max={POWER_KW.max} defaultValue={stove?.maxPowerKw} />
          <NumberField
            name="efficiency"
            label="Rendement"
            unit="%"
            decimal
            min={EFFICIENCY_PERCENT.min}
            max={EFFICIENCY_PERCENT.max}
            placeholder="bijv. 78 of 80,5"
            defaultValue={stove?.efficiencyPercent}
          />
          <SelectField name="energyLabel" label="Energielabel" options={ENERGY_LABEL_OPTIONS} defaultValue={stove?.energyLabel} />
          <NumberField name="warranty" label="Garantie" unit="jaar" min={WARRANTY_YEARS.min} max={WARRANTY_YEARS.max} defaultValue={stove?.warrantyYears} />

          <label htmlFor={`${id}-material`}>Materiaal</label>
          <input id={`${id}-material`} name="material" maxLength={MAX_TEXT_LENGTH} autoComplete="off" placeholder="bijv. Staal" defaultValue={stove?.material ?? undefined} />

          <label htmlFor={`${id}-description`}>Beschrijving</label>
          <textarea id={`${id}-description`} name="description" rows={5} maxLength={MAX_DESCRIPTION_LENGTH} defaultValue={stove?.description ?? undefined} />
        </div>
      </details>
    </>
  );
}
