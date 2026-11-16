import assert from "node:assert/strict";
import test from "node:test";
import { APARAT_URL, GHALAMCHI_INSTAGRAM_URL, INSTITUTE_INSTAGRAM_URL, publicInstagramUrl, sameAsUrls, withAparatSocial } from "./social";

const SEEDED = [
  { label: "اینستاگرام", url: "https://www.instagram.com/Ghalamchinasimshahr" },
  { label: "بله", url: "https://ble.ir/ghalamchi1404" },
  { label: "تلگرام", url: "https://t.me/setareganinstitute1" },
];

test("aparat is added once and existing social profiles stay", () => {
  const next = withAparatSocial(SEEDED);
  assert.deepEqual(next.map((s) => s.label), ["اینستاگرام", "بله", "تلگرام", "آپارات"]);
  assert.equal(next[3].url, APARAT_URL);
  assert.equal(withAparatSocial(next).length, 4);
});

test("sameAs keeps social urls and adds the institute instagram", () => {
  const urls = sameAsUrls(withAparatSocial(SEEDED));
  assert.ok(urls.includes(GHALAMCHI_INSTAGRAM_URL));
  assert.equal(urls.includes("https://www.instagram.com/Ghalamchinasimshahr"), false);
  assert.ok(urls.includes(INSTITUTE_INSTAGRAM_URL));
  assert.ok(urls.includes(APARAT_URL));
  assert.ok(urls.includes("https://ble.ir/ghalamchi1404"));
  assert.ok(urls.includes("https://t.me/setareganinstitute1"));
  assert.equal(urls.filter((u) => u.includes("instagram.com")).length, 2);
  assert.equal(sameAsUrls([...withAparatSocial(SEEDED), { url: INSTITUTE_INSTAGRAM_URL }]).filter((u) => u.includes("setaregan.institutee")).length, 1);
});

test("only the old ghalamchi instagram handle is rewritten", () => {
  assert.equal(publicInstagramUrl("https://www.instagram.com/Ghalamchinasimshahr"), GHALAMCHI_INSTAGRAM_URL);
  assert.equal(publicInstagramUrl("https://instagram.com/Ghalamchinasimshahr/"), GHALAMCHI_INSTAGRAM_URL);
  assert.equal(publicInstagramUrl(INSTITUTE_INSTAGRAM_URL), INSTITUTE_INSTAGRAM_URL);
  assert.equal(publicInstagramUrl(GHALAMCHI_INSTAGRAM_URL), GHALAMCHI_INSTAGRAM_URL);
  assert.equal(publicInstagramUrl("https://ble.ir/ghalamchi1404"), "https://ble.ir/ghalamchi1404");
});
