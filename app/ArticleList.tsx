"use client";

import { useMemo, useState, useTransition } from "react";
import { salePriceInclCents, type Article } from "../lib/articles";
import { formatPrice } from "../lib/price";
import { onRowClick } from "../lib/row-click";
import { deleteArticle } from "./article-actions";
import ArticleDialog from "./ArticleDialog";
import ArticleImport from "./ArticleImport";
import { useDialog } from "./DialogProvider";

const ALL = "";

function matches(article: Article, query: string) {
  if (!query) return true;
  return [article.sku, article.name, article.category, article.brand, article.diameterMm]
    .some((value) => value && value.toLowerCase().includes(query));
}

const money = (cents: number | null) => (cents === null ? "—" : formatPrice(cents, { alwaysCents: true }));

// Settings → Artikelen: the parts used on quotes, in the stock table layout.
export default function ArticleList({ articles }: { articles: Article[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ALL);
  const [editing, setEditing] = useState<{ article: Article | null } | null>(null);
  const [pending, startTransition] = useTransition();
  const { confirm, notify } = useDialog();

  const categories = useMemo(
    () => [...new Set(articles.map((article) => article.category).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, "nl")),
    [articles],
  );
  const query = search.trim().toLowerCase();
  const visible = articles.filter((article) => (category === ALL || article.category === category) && matches(article, query));

  async function remove(article: Article) {
    const confirmed = await confirm({ title: `${article.name} verwijderen?`, message: "Bestaande offertes houden de regel.", confirmLabel: "Verwijderen", danger: true });
    if (!confirmed) return;
    startTransition(async () => {
      const result = await deleteArticle(article.id);
      if (!result.ok) await notify(result.error);
    });
  }

  return (
    <section aria-labelledby="articles-title">
      <div className="stock-toolbar">
        <div className="stock-title-row">
          <h1 id="articles-title">Artikelen</h1>
          <div className="toolbar-actions">
            <ArticleImport />
            <button type="button" className="sale-button" onClick={() => setEditing({ article: null })}>+ Nieuw artikel</button>
          </div>
        </div>
        <select className="filter-select" value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Categorie">
          <option value={ALL}>Alle categorieën ({articles.length})</option>
          {categories.map((name) => (
            <option key={name} value={name}>{name} ({articles.filter((article) => article.category === name).length})</option>
          ))}
        </select>
        <input
          className="search-input"
          type="search"
          placeholder="Zoek op naam, artikelnummer of diameter"
          aria-label="Zoeken"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {visible.length === 0 ? (
        <div className="notice">
          <p>{articles.length === 0 ? "Nog geen artikelen. Importeer een CSV of voeg een artikel toe." : "Geen artikelen gevonden."}</p>
        </div>
      ) : (
        <div className="table-wrap" aria-busy={pending}>
          <table className="stove-table invoice-table">
            <thead>
              <tr>
                <th scope="col">Artikelnr.</th>
                <th scope="col">Naam</th>
                <th scope="col">Categorie</th>
                <th scope="col" className="cell-numeric">Ø mm</th>
                <th scope="col" className="cell-numeric">Lengte mm</th>
                <th scope="col">Eenheid</th>
                <th scope="col" className="cell-numeric">Prijs excl.</th>
                <th scope="col" className="cell-numeric">Prijs incl.</th>
                <th scope="col" className="cell-actions"><span className="visually-hidden">Verwijderen</span></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((article) => (
                <tr key={article.id} className="clickable-row" onClick={onRowClick(() => setEditing({ article }))}>
                  <td data-label="Artikelnr." className="cell-nowrap">{article.sku ?? "—"}</td>
                  <td data-label="Naam" className="cell-brand">{article.name}</td>
                  <td data-label="Categorie" className="muted">{article.category ?? "—"}</td>
                  <td data-label="Ø mm" className="cell-numeric">{article.diameterMm ?? "—"}</td>
                  <td data-label="Lengte mm" className="cell-numeric">{article.lengthMm ?? "—"}</td>
                  <td data-label="Eenheid">{article.unit ?? "—"}</td>
                  <td data-label="Prijs excl." className="cell-numeric cell-nowrap">{money(article.salePriceExCents)}</td>
                  <td data-label="Prijs incl." className="cell-numeric cell-nowrap">{money(salePriceInclCents(article))}</td>
                  <td className="cell-actions">
                    <button type="button" className="icon-button icon-button--danger" onClick={() => remove(article)} title="Verwijderen" aria-label={`${article.name} verwijderen`}>
                      <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && <ArticleDialog article={editing.article} categories={categories} onClose={() => setEditing(null)} />}
    </section>
  );
}
