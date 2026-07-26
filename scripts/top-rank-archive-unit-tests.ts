/**
 * Unit checks for Top Rank Archive helpers (no DB required).
 * Run: npx tsx scripts/top-rank-archive-unit-tests.ts
 */

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  defaultTopRankTitle,
  parseJalaliYear,
  TOP_RANK_ARCHIVE_PUBLIC_PATH,
} from "../lib/website/top-rank-archive-constants";
import { parseTopRankWriteInput } from "../lib/website/top-rank-archive-admin";
import {
  isPublicNavChildActive,
  publicNavIncludesHref,
  publicNavLinks,
} from "../content/public-nav";

function main() {
  assert.equal(defaultTopRankTitle(1385), "رتبه‌های برتر کنکور ۱۳۸۵");

  assert.equal(parseJalaliYear("1385").ok, true);
  assert.equal(parseJalaliYear("12").ok, false);
  assert.equal(parseJalaliYear("abcd").ok, false);

  const missingMedia = parseTopRankWriteInput({
    yearRaw: "1385",
    titleRaw: "",
    descriptionRaw: "",
    mediaIdRaw: "",
    sortOrderRaw: "10",
    isPublished: true,
  });
  assert.equal(missingMedia.ok, false);

  const ok = parseTopRankWriteInput({
    yearRaw: "1385",
    titleRaw: "  ",
    descriptionRaw: "توضیح",
    mediaIdRaw: "media_1",
    sortOrderRaw: "10",
    isPublished: false,
  });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.data.year, 1385);
    assert.equal(ok.data.title, null);
    assert.equal(ok.data.mediaId, "media_1");
    assert.equal(ok.data.isPublished, false);
  }

  assert.equal(TOP_RANK_ARCHIVE_PUBLIC_PATH, "/achievements/top-ranks");
  assert.ok(publicNavIncludesHref("/achievements/top-ranks"));

  const achievements = publicNavLinks.find((link) => link.label === "دستاوردها");
  assert.ok(achievements?.children?.some((c) => c.href === "/achievements/top-ranks"));

  assert.equal(
    isPublicNavChildActive("/achievements", "/achievements/top-ranks"),
    false,
    "honors child must not activate on top-ranks path",
  );
  assert.equal(
    isPublicNavChildActive("/achievements/top-ranks", "/achievements/top-ranks"),
    true,
  );
  assert.equal(
    isPublicNavChildActive("/achievements", "/achievements/some-slug"),
    true,
  );

  assert.ok(
    existsSync(
      path.join(process.cwd(), "app", "achievements", "top-ranks", "page.tsx"),
    ),
  );
  assert.ok(
    existsSync(
      path.join(
        process.cwd(),
        "components",
        "achievements",
        "TopRankArchiveViewer.tsx",
      ),
    ),
  );

  const viewer = require("node:fs").readFileSync(
    path.join(
      process.cwd(),
      "components",
      "achievements",
      "TopRankArchiveViewer.tsx",
    ),
    "utf8",
  ) as string;
  assert.match(viewer, /object-contain/, "images must use object-contain (no crop)");
  assert.match(viewer, /Escape/, "lightbox must handle Escape");

  console.log("top-rank-archive-unit-tests PASS");
}

main();
