"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  COMMON_FLUE_DIAMETERS_MM,
  CONDITION_LABELS,
  DIMENSION_CM,
  FLUE_DIAMETER_MM,
  FLUE_OUTLET_LABELS,
  MAX_PHOTOS_PER_UPLOAD,
  MAX_TEXT_LENGTH,
} from "../lib/stoves";
import { photosToFormData } from "../lib/photo-form-data";
import { addStove } from "./actions";
import CameraButton from "./CameraButton";
import ChoiceGroup from "./ChoiceGroup";

type Photo = { blob: Blob; previewUrl: string };

const DIMENSION_FIELDS = [
  { name: "height", label: "Hoogte" },
  { name: "width", label: "Breedte" },
  { name: "depth", label: "Diepte" },
];

export default function AddStoveForm({ brands }: { brands: string[] }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ number: number; warning?: string } | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [pending, startTransition] = useTransition();

  // Release the preview URLs of photos still shown when leaving the page.
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => () => photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl)), []);

  function addPhotos(blobs: Blob[]) {
    setError(null);
    setPhotos((current) => {
      const room = MAX_PHOTOS_PER_UPLOAD - current.length;
      if (blobs.length > room) setError(`Maximaal ${MAX_PHOTOS_PER_UPLOAD} foto's per kachel bij het toevoegen.`);
      return [...current, ...blobs.slice(0, Math.max(room, 0)).map((blob) => ({ blob, previewUrl: URL.createObjectURL(blob) }))];
    });
  }

  function removePhoto(index: number) {
    URL.revokeObjectURL(photos[index].previewUrl);
    setPhotos((current) => current.filter((_, i) => i !== index));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = photosToFormData(photos.map((photo) => photo.blob), new FormData(event.currentTarget));
    setError(null);
    startTransition(async () => {
      const result = await addStove(formData);
      if (result.ok) {
        setSaved({ number: result.number, warning: result.warning });
        photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
        setPhotos([]);
        setFormKey((key) => key + 1);
      } else {
        setError(result.error);
      }
    });
  }

  if (saved) {
    return (
      <section className="panel saved-panel" role="status" aria-labelledby="saved-title">
        <p className="muted" id="saved-title">Kachel opgeslagen met nummer</p>
        <p className="stove-number-big">{saved.number}</p>
        <p className="muted">Zet dit nummer op de kachel.</p>
        {saved.warning && <p className="field-error">{saved.warning}</p>}
        <div className="button-row">
          <button className="primary-button" type="button" onClick={() => setSaved(null)}>Nog een kachel toevoegen</button>
          <Link className="secondary-button" href="/?tab=voorraad">Naar voorraad</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="panel" aria-labelledby="add-title">
      <h1 id="add-title">Kachel toevoegen</h1>
      <p className="muted">Het kachelnummer wordt automatisch gemaakt bij het opslaan.</p>

      <form key={formKey} onSubmit={handleSubmit} className="form-stack">
        <fieldset className="photo-field">
          <legend>Foto&apos;s</legend>
          {photos.length > 0 && (
            <ul className="photo-previews">
              {photos.map((photo, index) => (
                <li key={photo.previewUrl}>
                  <img src={photo.previewUrl} alt={`Foto ${index + 1}`} />
                  <button type="button" className="remove-photo" onClick={() => removePhoto(index)} aria-label={`Foto ${index + 1} verwijderen`}>×</button>
                </li>
              ))}
            </ul>
          )}
          <div className="button-row">
            <CameraButton label="📷 Foto maken" onPhotos={addPhotos} className="camera-button" disabled={pending} />
            <CameraButton label="Uit galerij" onPhotos={addPhotos} capture={false} disabled={pending} />
          </div>
        </fieldset>

        <label htmlFor="brand">Merk</label>
        <input id="brand" name="brand" list="known-brands" maxLength={MAX_TEXT_LENGTH} required autoComplete="off" autoCapitalize="words" />
        <datalist id="known-brands">
          {brands.map((brand) => <option key={brand} value={brand} />)}
        </datalist>

        <label htmlFor="model">Model</label>
        <input id="model" name="model" maxLength={MAX_TEXT_LENGTH} required autoComplete="off" />

        <ChoiceGroup legend="Staat" name="condition" options={CONDITION_LABELS} />

        <fieldset className="dimension-group">
          <legend>Afmetingen <span className="muted">(cm)</span></legend>
          <div className="dimension-fields">
            {DIMENSION_FIELDS.map(({ name, label }) => (
              <label key={name}>
                <span>{label}</span>
                <input name={name} type="number" inputMode="numeric" min={DIMENSION_CM.min} max={DIMENSION_CM.max} step={1} required />
              </label>
            ))}
          </div>
        </fieldset>

        <ChoiceGroup legend="Rookafvoer" name="flueOutlet" options={FLUE_OUTLET_LABELS} />

        <label htmlFor="flue-diameter">Maat afvoer <span className="muted">(Ø mm)</span></label>
        <input
          id="flue-diameter"
          name="flueDiameter"
          type="number"
          inputMode="numeric"
          list="common-flue-diameters"
          min={FLUE_DIAMETER_MM.min}
          max={FLUE_DIAMETER_MM.max}
          step={1}
          required
        />
        <datalist id="common-flue-diameters">
          {COMMON_FLUE_DIAMETERS_MM.map((diameter) => <option key={diameter} value={diameter} />)}
        </datalist>

        {error && <p className="field-error" role="alert">{error}</p>}
        <button className="primary-button primary-button--large" type="submit" disabled={pending}>
          {pending ? "Opslaan…" : "Kachel opslaan"}
        </button>
      </form>
    </section>
  );
}
