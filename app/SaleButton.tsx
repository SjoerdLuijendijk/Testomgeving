"use client";

import type { Stove } from "../lib/stoves";

type SaleButtonProps = {
  stove: Stove;
  /** Opens the note dialog, where the sale or negotiation is chosen. */
  onPlaceSale: () => void;
};

// A new stove model has no status of its own (its stock shows availability): sales and negotiations
// are placed per unit and kept in their own lists. Hidden once sold out.
export default function SaleButton({ stove, onPlaceSale }: SaleButtonProps) {
  if (stove.soldAt) return null;
  return (
    <button type="button" className="sale-button" onClick={onPlaceSale} aria-label={`Verkoop plaatsen voor kachel ${stove.number}`}>
      Verkoop plaatsen
    </button>
  );
}
