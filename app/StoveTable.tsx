"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatPrice } from "../lib/price";
import { DEFAULT_SORT, nextSort, sortStoves, type SortKey } from "../lib/stove-sort";
import type { Stove } from "../lib/stoves";
import SortableHeader from "./SortableHeader";
import StoveRow from "./StoveRow";

type Filter = "available" | "sold";

const FILTER_LABELS: Record<Filter, string> = { available: "Te koop", sold: "Verkocht" };

function matchesSearch(stove: Stove, query: string) {
  if (!query) return true;
  return [String(stove.number), stove.brand, stove.model].some((value) => value.toLowerCase().includes(query));
}

export default function StoveTable({ stoves }: { stoves: Stove[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("available");
  const [sort, setSort] = useState(DEFAULT_SORT);

  // Count and total price (incl. VAT) per filter; stoves without a price count as zero.
  const totals = useMemo(() => {
    const result: Record<Filter, { count: number; cents: number }> = {
      available: { count: 0, cents: 0 },
      sold: { count: 0, cents: 0 },
    };
    for (const stove of stoves) {
      const key = stove.soldAt ? "sold" : "available";
      result[key].count += 1;
      result[key].cents += stove.priceCents ?? 0;
    }
    return result;
  }, [stoves]);

  const brands = useMemo(() => [...new Set(stoves.map((stove) => stove.brand))].sort((a, b) => a.localeCompare(b, "nl")), [stoves]);

  const query = search.trim().toLowerCase();
  const visible = sortStoves(
    stoves.filter((stove) => matchesSearch(stove, query) && (filter === "sold") === Boolean(stove.soldAt)),
    sort,
  );
  const otherFilter: Filter = filter === "sold" ? "available" : "sold";
  const otherMatches = query
    ? stoves.filter((stove) => matchesSearch(stove, query) && (otherFilter === "sold") === Boolean(stove.soldAt)).length
    : 0;
  const visibleCents = visible.reduce((sum, stove) => sum + (stove.priceCents ?? 0), 0);

  const header = (label: string, sortKey: SortKey, className?: string) => (
    <SortableHeader label={label} sortKey={sortKey} sort={sort} onSort={(key) => setSort((current) => nextSort(current, key))} className={className} />
  );

  return (
    <section aria-labelledby="stock-title">
      <div className="stock-toolbar">
        <h1 id="stock-title">Voorraad</h1>
        <input
          className="search-input"
          type="search"
          placeholder="Zoek op nummer, merk of model"
          aria-label="Zoeken"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="filter-group" role="group" aria-label="Filter op status">
          {(Object.keys(FILTER_LABELS) as Filter[]).map((key) => (
            <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>
              {FILTER_LABELS[key]} <span>{totals[key].count}</span>
              <small>{formatPrice(totals[key].cents)} incl. btw</small>
            </button>
          ))}
        </div>
      </div>

      {stoves.length === 0 ? (
        <div className="notice">
          <strong>Nog geen kachels</strong>
          <p>Voeg de eerste toe via <Link href="/">Kachel toevoegen</Link>.</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="notice">
          <p>Geen kachels gevonden bij {FILTER_LABELS[filter]}.</p>
          {otherMatches > 0 && (
            <button type="button" className="text-button" onClick={() => setFilter(otherFilter)}>
              {otherMatches} gevonden bij {FILTER_LABELS[otherFilter]} →
            </button>
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
                {header("Model", "model")}
                {header("Staat", "condition")}
                <th scope="col" className="cell-numeric">H × B × D</th>
                <th scope="col">Rookafvoer</th>
                {header("Prijs", "priceCents", "cell-numeric")}
                {header("Status", "status")}
                <th scope="col">Online</th>
                {header("Toegevoegd", "createdAt")}
                <th scope="col"><span className="visually-hidden">Acties</span></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((stove) => <StoveRow key={stove.number} stove={stove} brands={brands} />)}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={7}>{visible.length} {visible.length === 1 ? "kachel" : "kachels"}</td>
                <td className="cell-numeric">{formatPrice(visibleCents)}</td>
                <td colSpan={4} className="muted">incl. btw</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
