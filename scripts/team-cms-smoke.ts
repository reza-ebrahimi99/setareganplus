/**
 * Smoke checks for institute Team CMS helpers (no DB required for slug tests).
 * Run: npx tsx scripts/team-cms-smoke.ts
 */
import assert from "node:assert/strict";
import { normalizeTeamSlug, slugFromFullName } from "../lib/website/team-slug";
import { DEFAULT_TEAM_DEPARTMENTS } from "../lib/website/team-departments";
import {
  HOMEPAGE_FEATURED_TEAM_LIMIT,
  PUBLIC_TEAM_PAGE_SIZE,
} from "../lib/website/load-team";
import {
  TEAM_PORTRAIT_CARD_EDGE,
  TEAM_PORTRAIT_DETAIL_EDGE,
  TEAM_PORTRAIT_MAX_BYTES,
  buildTeamPortraitMetadata,
  parseTeamPortraitMetadata,
  publicPortraitUrl,
} from "../lib/media/team-portrait";
import { ADMIN_TEAM_PAGE_SIZE } from "../lib/website/team-admin";

assert.equal(normalizeTeamSlug("Reza Ebrahimi"), "reza-ebrahimi");
assert.ok(slugFromFullName("رضا ابراهیمی").startsWith("member-"));
assert.equal(DEFAULT_TEAM_DEPARTMENTS.length, 9);
assert.equal(DEFAULT_TEAM_DEPARTMENTS[0]?.name, "مدیریت مؤسسه");
assert.equal(HOMEPAGE_FEATURED_TEAM_LIMIT, 4);
assert.equal(PUBLIC_TEAM_PAGE_SIZE, 30);
assert.equal(ADMIN_TEAM_PAGE_SIZE, 30);
assert.equal(TEAM_PORTRAIT_MAX_BYTES, 2 * 1024 * 1024);
assert.equal(TEAM_PORTRAIT_CARD_EDGE, 480);
assert.equal(TEAM_PORTRAIT_DETAIL_EDGE, 960);

const metadata = buildTeamPortraitMetadata({
  w480: {
    storageKey: "team/abc-480.webp",
    width: 480,
    height: 600,
    byteSize: 12000,
  },
  w960: {
    storageKey: "team/abc-960.webp",
    width: 960,
    height: 1200,
    byteSize: 28000,
  },
});
assert.equal(parseTeamPortraitMetadata(metadata)?.variants.w480.storageKey, "team/abc-480.webp");
assert.ok(
  publicPortraitUrl(
    { storageKey: "team/abc-960.webp", metadata },
    "w480",
  )?.endsWith("/team/abc-480.webp"),
);
assert.ok(
  publicPortraitUrl(
    { storageKey: "team/abc-960.webp", metadata },
    "w960",
  )?.endsWith("/team/abc-960.webp"),
);

console.log(
  JSON.stringify(
    {
      ok: true,
      departments: DEFAULT_TEAM_DEPARTMENTS.length,
      featuredLimit: HOMEPAGE_FEATURED_TEAM_LIMIT,
      publicPageSize: PUBLIC_TEAM_PAGE_SIZE,
      adminPageSize: ADMIN_TEAM_PAGE_SIZE,
      portraitMaxBytes: TEAM_PORTRAIT_MAX_BYTES,
      portraitCardEdge: TEAM_PORTRAIT_CARD_EDGE,
      portraitDetailEdge: TEAM_PORTRAIT_DETAIL_EDGE,
    },
    null,
    2,
  ),
);
