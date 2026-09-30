"use client";

import { useState, useTransition } from "react";
import type { StockRefreshResult } from "../lib/woocommerce/stock-refresh";
import { useDialog } from "./DialogProvider";
import { refreshStockFromShopAction } from "./import-actions";

function stockLabel({ stockQuantity, madeToOrder }: { stockQuantity: number; madeToOrder: boolean }) {
  return madeToOrder ? "op bestelling" : stockQuantity === 0 ? "verkocht" : String(stockQuantity);
}

// Sets the app's stock to the web shop's stock in one go, after a confirmation.
export default function ShopStockPanel() {
  const [result, setResult] = useState<StockRefreshResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { confirm } = useDialog();

  async function refresh() {
    const confirmed = await confirm({
      title: "Voorraad uit de webshop overnemen?",
      message:
        "De voorraad van elke kachel met een webshopproduct wordt gelijkgezet aan de voorraad in WooCommerce. Kachels die op 0 komen, staan daarna als verkocht. De webshop zelf verandert niet; kachels met een ⚠-melding worden overgeslagen.",
      confirmLabel: "Voorraad overnemen",
    });
    if (!confirmed) return;

    setError(null);
    setResult(null);
    startTransition(async () => {
      const outcome = await refreshStockFromShopAction();
      if (outcome.ok) setResult(outcome);
      else setError(outcome.error);
    });
  }

  return (
    <>
      <h2 className="import-heading">Voorraad</h2>
      <p className="muted">Zet de voorraad in de app in één keer gelijk aan de voorraad in de webshop.</p>
      <div className="button-row">
        <button type="button" className="secondary-button" onClick={refresh} disabled={pending}>
          {pending ? "Bezig met ophalen…" : "Voorraad uit webshop overnemen"}
        </button>
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}
      {result && (
        <>
          <p role="status" className={result.skipped.length === 0 ? "field-success" : undefined}>
            {result.changed.length} aangepast, {result.unchanged} al gelijk
            {result.skipped.length > 0 ? `, ${result.skipped.length} overgeslagen` : ""}.
          </p>
          {result.changed.length > 0 && (
            <ul className="import-issues">
              {result.changed.map(({ number, from, to }) => (
                <li key={number}>
                  <strong>{number}</strong>: {stockLabel(from)} → {stockLabel(to)}
                </li>
              ))}
            </ul>
          )}
          {result.skipped.length > 0 && (
            <ul className="import-issues">
              {result.skipped.map(({ number, reason }) => (
                <li key={number}>
                  <strong>{number}</strong> overgeslagen: {reason}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
