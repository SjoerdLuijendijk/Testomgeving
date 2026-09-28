export const PHOTOS_BUCKET = "stove-photos";

// Photos are resized to JPEG in the browser (lib/resize-photo.ts) before upload.
// Together they must stay below the Server Action body limit in next.config.ts
// (and Vercel's 4.5 MB request cap).
export const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024;
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_PHOTOS_PER_UPLOAD = 6;
export const MAX_TEXT_LENGTH = 100;

export type StovePhoto = { id: number; url: string | null };

export type Stove = {
  number: number;
  brand: string;
  model: string;
  soldAt: string | null;
  createdAt: string;
  photos: StovePhoto[];
};
