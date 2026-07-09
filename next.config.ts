import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  // distDir separado por proceso para poder correr varios dev servers a la vez
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: { unoptimized: true }, // servimos webp ya optimizados desde /public
  headers: async () => [{
    source: "/img/:path*",
    headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
  }],
};
export default nextConfig;
