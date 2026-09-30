"use client";

import { useOptimistic, useTransition } from "react";
import { adjustStoveStock } from "./actions";
import { useDialog } from "./DialogProvider";

const SOLD_MESSAGE = "De kachel gaat naar het Verkocht archief (menu rechtsboven) en wordt nergens meer aangeboden.";

// Sold status of a used (single-unit) stove: selling or restocking its one unit.
export default function SoldToggle({ stoveNumber, sold }: { stoveNumber: number; sold: boolean }) {
  const [optimisticSold, setOptimisticSold] = useOptimistic(sold);
  const [pending, startTransition] = useTransition();
  const { confirm, notify } = useDialog();

  async function toggle() {
    const confirmed = await confirm(
      optimisticSold
        ? { title: `Kachel ${stoveNumber} weer te koop zetten?`, confirmLabel: "Te koop zetten" }
        : { title: `Kachel ${stoveNumber} op verkocht zetten?`, message: SOLD_MESSAGE, confirmLabel: "Op verkocht zetten" },
    );
    if (!confirmed) return;
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
