import { createHmac, timingSafeEqual } from "node:crypto";

// Server-only. Verifies WooCommerce webhook deliveries and reads which products they concern.

// WooCommerce signs the raw body: base64(HMAC-SHA256(body, secret)) in X-WC-Webhook-Signature.
export function isValidSignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  const received = Buffer.from(signature, "base64");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export type ShopDelivery = { productIds: number[]; stockOnly: boolean };

function positiveIds(values: unknown[]) {
  return [...new Set(values.filter((value): value is number => Number.isSafeInteger(value) && (value as number) > 0))];
}

// Product topics carry the product itself; order topics list the ordered products. An order only
// changes stock, so for orders only the stock is taken over. Other topics are ignored.
export function readDelivery(topic: string | null, payload: unknown): ShopDelivery | null {
  if (typeof payload !== "object" || payload === null) return null;
  const record = payload as { id?: unknown; line_items?: unknown };

  if (topic?.startsWith("product.")) return { productIds: positiveIds([record.id]), stockOnly: false };
  if (topic?.startsWith("order.")) {
    const items = Array.isArray(record.line_items) ? record.line_items : [];
    return { productIds: positiveIds(items.map((item) => (item as { product_id?: unknown })?.product_id)), stockOnly: true };
  }
  return null;
}
