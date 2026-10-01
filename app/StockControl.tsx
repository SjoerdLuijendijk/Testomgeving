"use client";

import { useOptimistic, useTransition } from "react";
import { adjustStoveStock } from "./actions";
import { useDialog } from "./DialogProvider";

type StockControlProps = {
  stoveNumber: number;
  quantity: number;
  /** Opens the sale note dialog, which sells one unit when saved. */
  onSell: () => void;
};

// Stock of a new stove model: sell (through the note dialog) or restock one unit at a time.
export default function StockControl({ stoveNumber, quantity, onSell }: StockControlProps) {
  const [optimisticQuantity, setOptimisticQuantity] = useOptimistic(quantity);
  const [pending, startTransition] = useTransition();
  const { notify } = useDialog();

  function restock() {
    startTransition(async () => {
      setOptimisticQuantity(optimisticQuantity + 1);
      const result = await adjustStoveStock(stoveNumber, 1);
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
        onClick={onSell}
        disabled={pending || soldOut}
        aria-label={`1 kachel ${stoveNumber} verkocht`}
      >
        −1 verkocht
      </button>
      <button
        type="button"
        className="stock-button"
        onClick={restock}
        disabled={pending}
        aria-label={`1 kachel ${stoveNumber} bij voorraad`}
      >
        +1
      </button>
    </span>
  );
}
