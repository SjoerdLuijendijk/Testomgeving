"use client";

import { useTransition } from "react";
import { retryShopSync } from "./actions";
import { useDialog } from "./DialogProvider";

// Shown next to the web shop checkbox when the last web shop update failed.
export default function ShopSyncStatus({ stoveNumber, error }: { stoveNumber: number; error: string }) {
  const [pending, startTransition] = useTransition();
  const { notify } = useDialog();

  function retry() {
    startTransition(async () => {
      const result = await retryShopSync(stoveNumber);
      if (!result.ok) await notify(result.error, "Webshop niet bijgewerkt");
    });
  }

  return (
    <button
      type="button"
      className="sync-warning"
      onClick={retry}
      disabled={pending}
      title={`${error} Klik om het opnieuw te proberen.`}
      aria-label={`Webshop niet bijgewerkt voor kachel ${stoveNumber}: ${error} Opnieuw proberen`}
    >
      {pending ? "Bezig…" : "⚠ Opnieuw"}
    </button>
  );
}
