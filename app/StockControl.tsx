"use client";

import { useOptimistic, useTransition } from "react";
import { adjustStoveStock } from "./actions";
import { useDialog } from "./DialogProvider";

// Stock of a new stove model, corrected one unit at a time. Sales go through the status column.
export default function StockControl({ stoveNumber, quantity }: { stoveNumber: number; quantity: number }) {
  const [optimisticQuantity, setOptimisticQuantity] = useOptimistic(quantity);
  const [pending, startTransition] = useTransition();
  const { confirm, notify } = useDialog();

  async function adjust(delta: -1 | 1) {
    if (delta === -1 && optimisticQuantity === 1) {
      const confirmed = await confirm({
        title: `Voorraad kachel ${stoveNumber} op 0 zetten?`,
        message: "De kachel is dan uitverkocht en gaat naar het Verkocht archief. Is hij verkocht, zet hem dan via de status op Verkocht.",
        confirmLabel: "Op 0 zetten",
      });
      if (!confirmed) return;
    }
    startTransition(async () => {
      setOptimisticQuantity(optimisticQuantity + delta);
      const result = await adjustStoveStock(stoveNumber, delta);
      if (!result.ok) await notify(result.error);
    });
  }

  return (
    <span className="stock-control" aria-busy={pending}>
      <button
        type="button"
        className="stock-button"
        onClick={() => adjust(-1)}
        disabled={pending || optimisticQuantity === 0}
        aria-label={`Voorraad kachel ${stoveNumber} 1 lager`}
      >
        −
      </button>
      <span className="stock-count" aria-live="polite">{optimisticQuantity}</span>
      <button type="button" className="stock-button" onClick={() => adjust(1)} disabled={pending} aria-label={`Voorraad kachel ${stoveNumber} 1 hoger`}>
        +
      </button>
    </span>
  );
}
