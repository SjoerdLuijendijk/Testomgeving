import type { SupabaseClient } from "@supabase/supabase-js";
import type { Condition } from "./stoves";
import { CLOSED_NOTE_RETENTION_DAYS, type StoveNote, type StoveNoteInput } from "./stove-notes";

const NOTE_COLUMNS =
  "id, stove_number, status, buyer_name, buyer_phone, buyer_email, buyer_address, buyer_postal_code, buyer_city, handover, handover_date, handover_time, price_cents, payment_status, payment_method, paid_cents, agreements, closed_at, created_at, updated_at";

type NoteRow = {
  id: number;
  stove_number: number;
  status: StoveNote["status"];
  buyer_name: string | null;
  buyer_phone: string | null;
  buyer_email: string | null;
  buyer_address: string | null;
  buyer_postal_code: string | null;
  buyer_city: string | null;
  handover: StoveNote["handover"];
  handover_date: string | null;
  handover_time: string | null;
  price_cents: number | null;
  payment_status: StoveNote["paymentStatus"];
  payment_method: StoveNote["paymentMethod"];
  paid_cents: number | null;
  agreements: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};

function toStoveNote(row: NoteRow): StoveNote {
  return {
    id: row.id,
    stoveNumber: row.stove_number,
    status: row.status,
    buyerName: row.buyer_name,
    buyerPhone: row.buyer_phone,
    buyerEmail: row.buyer_email,
    buyerAddress: row.buyer_address,
    buyerPostalCode: row.buyer_postal_code,
    buyerCity: row.buyer_city,
    handover: row.handover,
    handoverDate: row.handover_date,
    // Postgres returns "14:00:00".
    handoverTime: row.handover_time?.slice(0, 5) ?? null,
    priceCents: row.price_cents,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    paidCents: row.paid_cents,
    agreements: row.agreements,
    closedAt: row.closed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toNoteRow(note: StoveNoteInput) {
  // Only the database columns; extra form fields such as deliveredNow are left out.
  return {
    status: note.status,
    buyer_name: note.buyerName,
    buyer_phone: note.buyerPhone,
    buyer_email: note.buyerEmail,
    buyer_address: note.buyerAddress,
    buyer_postal_code: note.buyerPostalCode,
    buyer_city: note.buyerCity,
    handover: note.handover,
    handover_date: note.handoverDate,
    handover_time: note.handoverTime,
    price_cents: note.priceCents,
    payment_status: note.paymentStatus,
    payment_method: note.paymentMethod,
    paid_cents: note.paidCents,
    agreements: note.agreements,
  };
}

// Open notes (in negotiation or sold, not yet done) grouped by stove, oldest first.
export async function getOpenNotesByStove(supabase: SupabaseClient): Promise<Map<number, StoveNote[]>> {
  const { data, error } = await supabase.from("stove_notes").select(NOTE_COLUMNS).is("closed_at", null).order("id");
  if (error) throw error;
  const byStove = new Map<number, StoveNote[]>();
  for (const row of data as NoteRow[]) {
    const list = byStove.get(row.stove_number) ?? [];
    list.push(toStoveNote(row));
    byStove.set(row.stove_number, list);
  }
  return byStove;
}

export type OpenNoteCounts = { open: number; toDeliver: number };

// Open notes, and among them the sold stoves still to be delivered.
export async function countOpenNotes(supabase: SupabaseClient): Promise<OpenNoteCounts> {
  const { data, error } = await supabase.from("stove_notes").select("status").is("closed_at", null);
  if (error) throw error;
  return { open: data.length, toDeliver: data.filter((row) => row.status === "sold").length };
}

/** What the notes list and dialog need to know about the stove of a note. */
export type NoteStove = {
  number: number;
  brand: string;
  condition: Condition | null;
  priceCents: number | null;
  madeToOrder: boolean;
  stockQuantity: number;
};

export type StoveNoteWithStove = StoveNote & { stove: NoteStove };

// All notes, newest first, after deleting closed notes past their retention period.
export async function listNotes(supabase: SupabaseClient): Promise<StoveNoteWithStove[]> {
  await deleteExpiredNotes(supabase);
  const { data, error } = await supabase
    .from("stove_notes")
    .select(`${NOTE_COLUMNS}, stoves (number, brand, condition, price_cents, made_to_order, stock_quantity)`)
    .order("id", { ascending: false });
  if (error) throw error;

  return data.map((row) => {
    // A to-one relation; supabase-js types it as an array without generated database types.
    const stove = row.stoves as unknown as { number: number; brand: string; condition: Condition | null; price_cents: number | null; made_to_order: boolean; stock_quantity: number };
    return {
      ...toStoveNote(row as unknown as NoteRow),
      stove: {
        number: stove.number,
        brand: stove.brand,
        condition: stove.condition,
        priceCents: stove.price_cents,
        madeToOrder: stove.made_to_order,
        stockQuantity: stove.stock_quantity,
      },
    };
  });
}

// Closed notes hold personal data of the buyer, so they are kept for a limited time only.
async function deleteExpiredNotes(supabase: SupabaseClient) {
  const cutoff = new Date(Date.now() - CLOSED_NOTE_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from("stove_notes").delete().lt("closed_at", cutoff);
  if (error) throw error;
}
