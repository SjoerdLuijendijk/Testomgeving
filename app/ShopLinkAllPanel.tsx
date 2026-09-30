"use client";

import { useState, useTransition } from "react";
import { useDialog } from "./DialogProvider";
import { linkAllStovesToShop } from "./import-actions";

type Failure = { number: number; reason: string };

// Links all imported stoves to the web shop in small batches, after an explicit confirmation.
export default function ShopLinkAllPanel({ unlinkedCount }: { unlinkedCount: number }) {
  const [linked, setLinked] = useState(0);
  const [progressRemaining, setRemaining] = useState(unlinkedCount);
  const [failed, setFailed] = useState<Failure[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [pending, startTransition] = useTransition();
  const { confirm } = useDialog();
  // The count from the server stays current (for example after an import) until linking starts.
  const remaining = pending || finished ? progressRemaining : unlinkedCount;

  async function linkAll() {
    const confirmed = await confirm({
      title: `${remaining} kachel${remaining === 1 ? "" : "s"} koppelen aan de webshop?`,
      message:
        "Dit verandert de webshop. Van elke geïmporteerde kachel wordt het webshopproduct bijgewerkt met de gegevens uit de app: naam, prijs, beschrijving, categorie, kenmerken, foto's en voorraad. De foto's worden opnieuw geüpload. Daarna past de app deze producten bij elke wijziging automatisch aan. Houd deze pagina open tot het klaar is.",
      confirmLabel: "Alles koppelen",
      danger: true,
    });
    if (!confirmed) return;

    setError(null);
    setFinished(false);
    setLinked(0);
    setFailed([]);
    setRemaining(unlinkedCount);
    startTransition(async () => {
      let linkedTotal = 0;
      let failures: Failure[] = [];
      // Stop when nothing is left, or when a whole batch fails (for example when the shop is down).
      for (;;) {
        const result = await linkAllStovesToShop();
        if (!result.ok) {
          setError(result.error);
          break;
        }
        linkedTotal += result.linked.length;
        failures = [...failures, ...result.failed];
        setLinked(linkedTotal);
        setFailed(failures);
        setRemaining(result.remaining);
        if (result.remaining === 0 || result.linked.length === 0) break;
      }
      setFinished(true);
    });
  }

  return (
    <>
      <h2 className="import-heading">Koppelen</h2>
      <p className="muted">
        {remaining === 0 && !pending
          ? "Alle kachels zijn gekoppeld."
          : `${remaining} geïmporteerde kachel${remaining === 1 ? " is" : "s zijn"} nog niet gekoppeld. Losse kachels koppel je met "Koppelen" in de voorraad.`}
      </p>
      {(remaining > 0 || pending) && (
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={linkAll} disabled={pending}>
            {pending ? "Bezig met koppelen…" : "Alles koppelen"}
          </button>
        </div>
      )}
      {(pending || finished) && (
        <p role="status" className={finished && !error && failed.length === 0 ? "field-success" : undefined}>
          {linked} gekoppeld{remaining > 0 ? `, nog ${remaining} te gaan` : ""}
          {finished && !error && remaining === 0 ? ". Klaar." : "."}
        </p>
      )}
      {error && <p className="field-error" role="alert">{error}</p>}
      {failed.length > 0 && (
        <>
          <p className="field-error" role="alert">
            Bij deze kachels is de webshop niet bijgewerkt. Ze zijn wel gekoppeld; gebruik &ldquo;⚠ Opnieuw&rdquo; in de voorraad.
          </p>
          <ul className="import-issues">
            {failed.map(({ number, reason }) => (
              <li key={number}>
                <strong>{number}</strong>: {reason}
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
