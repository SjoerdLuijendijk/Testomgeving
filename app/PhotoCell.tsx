"use client";

import { useState, useTransition } from "react";
import type { StovePhoto } from "../lib/stoves";
import { photosToFormData } from "../lib/photo-form-data";
import { addStovePhotos, deleteStovePhoto } from "./actions";
import CameraButton from "./CameraButton";
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

  async function remove(photoId: number) {
    const confirmed = await confirm({ title: "Foto verwijderen?", message: "Dit kan niet ongedaan worden gemaakt.", confirmLabel: "Verwijderen", danger: true });
    if (!confirmed) return;
    startTransition(async () => {
      const result = await deleteStovePhoto(photoId);
      if (!result.ok) await notify(result.error);
    });
  }

  return (
    <div className="photo-cell" aria-busy={pending}>
      {photos.map((photo, index) => (
        <span key={photo.id} className="thumb">
          {photo.url ? (
            <button type="button" className="thumb-open" onClick={() => setViewIndex(index)} aria-label={`Foto ${index + 1} bekijken`}>
              <img src={photo.url} alt="" loading="lazy" />
            </button>
          ) : (
            <span className="thumb-missing" aria-label="Foto niet beschikbaar">?</span>
          )}
          <button type="button" className="remove-photo" onClick={() => remove(photo.id)} disabled={pending} aria-label={`Foto ${index + 1} verwijderen`}>×</button>
        </span>
      ))}
      <CameraButton label={pending ? "…" : "＋📷"} onPhotos={upload} className="thumb-add" disabled={pending} />
      <PhotoViewer stoveNumber={stoveNumber} photos={photos} index={viewIndex} onIndexChange={setViewIndex} />
    </div>
  );
}
