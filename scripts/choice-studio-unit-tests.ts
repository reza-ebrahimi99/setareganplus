/**
 * Choice Studio unit tests. No database connection.
 */

import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { diffChoiceLists, labelDiffKind } from "../lib/guidance/choice-studio/diff";
import {
  excelSafeText,
  mapExcelHeader,
  normalizeChanceLabel,
  normalizeChoiceCode,
  normalizeCourse,
  normalizeDigits,
  normalizePersianText,
  normalizePriority,
} from "../lib/guidance/choice-studio/normalize";
import { parseChoiceWorkbook, previewRowsToInputs } from "../lib/guidance/choice-studio/excel";
import { validateCanonicalRows } from "../lib/guidance/choice-studio/validate";
import { resolveChoiceStudioState, labelChoiceStudioState } from "../lib/guidance/choice-studio/status";
import type { CanonicalChoiceRow } from "../lib/guidance/choice-studio/types";
import { validateChoiceDraftImportPayload } from "../lib/counselor-os/choice-draft-import-schema";

let passed = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  await fn();
  passed += 1;
  console.log(`✓ ${name}`);
}

function row(partial: Partial<CanonicalChoiceRow> & Pick<CanonicalChoiceRow, "sourceRow">): CanonicalChoiceRow {
  return {
    priority: 1,
    priorityRaw: "1",
    code: "12345",
    major: "مهندسی کامپیوتر",
    university: "دانشگاه تهران",
    city: "تهران",
    course: "روزانه",
    courseCode: "DAILY",
    description: "",
    chance: "medium",
    chanceRaw: "متوسط",
    counselorNote: "",
    formulaCell: false,
    ...partial,
  };
}

async function workbookFile(rows: string[][], sheets?: Array<{ name: string; rows: string[][] }>) {
  const workbook = new ExcelJS.Workbook();
  const write = (name: string, data: string[][]) => {
    const sheet = workbook.addWorksheet(name);
    for (const line of data) sheet.addRow(line);
  };
  if (sheets) {
    for (const sheet of sheets) write(sheet.name, sheet.rows);
  } else {
    write("انتخاب‌ها", rows);
  }
  const buf = Buffer.from(await workbook.xlsx.writeBuffer());
  return new File([buf], "choices.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

async function main() {
await test("Persian/Arabic digits and ye/ke normalize", () => {
  assert.equal(normalizeDigits("۱۲۳"), "123");
  assert.equal(normalizeDigits("١٢٣"), "123");
  assert.equal(normalizePersianText("دانشگاه پيام نور"), "دانشگاه پیام نور");
  assert.equal(normalizePersianText("كشاورزي"), "کشاورزی");
});

await test("header aliases map to canonical columns", () => {
  assert.equal(mapExcelHeader("ردیف"), "priority");
  assert.equal(mapExcelHeader("کدرشته محل"), "code");
  assert.equal(mapExcelHeader("نام دانشگاه"), "university");
  assert.equal(mapExcelHeader("chance"), "chance");
  assert.equal(mapExcelHeader("counselor note"), "counselorNote");
});

await test("choice codes stay literal after digit normalization", () => {
  assert.equal(normalizeChoiceCode("۰۱۲۳۴"), "01234");
  assert.equal(normalizeChoiceCode("  123-45 "), "12345");
});

await test("chance labels normalize and reject guarantees", () => {
  assert.equal(normalizeChanceLabel("خیلی خوب").id, "very_good");
  assert.equal(normalizeChanceLabel("خوش‌بینانه").id, "very_good");
  assert.equal(normalizeChanceLabel("قطعی").forbidden, true);
  assert.equal(normalizeChanceLabel("ناشناخته").unknown, true);
});

await test("course aliases map to education types", () => {
  assert.equal(normalizeCourse("شبانه").code, "NIGHT");
  assert.equal(normalizeCourse("روزانه").code, "DAILY");
});

await test("formula-looking text is neutralized on export", () => {
  assert.equal(excelSafeText("=HYPERLINK(1)"), "'=HYPERLINK(1)");
  assert.equal(excelSafeText("12345"), "12345");
});

await test("priority gaps warn but do not reorder", () => {
  const preview = validateCanonicalRows(
    [row({ sourceRow: 2, priority: 1 }), row({ sourceRow: 3, priority: 3, code: "999" })],
    "انتخاب‌ها",
  );
  assert.equal(preview.issues.some((i) => i.code === "priority_gap"), true);
  assert.equal(preview.canCommit, true);
  const inputs = previewRowsToInputs(preview.rows);
  assert.equal(inputs[0]?.officialCode, "12345");
  assert.equal(inputs[1]?.officialCode, "999");
});

await test("duplicate priorities are blocking", () => {
  const preview = validateCanonicalRows(
    [row({ sourceRow: 2, priority: 1 }), row({ sourceRow: 3, priority: 1, code: "222" })],
    "انتخاب‌ها",
  );
  assert.equal(preview.canCommit, false);
  assert.equal(preview.issues.some((i) => i.code === "duplicate_priority"), true);
});

await test("149 rows commit allowed", () => {
  const rows = Array.from({ length: 149 }, (_, i) =>
    row({ sourceRow: i + 2, priority: i + 1, code: String(10000 + i) }),
  );
  const preview = validateCanonicalRows(rows, "انتخاب‌ها");
  assert.equal(preview.canCommit, true);
  assert.equal(preview.overLimitCount, 0);
});

await test("150 rows commit allowed", () => {
  const rows = Array.from({ length: 150 }, (_, i) =>
    row({ sourceRow: i + 2, priority: i + 1, code: String(10000 + i) }),
  );
  const preview = validateCanonicalRows(rows, "انتخاب‌ها");
  assert.equal(preview.canCommit, true);
  assert.equal(preview.overLimitCount, 0);
});

await test("151 rows blocked with one extra", () => {
  const rows = Array.from({ length: 151 }, (_, i) =>
    row({ sourceRow: i + 2, priority: i + 1, code: String(10000 + i) }),
  );
  const preview = validateCanonicalRows(rows, "انتخاب‌ها");
  assert.equal(preview.canCommit, false);
  assert.equal(preview.overLimitCount, 1);
  assert.match(preview.issues.find((i) => i.code === "over_sanjesh_limit")?.message ?? "", /۱ مورد/);
});

await test("159 rows blocked with nine extra", () => {
  const rows = Array.from({ length: 159 }, (_, i) =>
    row({ sourceRow: i + 2, priority: i + 1, code: String(10000 + i) }),
  );
  const preview = validateCanonicalRows(rows, "انتخاب‌ها");
  assert.equal(preview.canCommit, false);
  assert.equal(preview.overLimitCount, 9);
});

await test("previewRowsToInputs preserves priority order", () => {
  const preview = validateCanonicalRows(
    [
      row({ sourceRow: 3, priority: 2, code: "222" }),
      row({ sourceRow: 2, priority: 1, code: "111" }),
    ],
    "انتخاب‌ها",
  );
  const inputs = previewRowsToInputs(preview.rows);
  assert.equal(inputs[0]?.officialCode, "111");
  assert.equal(inputs[1]?.officialCode, "222");
});

await test("diff engine classifies add/remove/move", () => {
  const initial = [
    { sortOrder: 1, officialCode: "A", major: "ریاضی", university: "تهران" },
    { sortOrder: 2, officialCode: "B", major: "فیزیک", university: "شریف" },
  ];
  const finals = [
    { sortOrder: 1, officialCode: "B", major: "فیزیک", university: "شریف" },
    { sortOrder: 2, officialCode: "C", major: "شیمی", university: "امیرکبیر" },
  ];
  const diff = diffChoiceLists(initial, finals);
  assert.equal(diff.added, 1);
  assert.equal(diff.removed, 1);
  assert.equal(diff.moved, 1);
  assert.equal(labelDiffKind("MOVED"), "جابه‌جا‌شده");
});

await test("product states never call initial ready final", () => {
  assert.equal(
    labelChoiceStudioState(resolveChoiceStudioState({ kind: "INITIAL", status: "READY" })),
    "نسخه اولیه — غیرنهایی",
  );
  assert.equal(
    labelChoiceStudioState(resolveChoiceStudioState({ kind: "FINAL", status: "CONFIRMED" })),
    "نسخه تأییدشده — آماده ثبت سنجش",
  );
});

await test("xlsx 1-row and alias headers parse", async () => {
  const file = await workbookFile([
    ["ردیف", "کدرشته", "نام رشته", "نام دانشگاه", "شهرستان", "نوع دوره", "شرایط", "شانس", "یادداشت"],
    ["۱", "۲۴۵۶۷", "مهندسی عمران", "دانشگاه تهران", "تهران", "روزانه", "", "متوسط", ""],
  ]);
  const preview = await parseChoiceWorkbook(file);
  assert.equal(preview.totalRows, 1);
  assert.equal(preview.rows[0]?.code, "24567");
  assert.equal(preview.canCommit, true);
});

await test("xlsx 10-row workbook parses in source order", async () => {
  const header = ["اولویت", "کد رشته", "رشته", "دانشگاه", "شهر", "دوره", "توضیحات", "برآورد شانس قبولی", "یادداشت مشاور"];
  const rows = [header];
  for (let i = 1; i <= 10; i += 1) {
    rows.push([String(i), String(20000 + i), `رشته ${i}`, "دانشگاه تهران", "تهران", "روزانه", "", "کم", ""]);
  }
  const preview = await parseChoiceWorkbook(await workbookFile(rows));
  assert.equal(preview.totalRows, 10);
  assert.equal(preview.rows[9]?.code, "20010");
});

await test("ambiguous multi-sheet workbooks are rejected", async () => {
  const header = ["اولویت", "کد رشته", "رشته", "دانشگاه", "شهر", "دوره"];
  const file = await workbookFile([], [
    { name: "A", rows: [header, ["1", "1", "ر", "د", "ت", "روزانه"]] },
    { name: "B", rows: [header, ["1", "2", "ر", "د", "ت", "روزانه"]] },
  ]);
  await assert.rejects(() => parseChoiceWorkbook(file), /چند شیت/);
});

await test("empty workbook is rejected in Persian", async () => {
  const file = await workbookFile([["اولویت", "کد رشته", "رشته", "دانشگاه", "دوره"]]);
  await assert.rejects(() => parseChoiceWorkbook(file), /هیچ ردیف/);
});

await test("normalizePriority accepts Persian digits", () => {
  assert.equal(normalizePriority("۱۵۰"), 150);
  assert.equal(normalizePriority("0"), null);
});

function draftRows(count: number): CanonicalChoiceRow[] {
  return Array.from({ length: count }, (_, i) =>
    row({
      sourceRow: i + 2,
      priority: i + 1,
      code: String(30000 + i),
      major: `رشته ${i + 1}`,
    }),
  );
}

await test("import API validation rejects 151 rows in full mode", () => {
  const v = validateChoiceDraftImportPayload({
    requestId: "req-12345678",
    kind: "INITIAL",
    mode: "full",
    truncateAck: false,
    replaceReady: false,
    rows: draftRows(151),
  });
  assert.equal(v.ok, false);
  if (!v.ok) assert.match(v.error, /151/);
});

await test("import API validation accepts 149 and 150 rows in full mode", () => {
  for (const n of [149, 150]) {
    const v = validateChoiceDraftImportPayload({
      requestId: "req-12345678",
      kind: "INITIAL",
      mode: "full",
      truncateAck: false,
      replaceReady: false,
      rows: draftRows(n),
    });
    assert.equal(v.ok, true);
    if (v.ok) assert.equal(v.importRows.length, n);
  }
});

await test("import API validation 159 rows requires truncate ack", () => {
  const noAck = validateChoiceDraftImportPayload({
    requestId: "req-12345678",
    kind: "INITIAL",
    mode: "truncate_first_150",
    truncateAck: false,
    replaceReady: false,
    rows: draftRows(159),
  });
  assert.equal(noAck.ok, false);

  const ok = validateChoiceDraftImportPayload({
    requestId: "req-12345678",
    kind: "INITIAL",
    mode: "truncate_first_150",
    truncateAck: true,
    replaceReady: false,
    rows: draftRows(159),
  });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.body.rows.length, 159);
    assert.equal(ok.importRows.length, 150);
    assert.equal(ok.importRows[0]?.priority, 1);
    assert.equal(ok.importRows[149]?.priority, 150);
  }
});

console.log(`\n${passed} Choice Studio tests passed`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
