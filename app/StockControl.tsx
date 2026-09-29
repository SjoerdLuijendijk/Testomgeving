"use client";

import { useOptimistic, useTransition } from "react";
import { adjustStoveStock } from "./actions";
import { useDialog } from "./DialogProvider";

// Stock of a new stove model: sell or restock one unit at a time.
export default function StockControl({ stoveNumber, quantity }: { stoveNumber: number; quantity: number }) {
  const [optimisticQuantity, setOptimisticQuantity] = useOptimistic(quantity);
  const [pending, startTransition] = useTransition();
  const { notify } = useDialog();

  function adjust(delta: -1 | 1) {
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
