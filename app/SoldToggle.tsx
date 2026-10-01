"use client";

import { useTransition } from "react";
import type { StoveNote } from "../lib/stove-notes";
import { adjustStoveStock } from "./actions";
import { useDialog } from "./DialogProvider";

type SoldToggleProps = {
  stoveNumber: number;
  sold: boolean;
  /** An open negotiation: the pill then reads "In onderhandeling" and opens that note. */
  negotiation?: StoveNote;
  /** Opens the sale note dialog, which sells the stove when saved. */
  onSell: () => void;
  onOpenNegotiation: () => void;
};

// Sold status of a used (single-unit) stove: selling (through the note dialog) or restocking its one unit.
export default function SoldToggle({ stoveNumber, sold, negotiation, onSell, onOpenNegotiation }: SoldToggleProps) {
  const [pending, startTransition] = useTransition();
  const { confirm, notify } = useDialog();

  async function toggle() {
    if (!sold) return negotiation ? onOpenNegotiation() : onSell();
    const confirmed = await confirm({ title: `Kachel ${stoveNumber} weer te koop zetten?`, confirmLabel: "Te koop zetten" });
    if (!confirmed) return;
    startTransition(async () => {
      const result = await adjustStoveStock(stoveNumber, 1);
      if (!result.ok) await notify(result.error);
    });
  }

  const [label, className, title] = sold
    ? ["Verkocht", "status-pill status-pill--sold", "Klik om weer te koop te zetten"]
    : negotiation
      ? ["In onderhandeling", "status-pill status-pill--negotiating", "Klik om de onderhandeling te openen of de kachel te verkopen"]
      : ["Te koop", "status-pill", "Klik om op verkocht te zetten"];

  return (
    <button type="button" className={className} onClick={toggle} disabled={pending} aria-pressed={sold} title={title}>
      {label}
    </button>
  );
}
