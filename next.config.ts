import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  distDir: (() => {
    const raw = process.env.NEXT_BUILD_DIST_DIR?.trim();
    if (!raw) return ".next";
    return path.isAbsolute(raw) ? raw : path.join(__dirname, raw);
  })(),
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
