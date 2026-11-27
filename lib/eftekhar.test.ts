import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { EFTEKHAR, EFTEKHAR_GROUPS, EFTEKHAR_POSTER, eftekharAlt, eftekharCaption, eftekharCounts, eftekharPhoto } from "./eftekhar";

const pub = (p: string) => join(process.cwd(), "public", p);

test("every student on the 1405 poster is listed once, with both photo sizes", () => {
  assert.equal(EFTEKHAR.length, 45);
  assert.equal(new Set(EFTEKHAR.map((s) => s.slug)).size, EFTEKHAR.length);
  assert.equal(new Set(EFTEKHAR.map((s) => s.name)).size, EFTEKHAR.length);
  for (const s of EFTEKHAR) {
    assert.ok(existsSync(pub(eftekharPhoto(s))), s.slug);
    assert.ok(existsSync(pub(eftekharPhoto(s, 240))), `${s.slug}-240`);
    assert.ok(EFTEKHAR_GROUPS[s.group], s.slug);
    assert.doesNotMatch(s.name + s.major + s.uni, /[يك]/, "Persian ی/ک only");
  }
  assert.ok(existsSync(pub(EFTEKHAR_POSTER.src)) && existsSync(pub(EFTEKHAR_POSTER.large)));
});

test("featured cards are the 13 big poster cards and featured come first", () => {
  const f = EFTEKHAR.filter((s) => s.featured);
  assert.equal(f.length, 13);
  assert.ok(EFTEKHAR.slice(0, 13).every((s) => s.featured));
  assert.equal(eftekharCaption(f[0]), "پزشکی دانشگاه ایران");
});

test("alt text reads «نام — رشته دانشگاه — قلم‌چی نسیم‌شهر»", () => {
  const s = EFTEKHAR.find((x) => x.slug === "amirhossein-omidi")!;
  assert.equal(eftekharAlt(s), "امیرحسین امیدی — دندان‌پزشکی دانشگاه تهران — قلم‌چی نسیم‌شهر");
});

test("group counts add up", () => {
  const c = eftekharCounts();
  assert.equal(Object.values(c).reduce((a, b) => a + b, 0), EFTEKHAR.length);
  assert.deepEqual(c, { riazi: 13, tajrobi: 9, ensani: 10, farhangian: 11, honar: 1, zaban: 1 });
});
