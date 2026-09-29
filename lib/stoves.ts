export const PHOTOS_BUCKET = "stove-photos";

// Photos are resized to JPEG in the browser (lib/resize-photo.ts) before upload.
// Together they must stay below the Server Action body limit in next.config.ts
// (and Vercel's 4.5 MB request cap).
export const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024;
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_PHOTOS_PER_UPLOAD = 6;
export const MAX_TEXT_LENGTH = 100;

export const CONDITION_LABELS = { new: "Nieuw", used: "Gebruikt" } as const;
export const FLUE_OUTLET_LABELS = { top: "Boven", rear: "Achter" } as const;
// How a new stove is supplied: from stock, or ordered from the supplier once sold (no stock kept).
export const SUPPLY_LABELS = { stock: "Uit voorraad", order: "Op bestelling" } as const;
export type Condition = keyof typeof CONDITION_LABELS;
export type FlueOutlet = keyof typeof FLUE_OUTLET_LABELS;

// Keep in sync with the check constraints in the stove specifications migration.
export const DIMENSION_CM = { min: 1, max: 500 } as const;
export const FLUE_DIAMETER_MM = { min: 50, max: 400 } as const;
export const COMMON_FLUE_DIAMETERS_MM = [100, 120, 125, 130, 150, 180, 200];
// Keep in sync with the stock quantity migration. Used stoves are always a single unit.
export const STOCK_QUANTITY = { min: 1, max: 10000 } as const;

// Sales channels a stove can be offered on. The database unticks all of them once a stove is sold out.
export const LISTING_CHANNELS = {
  shop: { column: "shop_listed", field: "shopListed", label: "Webshop", description: "Online zetten in de webshop", target: "online in de webshop" },
  marketplace: {
    column: "marketplace_listed",
    field: "marketplaceListed",
    label: "Marktplaats",
    description: "Plaatsen op Marktplaats en 2dehands",
    target: "op Marktplaats en 2dehands",
  },
} as const;
export type ListingChannel = keyof typeof LISTING_CHANNELS;

export type StovePhoto = { id: number; url: string | null };
export type StoveInvoice = { id: number; number: string };

export type Stove = {
  number: number;
  brand: string;
  model: string;
  condition: Condition | null;
  heightCm: number | null;
  widthCm: number | null;
  depthCm: number | null;
  flueOutlet: FlueOutlet | null;
  flueDiameterMm: number | null;
  priceCents: number | null;
  shopListed: boolean;
  marketplaceListed: boolean;
  /** New stove sold without stock; always available, stock is not tracked. */
  madeToOrder: boolean;
  /** Units in stock; 0 exactly when soldAt is set. */
  stockQuantity: number;
  soldAt: string | null;
  createdAt: string;
  photos: StovePhoto[];
  invoices: StoveInvoice[];
};
