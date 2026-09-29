"use client";

import { useState } from "react";
import { formatPrice } from "../lib/price";
import { CONDITION_LABELS, FLUE_OUTLET_LABELS, LISTING_CHANNELS, type ListingChannel, type Stove } from "../lib/stoves";
import EditStoveDialog from "./EditStoveDialog";
import InvoiceDialog from "./InvoiceDialog";
import PhotoCell from "./PhotoCell";
import ListingToggle from "./ListingToggle";
import SoldToggle from "./SoldToggle";
import StockControl from "./StockControl";
import StoveInvoiceLinks from "./StoveInvoiceLinks";

const DATE_FORMAT = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric" });
const MISSING = "—";

function formatDimensions({ heightCm, widthCm, depthCm }: Stove) {
  return heightCm && widthCm && depthCm ? `${heightCm} × ${widthCm} × ${depthCm} cm` : MISSING;
}

function formatFlue({ flueOutlet, flueDiameterMm }: Stove) {
  const parts = [flueOutlet && FLUE_OUTLET_LABELS[flueOutlet], flueDiameterMm && `Ø${flueDiameterMm} mm`].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : MISSING;
}

// On phones the row is a compact card; "cell-detail" cells only show once the card is expanded.
export default function StoveRow({ stove, brands }: { stove: Stove; brands: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const rowClass = [stove.soldAt && "is-sold", expanded && "is-expanded"].filter(Boolean).join(" ");

  return (
    <tr className={rowClass || undefined}>
      <td data-label="Nr." className="cell-number">{stove.number}</td>
      <td data-label="Foto's" className="cell-photo"><PhotoCell stoveNumber={stove.number} photos={stove.photos} /></td>
      <td data-label="Merk" className="cell-brand">{stove.brand}</td>
      <td data-label="Model" className="cell-model">{stove.model}</td>
      <td data-label="Staat" className="cell-detail">{stove.condition ? CONDITION_LABELS[stove.condition] : MISSING}</td>
      <td data-label="H × B × D" className="cell-detail cell-nowrap cell-numeric">{formatDimensions(stove)}</td>
      <td data-label="Rookafvoer" className="cell-detail cell-nowrap">{formatFlue(stove)}</td>
      <td data-label="Prijs" className="cell-price cell-nowrap cell-numeric">{stove.priceCents ? formatPrice(stove.priceCents) : MISSING}</td>
      <td data-label="Status" className="cell-status cell-sold">
        {stove.madeToOrder ? (
          <span className="stock-count">Op bestelling</span>
        ) : stove.condition === "new" ? (
          <StockControl stoveNumber={stove.number} quantity={stove.stockQuantity} />
        ) : (
          <SoldToggle stoveNumber={stove.number} sold={Boolean(stove.soldAt)} />
        )}
      </td>
      {(Object.keys(LISTING_CHANNELS) as ListingChannel[]).map((channel) => (
        <td key={channel} data-label={LISTING_CHANNELS[channel].label} className="cell-detail cell-status">
          <ListingToggle
            stoveNumber={stove.number}
            channel={channel}
            listed={stove[LISTING_CHANNELS[channel].field]}
            soldOut={Boolean(stove.soldAt)}
          />
        </td>
      ))}
      <td data-label="Toegevoegd" className="cell-detail muted">
        <time dateTime={stove.createdAt}>{DATE_FORMAT.format(new Date(stove.createdAt))}</time>
      </td>
      <td className="cell-detail cell-actions">
        <span className="row-actions">
          <EditStoveDialog stove={stove} brands={brands} />
          <InvoiceDialog stove={stove} />
          <StoveInvoiceLinks invoices={stove.invoices} />
        </span>
      </td>
      <td className="cell-toggle">
        <button
          type="button"
          className="card-toggle"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-label={`Details van kachel ${stove.number} ${expanded ? "verbergen" : "tonen"}`}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </td>
    </tr>
  );
}
