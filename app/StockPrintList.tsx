"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "../lib/price";
import { formatDimensions, formatFlue, formatType, kindOf, MISSING } from "../lib/stove-display";
import { sortStoves } from "../lib/stove-sort";
import type { Stove } from "../lib/stoves";

const DATE_FORMAT = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" });
const PRINT_SORT = { key: "brand", direction: "asc" } as const;

function StockSection({ title, stoves }: { title: string; stoves: Stove[] }) {
  return (
    <section className="print-section">
      <h2>{title}</h2>
      {stoves.length === 0 ? (
        <p>Geen kachels op voorraad.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th scope="col">Nr.</th>
              <th scope="col">Merk</th>
              <th scope="col">Type</th>
              <th scope="col">H × B × D</th>
              <th scope="col">Rookafvoer</th>
              <th scope="col" className="cell-numeric">Prijs</th>
            </tr>
          </thead>
          <tbody>
            {stoves.map((stove) => (
              <tr key={stove.number}>
                <td>{stove.number}</td>
                <td>{stove.brand}</td>
                <td>{formatType(stove)}</td>
                <td className="cell-nowrap">{formatDimensions(stove)}</td>
                <td>{formatFlue(stove)}</td>
                <td className="cell-numeric cell-nowrap">{stove.priceCents ? formatPrice(stove.priceCents) : MISSING}</td>
              </tr>
            ))}
          </tbody>
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
      <StockSection title="Nieuw" stoves={inStock.filter((stove) => kindOf(stove) === "new")} />
      <StockSection title="Gereviseerd" stoves={inStock.filter((stove) => kindOf(stove) === "used")} />
    </div>
  );
}
