import { createClient } from "@supabase/supabase-js";

// Server-only. A client with the Supabase secret key, which bypasses RLS. Only for server work
// without a signed-in user that has been authorized in another way: the WooCommerce webhook, after
// its signature is verified (app/api/woocommerce/webhook/route.ts). Never import it elsewhere.
export function createAdminClient() {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) return null;
  return createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
