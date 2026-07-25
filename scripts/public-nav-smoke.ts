/**
 * Guards public primary navigation: /about must stay in config and MainNav.
 * Run: npx tsx scripts/public-nav-smoke.ts
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
    ["/", "/about", "/achievements", "/courses", "/gallery", "/consultation"],
    "publicNavLinks order/hrefs drifted from the agreed primary menu",
  );

  assert.equal(
    publicNavLinks.some((link) => (link.href as string) === "/pre-registration"),
    false,
    "pre-registration must not appear as a text nav item (gold CTA only)",
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
  assert.doesNotMatch(
    mainNavSource,
    /filter\s*\(\s*\(?\s*link[^)]*\)?\s*=>\s*link\.href\s*!==\s*["']\/about["']/,
    "MainNav must not filter out /about",
  );
  assert.doesNotMatch(
    mainNavSource,
    /href\s*!==\s*["']\/about["']/,
    "MainNav must not exclude /about via href comparison",
  );

  // Both desktop and mobile lists must iterate the shared config.
  const mapOccurrences = mainNavSource.match(/publicNavLinks\.map/g) ?? [];
  assert.ok(
    mapOccurrences.length >= 2,
    "MainNav should render publicNavLinks at least twice (desktop + mobile)",
  );

  console.log("public-nav-smoke PASS");
  console.log(`  links: ${hrefs.join(" → ")}`);
  console.log('  /about + MainNav shared config OK');
}

main();
