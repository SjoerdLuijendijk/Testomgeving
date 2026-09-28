import { formatPrice } from "../lib/price";
import { CONDITION_LABELS, FLUE_OUTLET_LABELS, type Stove } from "../lib/stoves";
import EditStoveDialog from "./EditStoveDialog";
import InvoiceDialog from "./InvoiceDialog";
import PhotoCell from "./PhotoCell";
import SoldToggle from "./SoldToggle";
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

export default function StoveRow({ stove, brands }: { stove: Stove; brands: string[] }) {
  return (
    <tr className={stove.soldAt ? "is-sold" : undefined}>
      <td data-label="Nr." className="cell-number">{stove.number}</td>
      <td data-label="Foto's"><PhotoCell stoveNumber={stove.number} photos={stove.photos} /></td>
      <td data-label="Merk">{stove.brand}</td>
      <td data-label="Model">{stove.model}</td>
      <td data-label="Staat">{stove.condition ? CONDITION_LABELS[stove.condition] : MISSING}</td>
      <td data-label="H × B × D" className="cell-nowrap cell-numeric">{formatDimensions(stove)}</td>
      <td data-label="Rookafvoer" className="cell-nowrap">{formatFlue(stove)}</td>
      <td data-label="Prijs" className="cell-nowrap cell-numeric">{stove.priceCents ? formatPrice(stove.priceCents) : MISSING}</td>
      <td data-label="Status" className="cell-status"><SoldToggle stoveNumber={stove.number} sold={Boolean(stove.soldAt)} /></td>
      <td data-label="Toegevoegd" className="muted">
        <time dateTime={stove.createdAt}>{DATE_FORMAT.format(new Date(stove.createdAt))}</time>
      </td>
      <td className="cell-actions">
        <span className="row-actions">
          <EditStoveDialog stove={stove} brands={brands} />
          <InvoiceDialog stove={stove} />
          <StoveInvoiceLinks invoices={stove.invoices} />
        </span>
      </td>
    </tr>
  );
}
