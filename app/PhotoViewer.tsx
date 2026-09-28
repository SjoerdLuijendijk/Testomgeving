"use client";

import { useEffect, useRef } from "react";
import type { StovePhoto } from "../lib/stoves";

type PhotoViewerProps = {
  stoveNumber: number;
  photos: StovePhoto[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
};

// Full-size photo view inside the app, so photos open instead of downloading.
export default function PhotoViewer({ stoveNumber, photos, index, onIndexChange }: PhotoViewerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (index !== null && !dialog?.open) dialog?.showModal();
    if (index === null && dialog?.open) dialog.close();
  }, [index]);

  const count = photos.length;
  const photo = index !== null ? photos[index] : null;
  const go = (step: number) => index !== null && onIndexChange((index + step + count) % count);

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowRight") go(1);
    if (event.key === "ArrowLeft") go(-1);
  }

  return (
    <dialog
      ref={dialogRef}
      className="photo-viewer"
      aria-label={`Foto's van kachel ${stoveNumber}`}
      onClose={() => onIndexChange(null)}
      onKeyDown={handleKeyDown}
      // A click on the backdrop lands on the dialog element itself.
      onClick={(event) => event.target === event.currentTarget && onIndexChange(null)}
    >
      {photo && index !== null && (
        <>
          <div className="photo-viewer-bar">
            <span>Kachel {stoveNumber} · foto {index + 1} van {count}</span>
            <button type="button" className="viewer-button" onClick={() => onIndexChange(null)} aria-label="Sluiten" autoFocus>×</button>
          </div>
          {photo.url ? (
            <img src={photo.url} alt={`Kachel ${stoveNumber}, foto ${index + 1}`} />
          ) : (
            <p className="muted">Deze foto is niet beschikbaar.</p>
          )}
          {count > 1 && (
            <div className="photo-viewer-nav">
              <button type="button" className="viewer-button" onClick={() => go(-1)} aria-label="Vorige foto">‹</button>
              <button type="button" className="viewer-button" onClick={() => go(1)} aria-label="Volgende foto">›</button>
            </div>
          )}
        </>
      )}
    </dialog>
  );
}
