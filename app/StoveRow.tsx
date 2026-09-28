import type { Stove } from "../lib/stoves";
import PhotoCell from "./PhotoCell";
import SoldToggle from "./SoldToggle";

const DATE_FORMAT = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric" });

export default function StoveRow({ stove }: { stove: Stove }) {
  return (
    <tr className={stove.soldAt ? "is-sold" : undefined}>
      <td data-label="Nr." className="cell-number">{stove.number}</td>
      <td data-label="Foto's"><PhotoCell stoveNumber={stove.number} photos={stove.photos} /></td>
      <td data-label="Merk">{stove.brand}</td>
      <td data-label="Model">{stove.model}</td>
      <td data-label="Status"><SoldToggle stoveNumber={stove.number} sold={Boolean(stove.soldAt)} /></td>
      <td data-label="Toegevoegd" className="muted">
        <time dateTime={stove.createdAt}>{DATE_FORMAT.format(new Date(stove.createdAt))}</time>
      </td>
    </tr>
  );
}
