"use client";

import { useId } from "react";
import { formatPriceInput } from "../lib/price";
import {
  COMMON_FLUE_DIAMETERS_MM,
  CONDITION_LABELS,
  DIMENSION_CM,
  FLUE_DIAMETER_MM,
  FLUE_OUTLET_LABELS,
  MAX_TEXT_LENGTH,
  type Stove,
} from "../lib/stoves";
import ChoiceGroup from "./ChoiceGroup";

const DIMENSION_FIELDS = [
  { name: "height", label: "Hoogte", key: "heightCm" },
  { name: "width", label: "Breedte", key: "widthCm" },
  { name: "depth", label: "Diepte", key: "depthCm" },
] as const;

type StoveFieldsProps = {
  brands: string[];
  /** Existing stove whose values prefill the fields (edit mode). */
  stove?: Stove;
};

// The stove detail fields shared by the add form and the edit dialog.
export default function StoveFields({ brands, stove }: StoveFieldsProps) {
  const id = useId();

  return (
    <>
      <label htmlFor={`${id}-brand`}>Merk</label>
      <input
        id={`${id}-brand`}
        name="brand"
        list={`${id}-brands`}
        maxLength={MAX_TEXT_LENGTH}
        required
        autoComplete="off"
        autoCapitalize="words"
        defaultValue={stove?.brand}
      />
      <datalist id={`${id}-brands`}>
        {brands.map((brand) => <option key={brand} value={brand} />)}
      </datalist>

      <label htmlFor={`${id}-model`}>Model</label>
      <input id={`${id}-model`} name="model" maxLength={MAX_TEXT_LENGTH} required autoComplete="off" defaultValue={stove?.model} />

      <ChoiceGroup legend="Staat" name="condition" options={CONDITION_LABELS} defaultValue={stove?.condition} />

      <fieldset className="dimension-group">
        <legend>Afmetingen <span className="muted">(cm)</span></legend>
        <div className="dimension-fields">
          {DIMENSION_FIELDS.map(({ name, label, key }) => (
            <label key={name}>
              <span>{label}</span>
              <input
                name={name}
                type="number"
                inputMode="numeric"
                min={DIMENSION_CM.min}
                max={DIMENSION_CM.max}
                step={1}
                required
                defaultValue={stove?.[key] ?? undefined}
              />
            </label>
          ))}
        </div>
      </fieldset>

      <ChoiceGroup legend="Rookafvoer" name="flueOutlet" options={FLUE_OUTLET_LABELS} defaultValue={stove?.flueOutlet} />

      <label htmlFor={`${id}-flue-diameter`}>Maat afvoer <span className="muted">(Ø mm)</span></label>
      <input
        id={`${id}-flue-diameter`}
        name="flueDiameter"
        type="number"
        inputMode="numeric"
        list={`${id}-flue-diameters`}
        min={FLUE_DIAMETER_MM.min}
        max={FLUE_DIAMETER_MM.max}
        step={1}
        required
        defaultValue={stove?.flueDiameterMm ?? undefined}
      />
      <datalist id={`${id}-flue-diameters`}>
        {COMMON_FLUE_DIAMETERS_MM.map((diameter) => <option key={diameter} value={diameter} />)}
      </datalist>

      <label htmlFor={`${id}-price`}>Verkoopprijs <span className="muted">(€ incl. btw)</span></label>
      <input
        id={`${id}-price`}
        name="price"
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="bijv. 1.250"
        required
        defaultValue={stove?.priceCents ? formatPriceInput(stove.priceCents) : undefined}
      />

      <label className="checkbox-field">
        <input type="checkbox" name="shopListed" defaultChecked={stove?.shopListed ?? false} />
        <span>Online zetten in de webshop</span>
      </label>
    </>
  );
}
