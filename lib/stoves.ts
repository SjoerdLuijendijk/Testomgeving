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
export type Condition = keyof typeof CONDITION_LABELS;
export type FlueOutlet = keyof typeof FLUE_OUTLET_LABELS;

// Keep in sync with the check constraints in the stove specifications migration.
export const DIMENSION_CM = { min: 1, max: 500 } as const;
export const FLUE_DIAMETER_MM = { min: 50, max: 400 } as const;
export const COMMON_FLUE_DIAMETERS_MM = [100, 120, 125, 130, 150, 180, 200];

export type StovePhoto = { id: number; url: string | null };

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
  soldAt: string | null;
  createdAt: string;
  photos: StovePhoto[];
};
