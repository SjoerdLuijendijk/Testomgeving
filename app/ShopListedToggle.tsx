"use client";

import { useOptimistic, useTransition } from "react";
import { setStoveShopListed } from "./actions";
import { useDialog } from "./DialogProvider";

export default function ShopListedToggle({ stoveNumber, listed }: { stoveNumber: number; listed: boolean }) {
  const [optimisticListed, setOptimisticListed] = useOptimistic(listed);
  const [pending, startTransition] = useTransition();
  const { notify } = useDialog();

  function toggle() {
    startTransition(async () => {
      setOptimisticListed(!optimisticListed);
      const result = await setStoveShopListed(stoveNumber, !optimisticListed);
      if (!result.ok) await notify(result.error);
    });
  }

  return (
    <input
      type="checkbox"
      className="shop-listed-toggle"
      checked={optimisticListed}
      onChange={toggle}
      disabled={pending}
      aria-label={`Kachel ${stoveNumber} online in de webshop`}
    />
  );
}
