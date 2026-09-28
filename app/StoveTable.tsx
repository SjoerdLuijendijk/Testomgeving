"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatPrice } from "../lib/price";
import type { Stove } from "../lib/stoves";
import StoveRow from "./StoveRow";

type Filter = "all" | "available" | "sold";

const FILTER_LABELS: Record<Filter, string> = { all: "Alle", available: "Te koop", sold: "Verkocht" };

function matchesSearch(stove: Stove, query: string) {
  if (!query) return true;
  return [String(stove.number), stove.brand, stove.model].some((value) => value.toLowerCase().includes(query));
}

export default function StoveTable({ stoves }: { stoves: Stove[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("available");

  // Count and total price (incl. VAT) per filter; stoves without a price count as zero.
  const totals = useMemo(() => {
    const result: Record<Filter, { count: number; cents: number }> = {
      all: { count: 0, cents: 0 },
      available: { count: 0, cents: 0 },
      sold: { count: 0, cents: 0 },
    };
    for (const stove of stoves) {
      for (const key of ["all", stove.soldAt ? "sold" : "available"] as const) {
        result[key].count += 1;
        result[key].cents += stove.priceCents ?? 0;
      }
    }
    return result;
  }, [stoves]);

  const brands = useMemo(() => [...new Set(stoves.map((stove) => stove.brand))].sort((a, b) => a.localeCompare(b, "nl")), [stoves]);

  const query = search.trim().toLowerCase();
  const visible = stoves.filter(
    (stove) => matchesSearch(stove, query) && (filter === "all" || (filter === "sold") === Boolean(stove.soldAt)),
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
        <div className="notice"><p>Geen kachels gevonden.</p></div>
      ) : (
        <div className="table-wrap">
          <table className="stove-table">
            <thead>
              <tr>
                <th scope="col">Nr.</th>
                <th scope="col">Foto&apos;s</th>
                <th scope="col">Merk</th>
                <th scope="col">Model</th>
                <th scope="col">Staat</th>
                <th scope="col">H × B × D</th>
                <th scope="col">Rookafvoer</th>
                <th scope="col">Prijs</th>
                <th scope="col">Status</th>
                <th scope="col">Toegevoegd</th>
                <th scope="col"><span className="visually-hidden">Acties</span></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((stove) => <StoveRow key={stove.number} stove={stove} brands={brands} />)}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
