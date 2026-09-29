import type { Company } from "./invoice";
import { DEFAULT_AD_PROMPT } from "./ad-prompt";
import { formatPrice } from "./price";
import { CONDITION_LABELS, FLUE_OUTLET_LABELS, type Stove } from "./stoves";

// Server-only: reads OPENAI_API_KEY. Import only from Server Actions.

const OPENAI_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-6-astra";
const TIMEOUT_MS = 45_000;
const MAX_OUTPUT_TOKENS = 4000;
const FALLBACK_COMPANY_NAME = "Woonwarmer";

export type AdStove = Pick<
  Stove,
  "number" | "brand" | "model" | "condition" | "heightCm" | "widthCm" | "depthCm" | "flueOutlet" | "flueDiameterMm" | "priceCents" | "madeToOrder"
>;
export type AdCompany = Pick<Company, "name" | "address" | "postal_code" | "city" | "email" | "phone">;

export class AdGenerationError extends Error {}

// Always appended after the editable prompt, so an edited prompt cannot switch off these guards.
const FIXED_RULES = [
  "Vaste regels (deze gaan altijd voor):",
  "- Gebruik voor de kachel uitsluitend de feiten uit de invoer. Verzin geen eigenschappen die er niet staan, zoals vermogen, brandstof, energielabel, bouwjaar, garantie, levering of installatie.",
  "- Gebruik over het bedrijf alleen wat in de instructies hierboven en in de invoer staat, en alleen de contactgegevens uit de invoer.",
  "- Schrijf platte tekst zonder Markdown (geen **, # of _).",
  "- Geef alleen de advertentietekst terug, zonder toelichting.",
].join("\n");

function describeStove(stove: AdStove) {
  const lines = [
    `Merk: ${stove.brand}`,
    `Model: ${stove.model}`,
    stove.condition && `Staat: ${CONDITION_LABELS[stove.condition]}`,
    stove.heightCm && stove.widthCm && stove.depthCm && `Afmetingen (h × b × d): ${stove.heightCm} × ${stove.widthCm} × ${stove.depthCm} cm`,
    stove.flueOutlet && `Rookafvoer: ${FLUE_OUTLET_LABELS[stove.flueOutlet].toLowerCase()}`,
    stove.flueDiameterMm && `Diameter rookafvoer: Ø${stove.flueDiameterMm} mm`,
    stove.priceCents && `Vraagprijs: ${formatPrice(stove.priceCents)} incl. btw`,
    stove.madeToOrder && "Beschikbaarheid: op bestelling, niet direct uit voorraad",
    `Kachelnummer (referentie): ${stove.number}`,
  ];
  return lines.filter(Boolean).join("\n");
}

function describeCompany(company: AdCompany | null) {
  if (!company) return `Naam: ${FALLBACK_COMPANY_NAME}`;
  const lines = [
    `Naam: ${company.name}`,
    `Adres: ${company.address}, ${company.postal_code} ${company.city}`,
    company.phone && `Telefoon: ${company.phone}`,
    company.email && `E-mail: ${company.email}`,
  ];
  return lines.filter(Boolean).join("\n");
}

// The raw Responses API returns output items; text lives in message items as output_text parts.
function extractText(body: unknown): string {
  if (typeof body !== "object" || body === null || !("output" in body) || !Array.isArray(body.output)) return "";
  return body.output
    .filter((item): item is { type: "message"; content: unknown[] } => item?.type === "message" && Array.isArray(item.content))
    .flatMap((item) => item.content)
    .filter((part): part is { type: "output_text"; text: string } => {
      const candidate = part as { type?: unknown; text?: unknown } | null;
      return candidate?.type === "output_text" && typeof candidate.text === "string";
    })
    .map((part) => part.text)
    .join("")
    .trim();
}

export async function generateMarketplaceAd(stove: AdStove, company: AdCompany | null, prompt: string | null): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Generating marketplace ad failed: OPENAI_API_KEY is not set");
    throw new AdGenerationError("Advertentieteksten zijn nog niet ingesteld. Vraag de beheerder om de OpenAI-sleutel toe te voegen.");
  }

  let response: Response;
  try {
    response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
        instructions: `${prompt?.trim() || DEFAULT_AD_PROMPT}\n\n${FIXED_RULES}`,
        input: `Kachel:\n${describeStove(stove)}\n\nBedrijf:\n${describeCompany(company)}`,
        max_output_tokens: MAX_OUTPUT_TOKENS,
        store: false,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    console.error("Generating marketplace ad failed", { reason: timedOut ? "timeout" : "network" });
    throw new AdGenerationError(timedOut ? "Het maken van de tekst duurde te lang. Probeer het opnieuw." : "De tekstdienst is niet bereikbaar. Probeer het later opnieuw.");
  }

  if (!response.ok) {
    // Status only; the response body is not logged.
    console.error("Generating marketplace ad failed", { status: response.status });
    throw new AdGenerationError(
      response.status === 429 ? "De tekstdienst is even overbelast of het tegoed is op. Probeer het later opnieuw." : "Het maken van de tekst is mislukt. Probeer het opnieuw.",
    );
  }

  const text = extractText(await response.json().catch(() => null));
  if (!text) {
    console.error("Generating marketplace ad failed: empty output");
    throw new AdGenerationError("Er kwam geen tekst terug. Probeer het opnieuw.");
  }
  return text;
}
