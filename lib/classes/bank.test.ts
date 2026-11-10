import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { courseForChapter, normalizeBankItem, pickForStudent, sourceLabel } from "./bank";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("chapter titles land on the ten topic courses", () => {
  assert.equal(courseForChapter("فصل 4: مشتق"), "moshtagh");
  assert.equal(courseForChapter("فصل 5: کاربرد مشتق"), "moshtagh");
  assert.equal(courseForChapter("فصل 5: حد و پیوستگی"), "had");
  assert.equal(courseForChapter("فصل 3: حد بی‌نهایت و حد در بی‌نهایت"), "had");
  assert.equal(courseForChapter("فصل 2: مثلثات"), "mosallasat");
  assert.equal(courseForChapter("درس 2: سهمی"), "moadele");
  assert.equal(courseForChapter("فصل 1: معادلهٔ درجه دوم"), "moadele");
  assert.equal(courseForChapter("درس 5: آشنایی با هندسهٔ تحلیلی"), "hendese");
  assert.equal(courseForChapter("فصل 2: آشنایی با مقاطع مخروطی"), "hendese");
  assert.equal(courseForChapter("فصل 6: شمارش، بدون شمردن"), "shomaresh");
  assert.equal(courseForChapter("فصل 2: احتمال"), "shomaresh");
  assert.equal(courseForChapter("فصل 3: ترکیبیات (شمارش)"), "shomaresh");
  assert.equal(courseForChapter("فصل 1: مجموعه، الگو و دنباله"), "donbale");
  assert.equal(courseForChapter("فصل 3: توابع نمایی و لگاریتمی"), "logaritm");
  assert.equal(courseForChapter("فصل 1: تابع"), "tabe");
  assert.equal(courseForChapter("فصل 1: تبدیل نمودار توابع"), "tabe");
  assert.equal(courseForChapter("فصل 2: آمار توصیفی"), null);
  assert.equal(courseForChapter("فصل 1: محاسبات سریع"), null);
});

test("sample file normalizes, skips review, and keeps a polite source", () => {
  const rows = JSON.parse(readFileSync(path.join(root, "prisma/class-seed/qbank-sample.json"), "utf8")) as Parameters<typeof normalizeBankItem>[0][];
  const ok = rows.map(normalizeBankItem).filter((x) => x);
  assert.ok(ok.length >= 100);
  assert.equal(normalizeBankItem({ ...rows[0], needs_review: true }), null);
  assert.equal(sourceLabel("Ghalamchi", 1403, ""), "آزمون قلم‌چی 1403");
  assert.equal(sourceLabel("Other", 1403, "internal"), "");
  const withImage = ok.find((q) => q!.image);
  assert.ok(withImage);
  assert.equal(withImage!.options.filter((o) => o.correct).length, 1);
  const trig = pickForStudent(
    [
      { field: "riazi", difficulty: 1 },
      { field: "riazi", difficulty: 3 },
      { field: "ensani", difficulty: 2 },
    ],
    2,
    "riazi",
    () => 0,
  );
  assert.equal(trig.length, 2);
  assert.ok(trig.every((q) => q.field === "riazi"));
});
