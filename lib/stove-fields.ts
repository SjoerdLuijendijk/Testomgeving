import { parsePriceToCents } from "./price";
import {
  CONDITION_LABELS,
  DIMENSION_CM,
  FLUE_DIAMETER_MM,
  FLUE_OUTLET_LABELS,
  MAX_TEXT_LENGTH,
  STOCK_QUANTITY,
  type Condition,
  type FlueOutlet,
} from "./stoves";

export type StoveFieldValues = {
  brand: string;
  model: string;
  condition: Condition;
  height_cm: number;
  width_cm: number;
  depth_cm: number;
  flue_outlet: FlueOutlet;
  flue_diameter_mm: number;
  price_cents: number;
  shop_listed: boolean;
};

type ParseResult = { ok: true; values: StoveFieldValues } | { ok: false; error: string };

function readText(formData: FormData, name: string) {
  const value = String(formData.get(name) ?? "").trim();
  return value.length > 0 && value.length <= MAX_TEXT_LENGTH ? value : null;
}

function readInteger(formData: FormData, name: string, range: { min: number; max: number }) {
  const value = Number(String(formData.get(name) ?? "").trim());
  return Number.isInteger(value) && value >= range.min && value <= range.max ? value : null;
}

function readChoice<T extends string>(formData: FormData, name: string, options: Record<T, string>) {
  const value = String(formData.get(name) ?? "");
  return Object.hasOwn(options, value) ? (value as T) : null;
}

// Validates the untrusted stove form fields shared by creating and editing a stove.
export function parseStoveFields(formData: FormData): ParseResult {
  const brand = readText(formData, "brand");
  const model = readText(formData, "model");
  const condition = readChoice(formData, "condition", CONDITION_LABELS);
  const height = readInteger(formData, "height", DIMENSION_CM);
  const width = readInteger(formData, "width", DIMENSION_CM);
  const depth = readInteger(formData, "depth", DIMENSION_CM);
  const flueOutlet = readChoice(formData, "flueOutlet", FLUE_OUTLET_LABELS);
  const flueDiameter = readInteger(formData, "flueDiameter", FLUE_DIAMETER_MM);
  const price = parsePriceToCents(String(formData.get("price") ?? ""));

  if (!brand || !model) return { ok: false, error: "Vul merk en model in." };
  if (!condition) return { ok: false, error: "Kies nieuw of gebruikt." };
  if (!height || !width || !depth) {
    return { ok: false, error: `Vul hoogte, breedte en diepte in hele centimeters in (${DIMENSION_CM.min}–${DIMENSION_CM.max}).` };
  }
  if (!flueOutlet) return { ok: false, error: "Kies of de rookafvoer boven of achter zit." };
  if (!flueDiameter) {
    return { ok: false, error: `Vul de maat van de afvoer in millimeters in (${FLUE_DIAMETER_MM.min}–${FLUE_DIAMETER_MM.max}).` };
  }
  if (!price) return { ok: false, error: "Vul een geldige verkoopprijs in, bijvoorbeeld 1.250 of 1250,50." };

  return {
    ok: true,
    values: {
      brand,
      model,
      condition,
      height_cm: height,
      width_cm: width,
      depth_cm: depth,
      flue_outlet: flueOutlet,
      flue_diameter_mm: flueDiameter,
      price_cents: price,
      // An unticked checkbox is left out of the form data.
      shop_listed: formData.get("shopListed") === "on",
    },
  };
}

// The initial stock of a new stove. Only new stoves can have more than one unit; the stock is
// changed afterwards one unit at a time, so it is not part of the editable fields.
export function parseStockQuantity(formData: FormData, condition: Condition): { ok: true; value: number } | { ok: false; error: string } {
  if (condition === "used") return { ok: true, value: 1 };
  const quantity = readInteger(formData, "quantity", STOCK_QUANTITY);
  if (!quantity) return { ok: false, error: `Vul het aantal op voorraad in (${STOCK_QUANTITY.min}–${STOCK_QUANTITY.max}).` };
  return { ok: true, value: quantity };
}
