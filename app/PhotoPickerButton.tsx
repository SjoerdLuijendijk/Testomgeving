"use client";

import { useId, useState } from "react";
import { resizePhoto } from "../lib/resize-photo";
import { useDialog } from "./DialogProvider";

type PhotoPickerButtonProps = {
  label: React.ReactNode;
  /** Accessible name when the label is only an icon. */
  ariaLabel?: string;
  onPhotos: (photos: Blob[]) => void;
  className?: string;
  disabled?: boolean;
};

// A file input styled as a button. Phones let the user take a photo or pick from the library;
// the chosen photos are resized before they are handed over.
export default function PhotoPickerButton({ label, ariaLabel, onPhotos, className = "secondary-button", disabled }: PhotoPickerButtonProps) {
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
    <label htmlFor={id} className={className} aria-disabled={isDisabled} aria-label={ariaLabel}>
      <input
        id={id}
        type="file"
        accept="image/*"
        multiple
        className="visually-hidden"
        disabled={isDisabled}
        onChange={handleChange}
      />
      {busy ? "Verwerken…" : label}
    </label>
  );
}
