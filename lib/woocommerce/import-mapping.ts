import { MAX_PRICE_CENTS } from "../price";
import {
  DIMENSION_CM,
  EFFICIENCY_PERCENT,
  ENERGY_LABELS,
  FLUE_DIAMETER_MM,
  MAX_DESCRIPTION_LENGTH,
  MAX_TEXT_LENGTH,
  POWER_KW,
  STOVE_TYPE_LABELS,
  WARRANTY_YEARS,
  WEIGHT_KG,
  type EnergyLabel,
  type FlueOutlet,
  parseStoveType,
  type StoveType,
  type StoveTypeKey,
} from "../stoves";

// Maps a published WooCommerce product (REST API v3) to a stove row. Pure, so it can be tested
// without the shop. The shop's data is entered by hand, so every value is parsed defensively and
// left empty when it does not make sense.

export type ShopProductForImport = {
  id: number;
  name: string;
  sku: string;
  description: string;
  regular_price: string;
  price: string;
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: string;
  dimensions?: { length: string; width: string; height: string };
  weight?: string;
  categories: { slug: string }[];
  attributes: { name: string; options: string[] }[];
};

export type ImportedStoveRow = {
  number: number;
  brand: string;
  product_name: string;
  condition: "new" | "used";
  stove_type: StoveType | null;
  height_cm: number | null;
  width_cm: number | null;
  depth_cm: number | null;
  weight_kg: number | null;
  flue_outlet: FlueOutlet | null;
  flue_diameter_mm: number | null;
  flue_center_height_cm: number | null;
  power_kw: number | null;
  min_power_kw: number | null;
  max_power_kw: number | null;
  external_air_supply: boolean | null;
  new_firebox: boolean | null;
  thermostat: boolean | null;
  efficiency_percent: number | null;
  energy_label: EnergyLabel | null;
  warranty_years: number | null;
  material: string | null;
  description: string | null;
  price_cents: number | null;
  made_to_order: boolean;
  stock_quantity: number;
  shop_listed: true;
  marketplace_listed: false;
  secondhand_listed: false;
  shop_product_id: number;
  shop_sync_enabled: false;
};

export type ImportMapping = { ok: true; row: ImportedStoveRow } | { ok: false; reason: string };

const UNKNOWN = "Onbekend";
const NOT_STOVE_CATEGORIES = ["vuurschalen"];

const ENTITIES: Record<string, string> = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " };

// WordPress stores titles and term names with HTML entities ("Charlton &amp; Jenrick").
export function decodeEntities(text: string) {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name: string) => ENTITIES[name.toLowerCase()] ?? match);
}

function normalise(text: string) {
  return text.toLowerCase().replace(/\s+/g, "");
}

function clean(text: string) {
  return decodeEntities(text).replace(/\s+/g, " ").trim();
}

function truncate(text: string, maxLength: number) {
  return text.length > maxLength ? text.slice(0, maxLength).trim() : text;
}

// First number in a text such as "6,5 kw", "82,5 %" or "150mm".
function parseNumber(text: string | undefined) {
  const match = text?.match(/\d+(?:[.,]\d+)?/);
  return match ? Number(match[0].replace(",", ".")) : null;
}

function inRange(value: number | null, range: { min: number; max: number }) {
  return value !== null && value >= range.min && value <= range.max ? value : null;
}

function oneDecimal(value: number | null, range: { min: number; max: number }) {
  return inRange(value === null ? null : Math.round(value * 10) / 10, range);
}

function whole(value: number | null, range: { min: number; max: number }) {
  return inRange(value === null ? null : Math.round(value), range);
}

function yesNo(text: string | undefined) {
  const value = text?.trim().toLowerCase();
  return value === "ja" ? true : value === "nee" ? false : null;
}

function attributeValues(product: ShopProductForImport, ...names: string[]) {
  const wanted = names.map(normalise);
  const attribute = product.attributes.find((candidate) => wanted.includes(normalise(decodeEntities(candidate.name))));
  return attribute ? attribute.options.map(clean).filter(Boolean) : [];
}

function attributeValue(product: ShopProductForImport, ...names: string[]) {
  return attributeValues(product, ...names)[0];
}

// A known type becomes its key; otherwise the shop's own text is kept.
function stoveType(values: string[]): StoveType | null {
  for (const value of values) {
    const type = (Object.keys(STOVE_TYPE_LABELS) as StoveTypeKey[]).find((key) => normalise(STOVE_TYPE_LABELS[key]) === normalise(value));
    if (type) return type;
  }
  return values[0] ? parseStoveType(values[0]) : null;
}

function flueOutlet(values: string[]): FlueOutlet | null {
  const top = values.some((value) => /boven/i.test(value));
  const rear = values.some((value) => /achter/i.test(value));
  return top && rear ? "both" : top ? "top" : rear ? "rear" : null;
}

// "111 x 59 x 56 cm" (height × width × depth); fewer than three numbers is not usable.
function dimensionsFromText(text: string | undefined) {
  const numbers = text?.match(/\d+(?:[.,]\d+)?/g)?.map((value) => Number(value.replace(",", ".")));
  return numbers?.length === 3 ? numbers : null;
}

// Height of the rear flue centre in cm; values in other units (such as "115 kilo") are ignored.
function flueCenterHeight(text: string | undefined) {
  if (!text || /kg|kilo/i.test(text)) return null;
  return oneDecimal(parseNumber(text), DIMENSION_CM);
}

function priceCents(product: ShopProductForImport) {
  const euros = Number(product.regular_price || product.price);
  const cents = Number.isFinite(euros) ? Math.round(euros * 100) : 0;
  return cents >= 1 && cents <= MAX_PRICE_CENTS ? cents : null;
}

/** The stove details the shop product describes, without number, stock or listing. */
export type ShopProductDetails = Omit<
  ImportedStoveRow,
  "number" | "made_to_order" | "stock_quantity" | "shop_listed" | "marketplace_listed" | "secondhand_listed" | "shop_product_id" | "shop_sync_enabled"
>;

export function isStoveProduct(product: ShopProductForImport) {
  return !product.categories.some((category) => NOT_STOVE_CATEGORIES.includes(category.slug));
}

export function mapShopProduct(product: ShopProductForImport): ImportMapping {
  const sku = product.sku.trim();
  if (!/^\d{5}$/.test(sku)) return { ok: false, reason: "Geen 5-cijferig artikelnummer." };
  if (!isStoveProduct(product)) return { ok: false, reason: "Geen kachel (vuurschaal)." };
  if (product.stock_status === "outofstock") return { ok: false, reason: "Uitverkocht." };

  const details = shopProductDetails(product);
  const madeToOrder = details.condition === "new" && product.stock_status === "onbackorder" && !product.manage_stock;
  const stock = details.condition === "used" ? 1 : product.manage_stock && product.stock_quantity && product.stock_quantity > 0 ? product.stock_quantity : 1;

  return {
    ok: true,
    row: {
      number: Number(sku),
      ...details,
      made_to_order: madeToOrder,
      stock_quantity: madeToOrder ? 1 : stock,
      shop_listed: true,
      marketplace_listed: false,
      secondhand_listed: false,
      shop_product_id: product.id,
      shop_sync_enabled: false,
    },
  };
}

// Parses the product's name, attributes, description and price. Values that do not make sense are null.
export function shopProductDetails(product: ShopProductForImport): ShopProductDetails {
  const name = clean(product.name);
  const brand = truncate(attributeValue(product, "Merk") ?? UNKNOWN, MAX_TEXT_LENGTH);
  const conditionValue = attributeValue(product, "Staat kachel")?.toLowerCase();
  const condition =
    conditionValue === "nieuw" ? "new" : conditionValue ? "used" : product.categories.some((category) => category.slug === "nieuwe-kachels") ? "new" : "used";

  const textDimensions = dimensionsFromText(attributeValue(product, "Afmetingen (h × b × d)", "Afmetingen"));
  const dimension = (shopValue: string | undefined, textIndex: number) =>
    whole(parseNumber(shopValue) || (textDimensions ? textDimensions[textIndex] : null), DIMENSION_CM);

  const energyLabel = attributeValue(product, "Energielabel")?.toUpperCase().replace(/\s/g, "");
  const description = decodeEntities(product.description).trim();

  return {
    brand,
    product_name: truncate(name, MAX_TEXT_LENGTH),
    condition,
    stove_type: stoveType(attributeValues(product, "Type kachel")),
    height_cm: dimension(product.dimensions?.height, 0),
    width_cm: dimension(product.dimensions?.width, 1),
    depth_cm: dimension(product.dimensions?.length, 2),
    weight_kg: whole(parseNumber(product.weight) || parseNumber(attributeValue(product, "Gewicht")), WEIGHT_KG),
    flue_outlet: flueOutlet(attributeValues(product, "Aansluiting")),
    flue_diameter_mm: whole(parseNumber(attributeValue(product, "Diameter pijp", "Diameter schoorsteen")), FLUE_DIAMETER_MM),
    flue_center_height_cm: flueCenterHeight(attributeValue(product, "Harthoogte achter", "Hart hoogte achter", "Hart pijp hoogte")),
    power_kw: oneDecimal(parseNumber(attributeValue(product, "Vermogen")), POWER_KW),
    min_power_kw: oneDecimal(parseNumber(attributeValue(product, "Minimaal vermogen")), POWER_KW),
    max_power_kw: oneDecimal(parseNumber(attributeValue(product, "Maximaal vermogen")), POWER_KW),
    external_air_supply: yesNo(attributeValue(product, "Externe luchttoevoer", "Externe zuurstof")),
    new_firebox: yesNo(attributeValue(product, "Nieuw binnenwerk")),
    thermostat: yesNo(attributeValue(product, "Thermostaat")),
    efficiency_percent: oneDecimal(parseNumber(attributeValue(product, "Rendement")), EFFICIENCY_PERCENT),
    energy_label: (ENERGY_LABELS as readonly string[]).includes(energyLabel ?? "") ? (energyLabel as EnergyLabel) : null,
    warranty_years: whole(parseNumber(attributeValue(product, "Garantie")), WARRANTY_YEARS),
    material: truncate(attributeValue(product, "Materiaal", "Product materiaal") ?? "", MAX_TEXT_LENGTH) || null,
    description: description && description.length <= MAX_DESCRIPTION_LENGTH ? description : null,
    price_cents: priceCents(product),
  };
}
