import { after } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { getWooCommerceConfig } from "../../../../lib/woocommerce/client";
import { applyShopProduct } from "../../../../lib/woocommerce/shop-to-app";
import { isValidSignature, readDelivery } from "../../../../lib/woocommerce/webhook";

// Receives WooCommerce webhooks (product and order changes) and takes them over into the app.
// Public on purpose: the proxy lets it through without a login, and every delivery is authenticated
// by its HMAC signature instead. See docs/woocommerce-sync.md.

// Importing a new product downloads its photos, which can take a while.
export const maxDuration = 300;

const MAX_BODY_BYTES = 1_000_000;
const MAX_PRODUCTS_PER_DELIVERY = 50;

export async function POST(request: Request) {
  const secret = process.env.WOOCOMMERCE_WEBHOOK_SECRET?.trim();
  const config = getWooCommerceConfig();
  const admin = createAdminClient();
  if (!secret || !config || !admin) return new Response("Not configured", { status: 503 });

  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) return new Response("Too large", { status: 413 });

  const signature = request.headers.get("x-wc-webhook-signature");
  // WooCommerce pings a new webhook once with a form body ("webhook_id=12"), which is not signed.
  // It only has to succeed; nothing is done with it.
  if (!signature && /^webhook_id=\d+$/.test(rawBody)) return new Response(null, { status: 204 });
  if (!isValidSignature(rawBody, signature, secret)) return new Response("Invalid signature", { status: 401 });

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid body", { status: 400 });
  }

  const delivery = readDelivery(request.headers.get("x-wc-webhook-topic"), payload);
  if (!delivery || delivery.productIds.length === 0) return new Response(null, { status: 204 });

  // Answer right away: WooCommerce waits only a few seconds and retries or disables slow webhooks.
  after(async () => {
    for (const productId of delivery.productIds.slice(0, MAX_PRODUCTS_PER_DELIVERY)) {
      try {
        await applyShopProduct(admin, config, productId, { stockOnly: delivery.stockOnly });
      } catch (error) {
        // Status and code only; no product or order contents.
        console.error("Web shop webhook failed", {
          productId,
          status: (error as { status?: unknown })?.status,
          code: (error as { code?: unknown })?.code,
        });
      }
    }
  });
  return new Response(null, { status: 202 });
}
