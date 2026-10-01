"use client";

import { useTransition } from "react";
import { adjustStoveStock } from "./actions";
import { useDialog } from "./DialogProvider";

type SoldToggleProps = {
  stoveNumber: number;
  sold: boolean;
  /** Opens the sale note dialog, which sells the stove when saved. */
  onSell: () => void;
};

// Sold status of a used (single-unit) stove: selling (through the note dialog) or restocking its one unit.
export default function SoldToggle({ stoveNumber, sold, onSell }: SoldToggleProps) {
  const [pending, startTransition] = useTransition();
  const { confirm, notify } = useDialog();

  async function toggle() {
    if (!sold) return onSell();
    const confirmed = await confirm({ title: `Kachel ${stoveNumber} weer te koop zetten?`, confirmLabel: "Te koop zetten" });
    if (!confirmed) return;
    startTransition(async () => {
      const result = await adjustStoveStock(stoveNumber, 1);
      if (!result.ok) await notify(result.error);
    });
  }

  return (
    <button
      type="button"
      className={sold ? "status-pill status-pill--sold" : "status-pill"}
      onClick={toggle}
      disabled={pending}
      aria-pressed={sold}
      title={sold ? "Klik om weer te koop te zetten" : "Klik om op verkocht te zetten"}
    >
      {sold ? "Verkocht" : "Te koop"}
    </button>
  );
}
