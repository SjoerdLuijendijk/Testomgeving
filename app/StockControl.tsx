"use client";

import { useOptimistic, useTransition } from "react";
import { adjustStoveStock, makeStoveMadeToOrder } from "./actions";
import { useDialog } from "./DialogProvider";

// Stock of a new stove model: sell or restock one unit at a time.
export default function StockControl({ stoveNumber, quantity }: { stoveNumber: number; quantity: number }) {
  const [optimisticQuantity, setOptimisticQuantity] = useOptimistic(quantity);
  const [pending, startTransition] = useTransition();
  const { choose, notify } = useDialog();

  async function adjust(delta: -1 | 1) {
    // Selling the last unit: archive the sold-out stove, or keep offering it made to order.
    if (delta === -1 && optimisticQuantity === 1) {
      const choice = await choose({
        title: `Laatste kachel ${stoveNumber} verkocht`,
        message:
          "Archiveren: de kachel is uitverkocht en gaat naar het Verkocht archief (menu rechtsboven). Op bestelling: de kachel blijft te koop en wordt voortaan bij de leverancier besteld.",
        choices: [
          { value: "order", label: "Op bestelling leverbaar" },
          { value: "archive", label: "Archiveren" },
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

  const soldOut = optimisticQuantity === 0;
  return (
    <span className="stock-control" aria-busy={pending}>
      <span className={soldOut ? "stock-count stock-count--sold" : "stock-count"} aria-live="polite">
        {soldOut ? "Uitverkocht" : `${optimisticQuantity} op voorraad`}
      </span>
      <button
        type="button"
        className="stock-button stock-button--sell"
        onClick={() => adjust(-1)}
        disabled={pending || soldOut}
        aria-label={`1 kachel ${stoveNumber} verkocht`}
      >
        −1 verkocht
      </button>
      <button
        type="button"
        className="stock-button"
        onClick={() => adjust(1)}
        disabled={pending}
        aria-label={`1 kachel ${stoveNumber} bij voorraad`}
      >
        +1
      </button>
    </span>
  );
}
