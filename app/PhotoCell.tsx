"use client";

import { useState, useTransition } from "react";
import type { StovePhoto } from "../lib/stoves";
import { photosToFormData } from "../lib/photo-form-data";
import { addStovePhotos, deleteStovePhoto } from "./actions";
import PhotoPickerButton from "./PhotoPickerButton";
import { useDialog } from "./DialogProvider";
import PhotoViewer from "./PhotoViewer";

export default function PhotoCell({ stoveNumber, photos }: { stoveNumber: number; photos: StovePhoto[] }) {
  const [pending, startTransition] = useTransition();
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const { confirm, notify } = useDialog();

  function upload(blobs: Blob[]) {
    startTransition(async () => {
      const result = await addStovePhotos(stoveNumber, photosToFormData(blobs));
      if (!result.ok) await notify(result.error);
    });
  }

  // Resolves true when the photo was deleted.
  async function remove(photoId: number) {
    const confirmed = await confirm({ title: "Foto verwijderen?", message: "Dit kan niet ongedaan worden gemaakt.", confirmLabel: "Verwijderen", danger: true });
    if (!confirmed) return false;
    return new Promise<boolean>((resolve) => {
      startTransition(async () => {
        const result = await deleteStovePhoto(photoId);
        if (!result.ok) await notify(result.error);
        resolve(result.ok);
      });
    });
  }

  // After deleting from the viewer, stay on the photo that took its place, or close when none are left.
  async function removeFromViewer(index: number) {
    if (!(await remove(photos[index].id))) return;
    const remaining = photos.length - 1;
    setViewIndex(remaining === 0 ? null : Math.min(index, remaining - 1));
  }

  // Only the main photo is shown and downloaded; the others load one at a time in the viewer.
  const [mainPhoto] = photos;
  const moreCount = photos.length - 1;

  return (
    <div className="photo-cell" aria-busy={pending}>
      {mainPhoto && (
        <span className="thumb">
          {mainPhoto.url ? (
            <button type="button" className="thumb-open" onClick={() => setViewIndex(0)} aria-label="Hoofdfoto bekijken">
              <img src={mainPhoto.url} alt="" />
            </button>
          ) : (
            <span className="thumb-missing" aria-label="Foto niet beschikbaar">?</span>
          )}
          <button type="button" className="remove-photo" onClick={() => remove(mainPhoto.id)} disabled={pending} aria-label="Hoofdfoto verwijderen">×</button>
        </span>
      )}
      {moreCount > 0 && (
        <button type="button" className="thumb-more" onClick={() => setViewIndex(1)} aria-label={`Nog ${moreCount} foto's bekijken`}>
          +{moreCount}
        </button>
      )}
      <PhotoPickerButton label={pending ? "…" : "＋📷"} ariaLabel="Foto's toevoegen" onPhotos={upload} className="thumb-add" disabled={pending} />
      <PhotoViewer stoveNumber={stoveNumber} photos={photos} index={viewIndex} onIndexChange={setViewIndex} onDelete={removeFromViewer} deleting={pending} />
    </div>
  );
}
