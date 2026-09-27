import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Room for MAX_UPLOAD_BYTES (lib/supabase.ts) plus multipart overhead.
      bodySizeLimit: "4.2mb",
    },
  },
};

export default nextConfig;
