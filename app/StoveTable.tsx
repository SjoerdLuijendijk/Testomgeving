"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatPrice } from "../lib/price";
import { STOCK_VIEW_HREFS, type StockView } from "../lib/stock-views";
import { kindOf, unitsOf, type StoveKind as Kind } from "../lib/stove-display";
import { DEFAULT_SORT, nextSort, sortStoves, type SortKey } from "../lib/stove-sort";
import { LISTING_CHANNELS, type ListingChannel, type Stove } from "../lib/stoves";
import SortableHeader from "./SortableHeader";
import StockPrintList from "./StockPrintList";
import StoveRow from "./StoveRow";

const KIND_LABELS: Record<Kind, string> = { used: "Gereviseerd", new: "Nieuw", order: "Op bestelling" };
const VIEW_TITLES: Record<StockView, string> = { available: "Voorraad", sold: "Verkocht archief" };
const ACTION_LABELS = ["Bewerken", "Factuur", "Advertentie", "Verwijderen"];

function matchesSearch(stove: Stove, query: string) {
  if (!query) return true;
  return [String(stove.number), stove.brand].some((value) => value.toLowerCase().includes(query));
}

const inView = (stove: Stove, view: StockView) => (view === "sold") === Boolean(stove.soldAt);

// The current stock by default; the sold archive (opened from the account menu) shows sold stoves.
export default function StoveTable({ stoves, view }: { stoves: Stove[]; view: StockView }) {
  const [search, setSearch] = useState("");
  const [selectedKind, setKind] = useState<Kind>("used");
  const [sort, setSort] = useState(DEFAULT_SORT);

  // Made-to-order stoves never sell out, so the archive has no tab for them.
  const kinds = (Object.keys(KIND_LABELS) as Kind[]).filter((key) => view === "available" || key !== "order");
  const kind = kinds.includes(selectedKind) ? selectedKind : kinds[0];

  const stovesInView = useMemo(() => stoves.filter((stove) => inView(stove, view)), [stoves, view]);
  const kindCounts = useMemo(() => {
    const result: Record<Kind, number> = { used: 0, new: 0, order: 0 };
    for (const stove of stovesInView) result[kindOf(stove)] += 1;
    return result;
  }, [stovesInView]);

  const brands = useMemo(() => [...new Set(stoves.map((stove) => stove.brand))].sort((a, b) => a.localeCompare(b, "nl")), [stoves]);

  const query = search.trim().toLowerCase();
  const visible = sortStoves(
    stovesInView.filter((stove) => kindOf(stove) === kind && matchesSearch(stove, query)),
    sort,
  );
  const otherView: StockView = view === "sold" ? "available" : "sold";
  const otherMatches = query && kind !== "order"
    ? stoves.filter((stove) => kindOf(stove) === kind && inView(stove, otherView) && matchesSearch(stove, query)).length
    : 0;
  const visibleUnits = visible.reduce((sum, stove) => sum + unitsOf(stove), 0);
  const visibleCents = visible.reduce((sum, stove) => sum + (stove.priceCents ?? 0) * unitsOf(stove), 0);

  const header = (label: string, sortKey: SortKey, className?: string) => (
    <SortableHeader label={label} sortKey={sortKey} sort={sort} onSort={(key) => setSort((current) => nextSort(current, key))} className={className} />
  );

  return (
    <section aria-labelledby="stock-title">
      <StockPrintList stoves={stoves} />
      <div className="stock-toolbar">
        <div className="stock-title-row">
          <h1 id="stock-title" className={view === "sold" ? "stock-title--archive" : undefined}>{VIEW_TITLES[view]}</h1>
          {view === "available" && (
            <button type="button" className="icon-button" onClick={() => window.print()} disabled={stoves.length === 0} title="Voorraad afdrukken" aria-label="Voorraad afdrukken">
              <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9V3h12v6" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <path d="M6 14h12v7H6z" />
              </svg>
            </button>
          )}
        </div>
        <div className="kind-tabs" role="group" aria-label="Soort kachel">
          {kinds.map((key) => (
            <button key={key} type="button" aria-pressed={kind === key} onClick={() => setKind(key)}>
              {KIND_LABELS[key]} <span>{kindCounts[key]}</span>
            </button>
          ))}
        </div>
        <input
          className="search-input"
          type="search"
          placeholder="Zoek op nummer of merk"
          aria-label="Zoeken"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {stoves.length === 0 ? (
        <div className="notice">
          <strong>Nog geen kachels</strong>
          <p>Voeg de eerste toe via <Link href="/">Kachel toevoegen</Link>.</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="notice">
          <p>
            Geen kachels gevonden bij {KIND_LABELS[kind].toLowerCase()} · {VIEW_TITLES[view].toLowerCase()}.
          </p>
          {otherMatches > 0 && (
            <Link className="text-button" href={STOCK_VIEW_HREFS[otherView]}>
              {otherMatches} gevonden in {VIEW_TITLES[otherView].toLowerCase()} →
            </Link>
          )}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="stove-table">
            <thead>
              <tr>
                {header("Nr.", "number", "cell-number")}
                <th scope="col">Foto&apos;s</th>
                {header("Merk", "brand")}
                {header("Staat", "condition")}
                <th scope="col">Type</th>
                <th scope="col" className="cell-numeric">H × B × D</th>
                <th scope="col">Rookafvoer</th>
                {header("Prijs", "priceCents", "cell-numeric")}
                {header("Status", "status")}
                {(Object.keys(LISTING_CHANNELS) as ListingChannel[]).map((channel) => (
                  <th key={channel} scope="col">{LISTING_CHANNELS[channel].label}</th>
                ))}
                {header("Toegevoegd", "createdAt")}
                {ACTION_LABELS.map((label) => (
                  <th key={label} scope="col" className="cell-actions"><span className="visually-hidden">{label}</span></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((stove) => <StoveRow key={stove.number} stove={stove} brands={brands} />)}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={7}>{visibleUnits} {visibleUnits === 1 ? "kachel" : "kachels"}</td>
                <td className="cell-numeric">{formatPrice(visibleCents)}</td>
                <td colSpan={2 + ACTION_LABELS.length + Object.keys(LISTING_CHANNELS).length} className="muted">incl. btw</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
