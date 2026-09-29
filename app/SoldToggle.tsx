"use client";

import { useOptimistic, useTransition } from "react";
import { adjustStoveStock } from "./actions";
import { useDialog } from "./DialogProvider";

// Sold status of a used (single-unit) stove: selling or restocking its one unit.
export default function SoldToggle({ stoveNumber, sold }: { stoveNumber: number; sold: boolean }) {
  const [optimisticSold, setOptimisticSold] = useOptimistic(sold);
  const [pending, startTransition] = useTransition();
  const { confirm, notify } = useDialog();

  async function toggle() {
    if (optimisticSold) {
      const confirmed = await confirm({ title: `Kachel ${stoveNumber} weer te koop zetten?`, confirmLabel: "Te koop zetten" });
      if (!confirmed) return;
    }
    startTransition(async () => {
      setOptimisticSold(!optimisticSold);
      const result = await adjustStoveStock(stoveNumber, optimisticSold ? 1 : -1);
      if (!result.ok) await notify(result.error);
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
