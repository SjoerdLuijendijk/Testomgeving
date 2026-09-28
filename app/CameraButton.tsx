"use client";

import { useId, useState } from "react";
import { resizePhoto } from "../lib/resize-photo";
import { useDialog } from "./DialogProvider";

type CameraButtonProps = {
  label: string;
  onPhotos: (photos: Blob[]) => void;
  className?: string;
  disabled?: boolean;
  /** Open the camera directly instead of letting the user choose from the library. */
  capture?: boolean;
};

// A file input styled as a button: opens the camera on phones and resizes the photos.
export default function CameraButton({ label, onPhotos, className = "secondary-button", disabled, capture = true }: CameraButtonProps) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const { notify } = useDialog();

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (files.length === 0) return;

    setBusy(true);
    try {
      onPhotos(await Promise.all(files.map(resizePhoto)));
    } catch {
      await notify("Een foto kon niet worden verwerkt. Probeer het opnieuw.");
    } finally {
      setBusy(false);
    }
  }

  const isDisabled = disabled || busy;
  return (
    <label htmlFor={id} className={className} aria-disabled={isDisabled}>
      <input
        id={id}
        type="file"
        accept="image/*"
        capture={capture ? "environment" : undefined}
        multiple
        hidden
        disabled={isDisabled}
        onChange={handleChange}
      />
      {busy ? "Verwerken…" : label}
    </label>
  );
}
