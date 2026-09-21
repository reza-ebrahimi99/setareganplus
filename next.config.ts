import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Poster uploads (JPEG/PNG/WebP up to 8MB) via Server Actions.
  experimental: {
    serverActions: {
      bodySizeLimit: "9mb",
    },
    webpackMemoryOptimizations: true,
    /** Low-RAM deploy hosts — avoid a second webpack worker OOM-killing the build. */
    webpackBuildWorker: false,
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
