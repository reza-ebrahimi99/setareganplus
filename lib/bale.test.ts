import assert from "node:assert/strict";
import test from "node:test";
import { BALE_ADMIN_CHAT_URL, BALE_CHANNEL_URL, baleShareUrl, isLegacyBaleJoin, publicBaleSocialUrl } from "./bale";

test("public channel and admin chat stay distinct canonical ble.ir links", () => {
  assert.equal(BALE_CHANNEL_URL, "https://ble.ir/ghalamchi1404");
  assert.equal(new URL(BALE_ADMIN_CHAT_URL).hostname, "ble.ir");
  assert.notEqual(BALE_ADMIN_CHAT_URL, BALE_CHANNEL_URL);
  assert.equal(new URL(BALE_ADMIN_CHAT_URL).search, "");
});

test("only the old channel invite is rewritten to the public page", () => {
  assert.equal(isLegacyBaleJoin("https://ble.ir/join/ANGRKipzkv"), true);
  assert.equal(isLegacyBaleJoin("https://ble.ir/join/angrkipzkv/"), true);
  assert.equal(publicBaleSocialUrl("https://ble.ir/join/ANGRKipzkv"), BALE_CHANNEL_URL);
  assert.equal(publicBaleSocialUrl("https://ble.ir/ghalamchi1404"), BALE_CHANNEL_URL);
  assert.equal(publicBaleSocialUrl("https://t.me/setareganinstitute1"), "https://t.me/setareganinstitute1");
  assert.equal(publicBaleSocialUrl("https://ble.ir/join/someoneelse"), "https://ble.ir/join/someoneelse");
});

test("share link is Bale's share endpoint with the page url and text", () => {
  const href = baleShareUrl("https://setareganplus.ir/news/x?ref=1", "عنوان تست");
  const u = new URL(href);
  assert.equal(u.origin + u.pathname, "https://ble.ir/share/url");
  assert.equal(u.searchParams.get("url"), "https://setareganplus.ir/news/x?ref=1");
  assert.equal(u.searchParams.get("text"), "عنوان تست");
});
