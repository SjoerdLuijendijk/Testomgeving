"use client";

import { useTransition } from "react";
import type { StovePhoto } from "../lib/stoves";
import { photosToFormData } from "../lib/photo-form-data";
import { addStovePhotos, deleteStovePhoto } from "./actions";
import CameraButton from "./CameraButton";

export default function PhotoCell({ stoveNumber, photos }: { stoveNumber: number; photos: StovePhoto[] }) {
  const [pending, startTransition] = useTransition();

  function upload(blobs: Blob[]) {
    startTransition(async () => {
      const result = await addStovePhotos(stoveNumber, photosToFormData(blobs));
      if (!result.ok) alert(result.error);
    });
  }

  function remove(photoId: number) {
    if (!confirm("Deze foto verwijderen?")) return;
    startTransition(async () => {
      const result = await deleteStovePhoto(photoId);
      if (!result.ok) alert(result.error);
    });
  }

  return (
    <div className="photo-cell" aria-busy={pending}>
      {photos.map((photo, index) => (
        <span key={photo.id} className="thumb">
          {photo.url ? (
            <a href={photo.url} target="_blank" rel="noopener noreferrer">
              <img src={photo.url} alt={`Kachel ${stoveNumber}, foto ${index + 1}`} loading="lazy" />
            </a>
          ) : (
            <span className="thumb-missing" aria-label="Foto niet beschikbaar">?</span>
          )}
          <button type="button" className="remove-photo" onClick={() => remove(photo.id)} disabled={pending} aria-label={`Foto ${index + 1} verwijderen`}>×</button>
        </span>
      ))}
      <CameraButton label={pending ? "…" : "＋📷"} onPhotos={upload} className="thumb-add" disabled={pending} />
    </div>
  );
}
