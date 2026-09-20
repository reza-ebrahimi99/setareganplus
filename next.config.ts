import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Poster uploads (JPEG/PNG/WebP up to 8MB) via Server Actions.
  experimental: {
    serverActions: {
      bodySizeLimit: "9mb",
    },
  },
  async redirects() {
    return [
      {
        source: "/students",
        destination: "/about",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
