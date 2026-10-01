"use client";

import { useId, useState } from "react";
import { articleDescription, salePriceInclCents, type Article } from "../lib/articles";
import { articleLine, stoveLine, type DraftLine } from "../lib/invoice-draft";
import { formatPrice } from "../lib/price";
import type { QuoteStoveOption } from "../lib/quote-queries";
import { stoveProductName } from "../lib/stove-specs";
import { CONDITION_LABELS } from "../lib/stoves";

const MAX_RESULTS = 12;

type Option = { key: string; kind: string; label: string; detail: string; line: () => DraftLine };

function stoveOption(stove: QuoteStoveOption): Option {
  const condition = stove.condition ? CONDITION_LABELS[stove.condition] : null;
  return {
    key: `stove-${stove.number}`,
    kind: "Kachel",
    label: `${stove.number} · ${stoveProductName(stove)}`,
    detail: [condition, stove.priceCents ? formatPrice(stove.priceCents) : null].filter(Boolean).join(" · "),
    line: () => stoveLine(stove),
  };
}

function articleOption(article: Article): Option {
  const price = salePriceInclCents(article);
  return {
    key: `article-${article.id}`,
    kind: "Artikel",
    label: articleDescription(article),
    detail: [article.sku, price === null ? "geen prijs" : `${formatPrice(price)} incl.`].filter(Boolean).join(" · "),
    line: () => articleLine(article),
  };
}

type QuoteLinePickerProps = {
  stoves: QuoteStoveOption[];
  articles: Article[];
  onPick: (line: DraftLine) => void;
  disabled?: boolean;
};

// Search box that adds a stove on offer or an article from the article list as a quote line.
export default function QuoteLinePicker({ stoves, articles, onPick, disabled }: QuoteLinePickerProps) {
  const [query, setQuery] = useState("");
  const listId = useId();
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

  const results =
    words.length === 0
      ? []
      : [...stoves.map(stoveOption), ...articles.map(articleOption)]
          .filter((option) => {
            const haystack = `${option.kind} ${option.label} ${option.detail}`.toLowerCase();
            return words.every((word) => haystack.includes(word));
          })
          .slice(0, MAX_RESULTS);

  function pick(option: Option) {
    onPick(option.line());
    setQuery("");
  }

  return (
    <div className="line-picker">
      <input
        type="search"
        className="search-input"
        placeholder="Kachel of artikel zoeken (nummer, merk, naam, Ø)"
        aria-label="Kachel of artikel zoeken"
        aria-controls={listId}
        value={query}
        disabled={disabled}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            if (results[0]) pick(results[0]);
          }
        }}
      />
      {words.length > 0 && (
        <ul id={listId} className="line-picker-results">
          {results.length === 0 ? (
            <li className="muted line-picker-empty">Niets gevonden.</li>
          ) : (
            results.map((option) => (
              <li key={option.key}>
                <button type="button" onClick={() => pick(option)}>
                  <span className={`line-picker-kind line-picker-kind--${option.kind === "Kachel" ? "stove" : "article"}`}>{option.kind}</span>
                  <span className="line-picker-label">{option.label}</span>
                  <span className="line-picker-detail">{option.detail}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
