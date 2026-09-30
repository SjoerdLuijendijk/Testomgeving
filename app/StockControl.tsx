"use client";

import { useOptimistic, useTransition } from "react";
import { adjustStoveStock } from "./actions";
import { useDialog } from "./DialogProvider";

// Stock of a new stove model: sell or restock one unit at a time.
export default function StockControl({ stoveNumber, quantity }: { stoveNumber: number; quantity: number }) {
  const [optimisticQuantity, setOptimisticQuantity] = useOptimistic(quantity);
  const [pending, startTransition] = useTransition();
  const { confirm, notify } = useDialog();

  async function adjust(delta: -1 | 1) {
    // Selling the last unit sells out the stove, which moves it to the sold archive.
    if (delta === -1 && optimisticQuantity === 1) {
      const confirmed = await confirm({
        title: `Laatste kachel ${stoveNumber} verkocht?`,
        message: "De kachel is dan uitverkocht en gaat naar het Verkocht archief (menu rechtsboven).",
        confirmLabel: "Op verkocht zetten",
      });
      if (!confirmed) return;
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
