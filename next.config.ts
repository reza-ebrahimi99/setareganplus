import type { NextConfig } from "next";

// Booklet shop paths (/shop, /booklet, /order, /o, /payments) are intentionally NOT
// redirected: nginx routes them to the old app until the booklet store is rebuilt here.
// Temporary (307) so browsers do not cache them; removed sections may come back later.
const toHome = [
  "/discover/:path*",
  "/portal/:path*",
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
  "/p/:path*",
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
  ["/konkur", "/konkur-nasimshahr"],
  ["/exams/:path*", "/ghalamchi"],
  ["/assessments/:path*", "/ghalamchi"],
  ["/ghalamchi/register", "/ghalamchi#register"],
  ["/pre-registration", "/register"],
  ["/consultation", "/register"],
  ["/book/:path*", "/register"],
  ["/forms/:path+", "/register"],
  ["/register/:slug", "/register"],
  ["/about/school", "/about"],
  // news / guides (phase 5)
  ["/blog/:path*", "/news"],
  ["/akhbar/:path*", "/news"],
  ["/announcements/:path*", "/news"],
  ["/news/category/:cat", "/news?cat=:cat"],
  ["/jozve", "/jozve-konkur"],
  ["/booklets", "/shop"],
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
      ...toHome.map((source) => ({ source, destination: "/", permanent: false })),
      ...map.map(([source, destination]) => ({ source, destination, permanent: true })),
    ];
  },
};

export default nextConfig;
