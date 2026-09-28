"use client";

import { useOptimistic, useTransition } from "react";
import { setStoveSold } from "./actions";

export default function SoldToggle({ stoveNumber, sold }: { stoveNumber: number; sold: boolean }) {
  const [optimisticSold, setOptimisticSold] = useOptimistic(sold);
  const [pending, startTransition] = useTransition();

  function toggle() {
    if (optimisticSold && !confirm(`Kachel ${stoveNumber} weer op "te koop" zetten?`)) return;
    startTransition(async () => {
      setOptimisticSold(!optimisticSold);
      const result = await setStoveSold(stoveNumber, !optimisticSold);
      if (!result.ok) alert(result.error);
    });
  }

  return (
    <button
      type="button"
      className={optimisticSold ? "status-pill status-pill--sold" : "status-pill"}
      onClick={toggle}
      disabled={pending}
      aria-pressed={optimisticSold}
      title={optimisticSold ? "Klik om weer te koop te zetten" : "Klik om op verkocht te zetten"}
    >
      {optimisticSold ? "Verkocht" : "Te koop"}
    </button>
  );
}
