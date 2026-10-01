"use client";

import type { Stove } from "../lib/stoves";

type SaleButtonProps = {
  stove: Stove;
  /** Opens the note dialog, where the sale or negotiation is chosen. */
  onPlaceSale: () => void;
};

// Status of a new stove model: its availability follows from the stock and is not clickable. Sales
// and negotiations are placed per unit with "Verkoop plaatsen" and kept in their own lists.
export default function SaleButton({ stove, onPlaceSale }: SaleButtonProps) {
  const soldOut = Boolean(stove.soldAt);
  const [label, tone] = stove.madeToOrder ? ["Op bestelling", "available"] : soldOut ? ["Uitverkocht", "sold"] : ["Te koop", "available"];
  return (
    <span className="sale-status">
      <span className={`status-pill status-pill--${tone} status-pill--static`}>{label}</span>
      {!soldOut && (
        <button type="button" className="secondary-button sale-button" onClick={onPlaceSale}>
          Verkoop plaatsen
        </button>
      )}
    </span>
  );
}
