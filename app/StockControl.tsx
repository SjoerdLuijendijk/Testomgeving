"use client";

import { useOptimistic, useTransition } from "react";
import { adjustStoveStock, makeStoveMadeToOrder } from "./actions";
import { useDialog } from "./DialogProvider";

// Stock of a new stove model, corrected one unit at a time. Sales go through the status column.
export default function StockControl({ stoveNumber, quantity }: { stoveNumber: number; quantity: number }) {
  const [optimisticQuantity, setOptimisticQuantity] = useOptimistic(quantity);
  const [pending, startTransition] = useTransition();
  const { choose, notify } = useDialog();

  async function adjust(delta: -1 | 1) {
    // The last unit: archive the sold-out stove, or keep offering it made to order.
    if (delta === -1 && optimisticQuantity === 1) {
      const choice = await choose({
        title: `Laatste kachel ${stoveNumber} van de voorraad`,
        message:
          "In archief plaatsen: de kachel is uitverkocht en gaat naar het Verkocht archief (menu rechtsboven). Op bestelling: de kachel blijft te koop en wordt voortaan bij de leverancier besteld.",
        choices: [
          { value: "order", label: "Op bestelling leverbaar" },
          { value: "archive", label: "In archief plaatsen" },
        ],
      });
      if (choice === null) return;
      if (choice === "order") {
        startTransition(async () => {
          const result = await makeStoveMadeToOrder(stoveNumber);
          if (!result.ok) await notify(result.error);
        });
        return;
      }
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
