import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `npm run typecheck` runs separately; avoids duplicate tsc OOM during `next build` on this host.
  typescript: {
    ignoreBuildErrors: true,
  },
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
