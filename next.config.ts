import type { NextConfig } from "next";

const toHome = [
  "/discover/:path*",
  "/portal/:path*",
  "/shop/:path*",
  "/starbook/:path*",
  "/atrin/:path*",
  "/guidance/:path*",
  "/counselor/:path*",
  "/academy/:path*",
  "/challenge/:path*",
  "/ai/:path*",
  "/staros/:path*",
  "/students/:path*",
  "/login",
  "/entekhab/:path*",
  "/ms/:path*",
  "/staff/:path*",
  "/booklet/:path*",
  "/order/:path*",
  "/o/:path*",
  "/p/:path*",
  "/payments/:path*",
  // former primary school (دبستان ستارگان آینده) URLs
  "/school/:path*",
  "/dabestan/:path*",
  "/primary/:path*",
  "/setaregan-ayandeh/:path*",
  "/ayandeh/:path*",
  "/elementary/:path*",
  // former language center
  "/language/:path*",
  "/zaban/:path*",
];

const map: [string, string][] = [
  ["/about/story", "/about"],
  ["/about/vision", "/about"],
  ["/about/founder", "/about#founder"],
  ["/about/team", "/team"],
  ["/team/:slug", "/team"],
  ["/achievements/:slug", "/achievements"],
  ["/classes/:path*", "/education"],
  ["/courses/:path*", "/education"],
  ["/amoozeshgah", "/education"],
  ["/konkur", "/education"],
  ["/exams/:path*", "/ghalamchi"],
  ["/assessments/:path*", "/ghalamchi"],
  ["/ghalamchi/register", "/ghalamchi#register"],
  ["/pre-registration", "/register"],
  ["/consultation", "/register"],
  ["/book/:path*", "/register"],
  ["/forms/:path*", "/register"],
  ["/register/:slug", "/register"],
  ["/about/school", "/about"],
];

const nextConfig: NextConfig = {
  // Low-memory servers can build into a side directory, then swap (see DEPLOY.md)
  distDir: process.env.NEXT_BUILD_DIST_DIR || ".next",
  poweredByHeader: false,
  devIndicators: false,
  experimental: {
    serverActions: { bodySizeLimit: "60mb" },
  },
  async redirects() {
    return [
      ...toHome.map((source) => ({ source, destination: "/", permanent: true })),
      ...map.map(([source, destination]) => ({ source, destination, permanent: true })),
    ];
  },
};

export default nextConfig;
