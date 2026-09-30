import { FLUE_OUTLET_LABELS, stoveTypeLabel, type Stove } from "./stoves";

export type StoveKind = "used" | "new" | "order";

export const MISSING = "—";

// Stoves registered before the condition field existed are treated as used.
export function kindOf(stove: Stove): StoveKind {
  if (stove.condition !== "new") return "used";
  return stove.madeToOrder ? "order" : "new";
}

// Units a row stands for: its stock, or the single sold unit once sold out.
export const unitsOf = (stove: Stove) => (stove.soldAt ? 1 : stove.stockQuantity);

export function formatDimensions({ heightCm, widthCm, depthCm }: Stove) {
  return heightCm && widthCm && depthCm ? `${heightCm} × ${widthCm} × ${depthCm} cm` : MISSING;
}

const KW_FORMAT = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 });

export function formatType({ stoveType, powerKw }: Stove) {
  const parts = [stoveTypeLabel(stoveType), powerKw && `${KW_FORMAT.format(powerKw)} kW`].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : MISSING;
}

export function formatFlue({ flueOutlet, flueDiameterMm }: Stove) {
  const parts = [flueOutlet && FLUE_OUTLET_LABELS[flueOutlet], flueDiameterMm && `Ø${flueDiameterMm} mm`].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : MISSING;
}
