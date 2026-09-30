"use client";

import { useId, useState, useTransition } from "react";
import type { ImportIssue } from "../lib/woocommerce/import";
import type { ShopRefreshResult } from "../lib/woocommerce/shop-refresh";
import { useDialog } from "./DialogProvider";
import { importShopStoves, refreshStovesFromShopAction } from "./import-actions";

type Progress = { imported: number; remaining: number | null; warnings: ImportIssue[]; failed: ImportIssue[]; skipped: ImportIssue[] };

const EMPTY: Progress = { imported: 0, remaining: null, warnings: [], failed: [], skipped: [] };

function IssueList({ title, issues }: { title: string; issues: ImportIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <>
      <h2 className="import-heading">{title}</h2>
      <ul className="import-issues">
        {issues.map((issue, index) => (
          <li key={`${issue.sku}-${index}`}>
            <strong>{issue.sku}</strong> {issue.name}: {issue.reason}
          </li>
        ))}
      </ul>
    </>
  );
}

// Fetches the web shop into the app: one new stove by its number, or everything at once (existing
// stoves are brought up to date, then new products are imported in batches with progress). Only
// reads from the shop; imported stoves stay unlinked until linked in the inventory.
export default function ShopImportPanel() {
  const id = useId();
  const [sku, setSku] = useState("");
  const [refreshed, setRefreshed] = useState<ShopRefreshResult | null>(null);
  const [progress, setProgress] = useState<Progress>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [pending, startTransition] = useTransition();
  const { confirm } = useDialog();

  function importOne(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    run(sku.trim());
  }

  async function fetchAll() {
    const confirmed = await confirm({
      title: "Alles uit de webshop ophalen?",
      message:
        "Kachels die al in de app staan, krijgen de voorraad, prijs, kenmerken en online-status uit de webshop; kachels met een ⚠-melding worden overgeslagen. Daarna worden producten die online staan en nog niet in de app zitten met foto's overgenomen. Niets wordt dubbel geïmporteerd. De webshop verandert niet.",
      confirmLabel: "Alles ophalen",
    });
    if (confirmed) run(undefined, true);
  }

  function run(onlySku?: string, refreshFirst = false) {
    setError(null);
    setFinished(false);
    setRefreshed(null);
    setProgress(EMPTY);
    startTransition(async () => {
      if (refreshFirst) {
        const outcome = await refreshStovesFromShopAction();
        if (!outcome.ok) {
          setError(outcome.error);
          setFinished(true);
          return;
        }
        setRefreshed(outcome);
      }
      let total = EMPTY;
      // Each call imports one stove or a small batch; stop when nothing is left or a batch makes no progress.
      for (;;) {
        const result = await importShopStoves(onlySku);
        if (!result.ok) {
          setError(result.error);
          break;
        }
        total = {
          imported: total.imported + result.imported.length,
          remaining: result.remaining,
          warnings: [...total.warnings, ...result.warnings],
          failed: [...total.failed, ...result.failed],
          skipped: result.skipped,
        };
        setProgress(total);
        if (onlySku || result.remaining === 0 || result.imported.length === 0) break;
      }
      setFinished(true);
    });
  }

  const { imported, remaining } = progress;
  return (
    <>
      <p className="muted">
        Haal de webshop op in de app: bestaande kachels krijgen de actuele voorraad en gegevens, nieuwe kachels worden met hun
        webshopnummer en foto&apos;s overgenomen. Dit leest alleen: de webshop verandert niet. Geïmporteerde kachels zijn niet gekoppeld; de app past hun webshopproduct pas aan als je bij de
        kachel op &ldquo;Koppelen&rdquo; klikt. Afmetingen en maat afvoer staan meestal niet in de webshop: die vul je aan bij het bewerken.
      </p>
      <form className="form-stack" onSubmit={importOne}>
        <label htmlFor={`${id}-sku`}>Webshopnummer</label>
        <input
          id={`${id}-sku`}
          value={sku}
          onChange={(event) => setSku(event.target.value)}
          inputMode="numeric"
          pattern="\d{5}"
          title="5 cijfers, bijvoorbeeld 26118"
          placeholder="bijv. 26118"
          required
          autoComplete="off"
        />
        <div className="button-row">
          <button type="submit" className="primary-button" disabled={pending}>
            {pending ? "Bezig met importeren…" : "Deze kachel importeren"}
          </button>
          <button type="button" className="secondary-button" onClick={fetchAll} disabled={pending}>
            Alles uit webshop ophalen
          </button>
        </div>
      </form>
      {refreshed && (
        <>
          <p role="status">
            Bestaande kachels: {refreshed.changed.length} bijgewerkt, {refreshed.unchanged} al gelijk
            {refreshed.skipped.length > 0 ? `, ${refreshed.skipped.length} overgeslagen` : ""}.
          </p>
          {refreshed.changed.length > 0 && (
            <ul className="import-issues">
              {refreshed.changed.map(({ number, fields }) => (
                <li key={number}>
                  <strong>{number}</strong>: {fields.join(", ")}
                </li>
              ))}
            </ul>
          )}
          {refreshed.skipped.length > 0 && (
            <ul className="import-issues">
              {refreshed.skipped.map(({ number, reason }) => (
                <li key={number}>
                  <strong>{number}</strong> overgeslagen: {reason}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {(pending || finished) && (
        <p role="status" className={finished && !error ? "field-success" : undefined}>
          {imported} kachel{imported === 1 ? "" : "s"} geïmporteerd
          {remaining !== null && remaining > 0 ? `, nog ${remaining} te gaan` : ""}
          {finished && !error && remaining === 0 ? ". Klaar." : "."}
        </p>
      )}
      {error && <p className="field-error" role="alert">{error}</p>}
      <IssueList title="Niet gelukt" issues={progress.failed} />
      <IssueList title="Let op" issues={progress.warnings} />
      <IssueList title="Overgeslagen" issues={progress.skipped} />
    </>
  );
}
