import { formatPrice, MAX_PRICE_CENTS, parsePriceToCents } from "./price";

// Sales notes per stove (table stove_notes). Keep in sync with the stove notes migration.
export const NOTE_STATUS_LABELS = {
  negotiating: "In onderhandeling",
  // A sold note stays open until the stove is delivered (or picked up).
  sold: "Af te leveren",
  done: "Afgeleverd",
  cancelled: "Geannuleerd",
} as const;
export const HANDOVER_LABELS = { pickup: "Ophalen", delivery: "Bezorgen" } as const;
/** Appointment times offered in the note dialog: every quarter of an hour from 06:00 to 22:00. */
export const HANDOVER_TIMES = Array.from({ length: (22 - 6) * 4 + 1 }, (_, index) => {
  const minutes = 6 * 60 + index * 15;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});
export const PAYMENT_STATUS_LABELS = { open: "Nog niet betaald", deposit: "Aanbetaald", paid: "Betaald" } as const;
export const PAYMENT_METHOD_LABELS = { cash: "Contant", pin: "Pin", bank: "Bank" } as const;
export const MAX_AGREEMENTS_LENGTH = 2000;
/** Closed notes hold personal data of the buyer and are deleted this long after closing. */
export const CLOSED_NOTE_RETENTION_DAYS = 365;

export type NoteStatus = keyof typeof NOTE_STATUS_LABELS;
export type Handover = keyof typeof HANDOVER_LABELS;
export type PaymentStatus = keyof typeof PAYMENT_STATUS_LABELS;
export type PaymentMethod = keyof typeof PAYMENT_METHOD_LABELS;

export const isOpenStatus = (status: NoteStatus) => status === "negotiating" || status === "sold";

export type StoveNoteInput = {
  status: NoteStatus;
  buyerName: string | null;
  buyerPhone: string | null;
  buyerEmail: string | null;
  buyerAddress: string | null;
  buyerPostalCode: string | null;
  buyerCity: string | null;
  handover: Handover | null;
  /** YYYY-MM-DD */
  handoverDate: string | null;
  /** HH:MM */
  handoverTime: string | null;
  priceCents: number | null;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  paidCents: number | null;
  agreements: string | null;
};

/** Input of the note dialog: a sale can be delivered (or picked up) straight away. */
export type StoveNoteForm = StoveNoteInput & { deliveredNow: boolean };

export type StoveNote = StoveNoteInput & {
  id: number;
  stoveNumber: number;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const isKeyOf = <T extends object>(labels: T, value: unknown): value is keyof T =>
  typeof value === "string" && Object.hasOwn(labels, value);

// Empty text becomes null; undefined means too long.
function optionalText(value: FormDataEntryValue | null, max: number): string | null | undefined {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (trimmed === "") return null;
  return trimmed.length <= max ? trimmed : undefined;
}

function optionalPrice(value: FormDataEntryValue | null): number | null | undefined {
  const text = typeof value === "string" ? value.trim() : "";
  if (text === "") return null;
  return parsePriceToCents(text, { allowZero: true }) ?? undefined;
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

// Validates untrusted input from the note dialog. Only the status is required.
export function parseStoveNote(formData: FormData): Result<StoveNoteForm> {
  const status = formData.get("status");
  if (!isKeyOf(NOTE_STATUS_LABELS, status)) return { ok: false, error: "Kies een status." };

  const texts = {
    buyerName: optionalText(formData.get("buyer_name"), 200),
    buyerPhone: optionalText(formData.get("buyer_phone"), 40),
    buyerEmail: optionalText(formData.get("buyer_email"), 320),
    buyerAddress: optionalText(formData.get("buyer_address"), 200),
    buyerPostalCode: optionalText(formData.get("buyer_postal_code"), 20),
    buyerCity: optionalText(formData.get("buyer_city"), 100),
    agreements: optionalText(formData.get("agreements"), MAX_AGREEMENTS_LENGTH),
  };
  if (Object.values(texts).some((value) => value === undefined)) return { ok: false, error: "Een van de velden is te lang." };

  const handover = formData.get("handover") || null;
  if (handover !== null && !isKeyOf(HANDOVER_LABELS, handover)) return { ok: false, error: "Kies ophalen of bezorgen." };

  const handoverDate = optionalText(formData.get("handover_date"), 10);
  const handoverTime = optionalText(formData.get("handover_time"), 5);
  if (handoverDate === undefined || (handoverDate !== null && !isIsoDate(handoverDate))) return { ok: false, error: "Vul een geldige datum in." };
  if (handoverTime === undefined || (handoverTime !== null && !/^([01]\d|2[0-3]):[0-5]\d$/.test(handoverTime))) {
    return { ok: false, error: "Vul een geldige tijd in." };
  }
  if (handoverTime && !handoverDate) return { ok: false, error: "Vul ook de datum in bij de tijd." };

  const priceCents = optionalPrice(formData.get("price"));
  const paidCents = optionalPrice(formData.get("paid"));
  if (priceCents === undefined) return { ok: false, error: "Vul een geldige verkoopprijs in, bijvoorbeeld 1250 of 1250,50." };
  if (paidCents === undefined) return { ok: false, error: "Vul een geldig betaald bedrag in, bijvoorbeeld 250." };
  if (paidCents !== null && paidCents > MAX_PRICE_CENTS) return { ok: false, error: "Het betaalde bedrag is te hoog." };

  const paymentStatus = formData.get("payment_status");
  if (!isKeyOf(PAYMENT_STATUS_LABELS, paymentStatus)) return { ok: false, error: "Kies de betaalstatus." };
  const paymentMethod = formData.get("payment_method") || null;
  if (paymentMethod !== null && !isKeyOf(PAYMENT_METHOD_LABELS, paymentMethod)) return { ok: false, error: "Kies contant, pin of bank." };

  return {
    ok: true,
    value: {
      status,
      ...(texts as { [K in keyof typeof texts]: string | null }),
      handover,
      handoverDate,
      handoverTime,
      priceCents,
      paymentStatus,
      paymentMethod,
      // An amount paid only matters for a deposit; "paid" means the full price.
      paidCents: paymentStatus === "deposit" ? paidCents : null,
      deliveredNow: status === "sold" && formData.get("delivery") === "now",
    },
  };
}

const DATE_FORMAT = new Intl.DateTimeFormat("nl-NL", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/** "ophalen za 12 okt 14:00", or null without a date. */
export function formatHandover(note: Pick<StoveNote, "handover" | "handoverDate" | "handoverTime">) {
  if (!note.handoverDate) return null;
  const parts = [
    note.handover ? HANDOVER_LABELS[note.handover].toLowerCase() : null,
    DATE_FORMAT.format(new Date(`${note.handoverDate}T00:00:00Z`)),
    note.handoverTime,
  ];
  return parts.filter(Boolean).join(" ");
}

/** True when nothing but the status and the default payment status was filled in. */
export function isEmptyNote(note: StoveNoteForm) {
  return (
    note.paymentStatus === "open" &&
    [note.buyerName, note.buyerPhone, note.buyerEmail, note.buyerAddress, note.buyerPostalCode, note.buyerCity, note.handover,
      note.handoverDate, note.priceCents, note.paymentMethod, note.agreements].every((value) => value === null)
  );
}

// Open notes with the nearest handover first; notes without a date after them, newest first.
export function byHandover(a: StoveNote, b: StoveNote) {
  const keyA = a.handoverDate ? `${a.handoverDate} ${a.handoverTime ?? ""}` : null;
  const keyB = b.handoverDate ? `${b.handoverDate} ${b.handoverTime ?? ""}` : null;
  if (keyA && keyB && keyA !== keyB) return keyA < keyB ? -1 : 1;
  if (keyA !== keyB) return keyA ? -1 : 1;
  return b.id - a.id;
}

/** "Aanbetaald € 250 (contant)" */
export function formatPayment(note: Pick<StoveNote, "paymentStatus" | "paidCents" | "paymentMethod">) {
  const amount = note.paymentStatus === "deposit" && note.paidCents != null ? ` ${formatPrice(note.paidCents)}` : "";
  const method = note.paymentMethod ? ` (${PAYMENT_METHOD_LABELS[note.paymentMethod].toLowerCase()})` : "";
  return `${PAYMENT_STATUS_LABELS[note.paymentStatus]}${amount}${method}`;
}
