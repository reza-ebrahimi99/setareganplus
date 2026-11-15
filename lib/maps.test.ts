import assert from "node:assert/strict";
import test from "node:test";
import { GIRLS_BRANCH_ADDRESS, GIRLS_MAP_URL, googleMapsSearchUrl, isLegacyGirlsMap, withPublicMap } from "./maps";

test("girls map link searches the address written on the site", () => {
  const url = new URL(GIRLS_MAP_URL);
  assert.equal(url.origin + url.pathname, "https://www.google.com/maps/search/");
  assert.equal(url.searchParams.get("api"), "1");
  assert.equal(url.searchParams.get("query"), GIRLS_BRANCH_ADDRESS);
  assert.equal(GIRLS_BRANCH_ADDRESS.includes("کوچه پاییزان"), true);
  assert.equal(GIRLS_BRANCH_ADDRESS.includes("پلاک ۱۸۸"), true);
});

test("legacy girls short link is replaced and the boys place link is kept", () => {
  const girls = withPublicMap({
    name: "شعبه دختران",
    address: GIRLS_BRANCH_ADDRESS,
    mapUrl: "https://maps.app.goo.gl/b8b8v3bMTGksEUhMA?g_st=ac",
  });
  assert.equal(girls.mapUrl, googleMapsSearchUrl(GIRLS_BRANCH_ADDRESS));
  assert.equal(isLegacyGirlsMap(girls.mapUrl!), false);

  const boysUrl = "https://maps.app.goo.gl/jKQLs65S6Jv8MfKv8?g_st=ac";
  const boys = withPublicMap({ name: "شعبه پسران", address: "نسیم‌شهر، خیابان امام خمینی، بین بانک مسکن و کلانتری، کوچه مدرسه، پلاک ۵", mapUrl: boysUrl });
  assert.equal(boys.mapUrl, boysUrl);
  assert.equal(isLegacyGirlsMap(boysUrl), false);
});
