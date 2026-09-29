"use client";

import { useId, useState, useTransition } from "react";
import { DEFAULT_AD_PROMPT, MAX_AD_PROMPT_LENGTH } from "../lib/ad-prompt";
import { saveAdPrompt } from "./ad-actions";

export default function AdPromptForm({ prompt }: { prompt: string }) {
  const [value, setValue] = useState(prompt);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const id = useId();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMessage(null);
    startTransition(async () => {
      const result = await saveAdPrompt(formData);
      setMessage(result.ok ? { ok: true, text: "Prompt opgeslagen." } : { ok: false, text: result.error });
    });
  }

  return (
    <>
      <p className="muted">
        Met deze instructies maakt de AI de Marktplaats-advertentie zodra een kachel wordt toegevoegd of bewerkt. Zet hier ook
        extra informatie over Woonwarmer neer; de AI gebruikt over het bedrijf alleen wat hier en bij Bedrijfsgegevens staat.
        De kachelgegevens en een paar vaste regels (niets verzinnen, geen opmaakcodes) worden automatisch toegevoegd.
      </p>
      <p className="muted">Bestaande advertenties veranderen niet; gebruik &ldquo;Opnieuw&rdquo; in het advertentievenster.</p>
      <form onSubmit={handleSubmit} className="form-stack">
        <label htmlFor={`${id}-prompt`}>Prompt</label>
        <textarea
          id={`${id}-prompt`}
          name="prompt"
          className="ad-text"
          rows={16}
          maxLength={MAX_AD_PROMPT_LENGTH}
          required
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setMessage(null);
          }}
          aria-describedby={`${id}-count`}
        />
        <p id={`${id}-count`} className="muted ad-prompt-count">{value.length} / {MAX_AD_PROMPT_LENGTH} tekens</p>
        {message && (
          <p className={message.ok ? "field-success" : "field-error"} role={message.ok ? "status" : "alert"}>{message.text}</p>
        )}
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={() => setValue(DEFAULT_AD_PROMPT)} disabled={pending || value === DEFAULT_AD_PROMPT}>
            Standaardtekst terugzetten
          </button>
          <button className="primary-button" type="submit" disabled={pending}>
            {pending ? "Opslaan…" : "Opslaan"}
          </button>
        </div>
      </form>
    </>
  );
}
