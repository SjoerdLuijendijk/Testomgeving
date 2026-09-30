import type { NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/proxy";

export function proxy(request: NextRequest) {
  return updateSession(request);
}

// The WooCommerce webhook has no user session; it authenticates each delivery by its signature.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|woonwarmer-logo.svg|api/woocommerce/webhook).*)"],
};
