/**
 * Guards public primary navigation + achievements dropdown.
 * Run: npx tsx scripts/public-nav-smoke.ts
 * or: npm run test:public-nav
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  publicNavIncludesHref,
  publicNavLinks,
} from "../content/public-nav";

function main() {
  assert.ok(
    publicNavIncludesHref("/about"),
    'publicNavLinks must include href="/about"',
  );

  const about = publicNavLinks.find((link) => link.href === "/about");
  assert.equal(about?.label, "درباره ما");

  const hrefs = publicNavLinks.map((link) => link.href);
  assert.deepEqual(
    hrefs,
    [
      "/",
      "/about",
      "/team",
      "/achievements",
      "/courses",
      "/gallery",
      "/consultation",
    ],
    "publicNavLinks order/hrefs drifted from the agreed primary menu",
  );

  const teamMatches = publicNavLinks.filter((link) => link.label === "تیم ما");
  assert.equal(teamMatches.length, 1, "تیم ما must appear exactly once");
  assert.equal(teamMatches[0]?.href, "/team", "تیم ما must link to /team");
  assert.ok(
    !("children" in teamMatches[0]! && teamMatches[0].children),
    "تیم ما must be a standalone link (not a dropdown)",
  );

  const aboutIndex = publicNavLinks.findIndex((link) => link.label === "درباره ما");
  const teamIndex = publicNavLinks.findIndex((link) => link.label === "تیم ما");
  const achievementsIndex = publicNavLinks.findIndex(
    (link) => link.label === "دستاوردها",
  );
  assert.ok(aboutIndex >= 0 && teamIndex >= 0 && achievementsIndex >= 0);
  assert.equal(
    teamIndex,
    aboutIndex + 1,
    "تیم ما must come immediately after درباره ما",
  );
  assert.equal(
    achievementsIndex,
    teamIndex + 1,
    "تیم ما must come immediately before دستاوردها",
  );

  assert.ok(publicNavIncludesHref("/team"), "publicNavIncludesHref must include /team");
  assert.ok(
    existsSync(path.join(process.cwd(), "app", "team", "page.tsx")),
    "public route app/team/page.tsx must exist",
  );

  assert.equal(
    publicNavLinks.some((link) => (link.href as string) === "/pre-registration"),
    false,
    "pre-registration must not appear as a text nav item (gold CTA only)",
  );

  const achievements = publicNavLinks.find(
    (link) => link.label === "دستاوردها",
  );
  assert.ok(achievements, 'menu must include label "دستاوردها"');
  assert.equal(achievements.href, "/achievements");
  assert.ok(achievements.children, "دستاوردها must have children");
  assert.equal(
    achievements.children.length,
    3,
    "دستاوردها must have exactly three children",
  );

  const [honors, examResults, topRanks] = achievements.children;
  assert.equal(honors.label, "افتخارات مؤسسه");
  assert.equal(honors.href, "/achievements");
  assert.equal(examResults.label, "نتایج آزمون‌های قلم‌چی");
  assert.equal(
    examResults.href,
    "/assessments",
    "قلم‌چی results must point to the existing public /assessments route",
  );
  assert.equal(topRanks.label, "آرشیو رتبه‌های برتر کنکور");
  assert.equal(
    topRanks.href,
    "/achievements/top-ranks",
    "top-rank archive must use the static public route under achievements",
  );

  assert.notEqual(
    honors.href,
    examResults.href,
    "dropdown children should target distinct routes (or intentional anchors)",
  );
  assert.notEqual(honors.href, topRanks.href);
  assert.notEqual(examResults.href, topRanks.href);

  assert.ok(
    publicNavIncludesHref("/assessments"),
    "publicNavIncludesHref must recognize child href /assessments",
  );
  assert.ok(
    publicNavIncludesHref("/achievements/top-ranks"),
    "publicNavIncludesHref must recognize /achievements/top-ranks",
  );
  assert.ok(
    existsSync(
      path.join(process.cwd(), "app", "achievements", "top-ranks", "page.tsx"),
    ),
    "public route app/achievements/top-ranks/page.tsx must exist",
  );

  const mainNavPath = path.join(
    process.cwd(),
    "components",
    "layout",
    "MainNav.tsx",
  );
  const mainNavSource = readFileSync(mainNavPath, "utf8");

  assert.match(
    mainNavSource,
    /from ["']@\/content\/public-nav["']/,
    "MainNav must import navigation from @/content/public-nav",
  );
  assert.match(
    mainNavSource,
    /publicNavLinks\.map/,
    "MainNav must map publicNavLinks for render (desktop/mobile)",
  );
  assert.match(
    mainNavSource,
    /DesktopNavItem/,
    "MainNav must render desktop dropdown items",
  );
  assert.match(
    mainNavSource,
    /MobileNavItem/,
    "MainNav must render mobile accordion items",
  );
  assert.match(
    mainNavSource,
    /link\.children/,
    "MainNav must render nav children for dropdown/accordion",
  );
  assert.match(
    mainNavSource,
    /aria-expanded/,
    "Mobile submenu toggle must expose aria-expanded",
  );
  assert.match(
    mainNavSource,
    /role=["']menu["']/,
    "Desktop dropdown must expose role=menu",
  );
  assert.match(
    mainNavSource,
    /group\/nav/,
    "Desktop dropdown must use hover/focus-within group",
  );
  assert.doesNotMatch(
    mainNavSource,
    /filter\s*\(\s*\(?\s*link[^)]*\)?\s*=>\s*link\.href\s*!==\s*["']\/about["']/,
    "MainNav must not filter out /about",
  );

  const mapOccurrences = mainNavSource.match(/publicNavLinks\.map/g) ?? [];
  assert.ok(
    mapOccurrences.length >= 2,
    "MainNav should render publicNavLinks at least twice (desktop + mobile)",
  );

  console.log("public-nav-smoke PASS");
  console.log(`  links: ${hrefs.join(" → ")}`);
  console.log(`  تیم ما → /team (after درباره ما, before دستاوردها)`);
  console.log(
    `  دستاوردها → ${honors.label} (${honors.href}), ${examResults.label} (${examResults.href}), ${topRanks.label} (${topRanks.href})`,
  );
}

main();
