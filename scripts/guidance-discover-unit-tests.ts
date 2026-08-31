/**
 * Discovery Center catalog tests (no DB).
 * Run: npm run test:guidance-discover
 */

import assert from "node:assert/strict";
import { DISCOVER_MAJORS } from "../lib/guidance/discover/majors";
import { DISCOVER_PATHWAYS } from "../lib/guidance/discover/pathways";
import { DISCOVER_SYSTEMS } from "../lib/guidance/discover/systems";
import {
  listDiscoverSitemapPaths,
  relatedForMajor,
  searchDiscoverCatalog,
} from "../lib/guidance/discover/catalog";
import { GUIDANCE_MAJORS_BY_EXAM_GROUP } from "../lib/guidance/journey/reference-data/majors";

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

test("every journey catalog major has a discovery page", () => {
  const codes = Object.values(GUIDANCE_MAJORS_BY_EXAM_GROUP).flatMap((rows) =>
    rows.map((row) => row.code),
  );
  const discoverCodes = new Set(DISCOVER_MAJORS.map((item) => item.code));
  assert.equal(codes.length, DISCOVER_MAJORS.length);
  for (const code of codes) {
    assert.equal(discoverCodes.has(code), true, code);
  }
});

test("university systems and pathways are complete and unique", () => {
  assert.equal(DISCOVER_SYSTEMS.length, 8);
  assert.equal(DISCOVER_PATHWAYS.length, 6);
  const unique = (rows: readonly { slug: string }[]) => {
    const slugs = rows.map((item) => item.slug);
    assert.equal(new Set(slugs).size, slugs.length);
  };
  unique(DISCOVER_SYSTEMS);
  unique(DISCOVER_PATHWAYS);
  unique(DISCOVER_MAJORS);
  for (const item of DISCOVER_SYSTEMS) {
    assert.ok(item.overview.length > 20);
    assert.ok(item.admission.length > 20);
    assert.ok(item.tuition.length > 20);
    assert.ok(item.faq.length >= 2);
    assert.ok(item.insight.mistakes.length > 10);
    assert.equal(item.tuition.includes("میلیون"), false);
  }
});

test("majors carry career explorer fields without salary claims", () => {
  for (const item of DISCOVER_MAJORS) {
    assert.ok(item.career.paths.length >= 2);
    assert.ok(item.career.outlook.length > 20);
    const blob = `${item.career.outlook} ${item.insight.mistakes} ${item.faq.map((row) => row.answer).join(" ")}`;
    assert.equal(blob.includes("تضمین اشتغال صد درصد"), false);
    assert.ok(item.insight.families.length > 8);
  }
});

test("search finds majors and systems", () => {
  const medicine = searchDiscoverCatalog("پزشکی");
  assert.ok(medicine.some((hit) => hit.slug === "medicine" && hit.kind === "major"));
  const daily = searchDiscoverCatalog("روزانه");
  assert.ok(daily.some((hit) => hit.slug === "daily" && hit.kind === "system"));
});

test("related content never includes the same major", () => {
  const related = relatedForMajor("computer-engineering");
  assert.equal(related.majors.includes("computer-engineering"), false);
  assert.ok(related.majors.length > 0);
  assert.ok(related.systems.length > 0);
});

test("sitemap lists discover hub and detail pages", () => {
  const paths = listDiscoverSitemapPaths();
  assert.ok(paths.includes("/discover"));
  assert.ok(paths.includes("/discover/systems/daily"));
  assert.ok(paths.includes("/discover/majors/medicine"));
  assert.ok(paths.includes("/discover/careers/medicine"));
  assert.ok(paths.includes("/discover/pathways/bachelor"));
  assert.ok(paths.includes("/discover/compare"));
});

console.log("guidance discover unit tests passed");
