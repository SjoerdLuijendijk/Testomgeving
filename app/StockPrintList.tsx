"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "../lib/price";
import { formatDimensions, formatFlue, formatType, kindOf, MISSING, unitsOf } from "../lib/stove-display";
import { sortStoves } from "../lib/stove-sort";
import type { Stove } from "../lib/stoves";

const DATE_FORMAT = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" });
const PRINT_SORT = { key: "brand", direction: "asc" } as const;

function StockSection({ title, stoves, showQuantity }: { title: string; stoves: Stove[]; showQuantity: boolean }) {
  const units = stoves.reduce((sum, stove) => sum + unitsOf(stove), 0);
  const cents = stoves.reduce((sum, stove) => sum + (stove.priceCents ?? 0) * unitsOf(stove), 0);

  return (
    <section className="print-section">
      <h2>{title} <span>({units} {units === 1 ? "kachel" : "kachels"})</span></h2>
      {stoves.length === 0 ? (
        <p>Geen kachels op voorraad.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th scope="col">Nr.</th>
              <th scope="col">Merk</th>
              <th scope="col">Model</th>
              <th scope="col">Type</th>
              <th scope="col">H × B × D</th>
              <th scope="col">Rookafvoer</th>
              {showQuantity && <th scope="col" className="cell-numeric">Aantal</th>}
              <th scope="col" className="cell-numeric">Prijs</th>
            </tr>
          </thead>
          <tbody>
            {stoves.map((stove) => (
              <tr key={stove.number}>
                <td>{stove.number}</td>
                <td>{stove.brand}</td>
                <td>{stove.model}</td>
                <td>{formatType(stove)}</td>
                <td className="cell-nowrap">{formatDimensions(stove)}</td>
                <td>{formatFlue(stove)}</td>
                {showQuantity && <td className="cell-numeric">{stove.stockQuantity}</td>}
                <td className="cell-numeric cell-nowrap">{stove.priceCents ? formatPrice(stove.priceCents) : MISSING}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={6}>Totaal incl. btw</td>
              {showQuantity && <td className="cell-numeric">{units}</td>}
              <td className="cell-numeric cell-nowrap">{formatPrice(cents)}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </section>
  );
}

// Only visible when printing: all stoves in stock (not sold, not made to order), new and used apart.
export default function StockPrintList({ stoves }: { stoves: Stove[] }) {
  // Set in the browser only, so server and browser render alike; refreshed when printing (also via Ctrl+P).
  const [printedAt, setPrintedAt] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setPrintedAt(new Date());
    update();
    window.addEventListener("beforeprint", update);
    return () => window.removeEventListener("beforeprint", update);
  }, []);

  const inStock = sortStoves(stoves.filter((stove) => !stove.soldAt), PRINT_SORT);

  return (
    <div className="print-stock">
      <header>
        <h1>Voorraad kachels</h1>
        {printedAt && <p>{DATE_FORMAT.format(printedAt)}</p>}
      </header>
      <StockSection title="Nieuw" stoves={inStock.filter((stove) => kindOf(stove) === "new")} showQuantity />
      <StockSection title="Gereviseerd" stoves={inStock.filter((stove) => kindOf(stove) === "used")} showQuantity={false} />
    </div>
  );
}
