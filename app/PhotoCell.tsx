"use client";

import { useState } from "react";
import type { StovePhoto } from "../lib/stoves";
import PhotoViewer from "./PhotoViewer";

// The inventory shows only the main photo with a count badge; photos are managed in the edit dialog.
export default function PhotoCell({ stoveNumber, photos }: { stoveNumber: number; photos: StovePhoto[] }) {
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const [mainPhoto] = photos;
  const moreCount = photos.length - 1;

  if (!mainPhoto) {
    return (
      <span className="thumb thumb-empty" title="Geen foto">
        <span className="visually-hidden">Geen foto</span>
      </span>
    );
  }

  return (
    <span className="thumb">
      {mainPhoto.url ? (
        <button
          type="button"
          className="thumb-open"
          onClick={() => setViewIndex(0)}
          aria-label={photos.length > 1 ? `${photos.length} foto's bekijken` : "Foto bekijken"}
        >
          <img src={mainPhoto.url} alt="" />
        </button>
      ) : (
        <span className="thumb-missing" aria-label="Foto niet beschikbaar">?</span>
      )}
      {moreCount > 0 && <span className="thumb-count" aria-hidden="true">+{moreCount}</span>}
      <PhotoViewer stoveNumber={stoveNumber} photos={photos} index={viewIndex} onIndexChange={setViewIndex} />
    </span>
  );
}
