import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  images: { unoptimized: true }, // servimos webp ya optimizados desde /public
  headers: async () => [{
    source: "/img/:path*",
    headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
  }],
};
export default nextConfig;
