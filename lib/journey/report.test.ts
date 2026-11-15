import assert from "node:assert/strict";
import test from "node:test";
import { STUDENT_COPY } from "./cheers";
import { puzzleDuration } from "./engine";
import { buildJourneyReport, journeyHighlights, type ReportAnswer, type ReportInput } from "./report";

const BANNED = ["آزمون", "سؤال", "نمره", "کارنامه", "تشخیصی", "پایه قبل", "پایه‌های قبل", "پایهٔ قبل"];

function answer(partial: Partial<ReportAnswer> & Pick<ReportAnswer, "skillSlug" | "correct">): ReportAnswer {
  return {
    id: partial.id ?? partial.skillSlug + (partial.questionId ?? ""),
    questionId: partial.questionId ?? partial.id ?? partial.skillSlug,
    skillSlug: partial.skillSlug,
    optionId: partial.optionId ?? "",
    correct: partial.correct,
    unknown: partial.unknown ?? false,
    misconception: partial.misconception ?? "",
    drill: partial.drill ?? false,
    createdAt: partial.createdAt ?? new Date("2026-11-15T08:00:00Z"),
    durationMs: partial.durationMs === undefined ? 12_000 : partial.durationMs,
  };
}

function input(answers: ReportAnswer[], extra: Partial<ReportInput> = {}): ReportInput {
  return {
    name: "کیمیا رضایی",
    grade: 5,
    field: "",
    school: "ستارگان",
    mobile: "09120000000",
    parentMobile: "",
    status: "DONE",
    followUp: "NEW",
    createdAt: new Date("2026-11-15T07:50:00Z"),
    finishedAt: new Date("2026-11-15T08:40:00Z"),
    adminNote: "",
    state: { queue: [], cursor: 0 },
    answers,
    questions: new Map([
      ["f1", { stem: "حاصل $\\dfrac{1}{2}+\\dfrac{1}{3}$ کدام است؟", explain: "مخرج مشترک لازم است.", options: [{ id: "a", text: "$\\dfrac{2}{5}$", correct: false }, { id: "b", text: "$\\dfrac{5}{6}$", correct: true }] }],
      ["f2", { stem: "حاصل $\\dfrac{1}{4}+\\dfrac{1}{4}$ کدام است؟", explain: "مخرج یکی است.", options: [{ id: "a", text: "$\\dfrac{2}{8}$", correct: false }, { id: "b", text: "$\\dfrac{1}{2}$", correct: true }] }],
    ]),
    ...extra,
  };
}

test("student copy stays in adventure language", () => {
  for (const word of BANNED) assert.equal(STUDENT_COPY.includes(word), false, word);
  assert.ok(STUDENT_COPY.includes("خودت را بهتر بشناسی"));
  assert.ok(STUDENT_COPY.includes("ستاره جمع کن"));
});

test("a missing clock and a long tab do not invent a wild time", () => {
  assert.equal(puzzleDuration(null), null);
  assert.equal(puzzleDuration(undefined), null);
  assert.equal(puzzleDuration(1_000, 4_000), 3_000);
  assert.equal(puzzleDuration(0, 2 * 60 * 60_000), 30 * 60_000);
});

test("the report names the earliest weak skill and the private-class rule", () => {
  const t0 = new Date("2026-11-15T08:00:00Z").getTime();
  const at = (min: number) => new Date(t0 + min * 60_000);
  const answers: ReportAnswer[] = [
    ...[0, 1, 2].map((i) => answer({ skillSlug: "add", correct: true, createdAt: at(i), questionId: `a${i}` })),
    ...[0, 1, 2].map((i) => answer({ skillSlug: "times", correct: true, createdAt: at(3 + i), questionId: `t${i}` })),
    answer({ skillSlug: "mul", correct: true, createdAt: at(6), questionId: "m0" }),
    answer({ skillSlug: "mul", correct: true, createdAt: at(7), questionId: "m1" }),
    answer({ skillSlug: "mul", correct: false, createdAt: at(8), questionId: "m2", misconception: "ضرب با جمع عوض شده" }),
    answer({ skillSlug: "frac", correct: false, createdAt: at(30), questionId: "f1", optionId: "a", durationMs: 1_500, misconception: "صورت و مخرج را جدا جمع می‌کند" }),
    answer({ skillSlug: "frac", correct: false, createdAt: at(31), questionId: "f2", optionId: "a", misconception: "صورت و مخرج را جدا جمع می‌کند" }),
    answer({ skillSlug: "frac", correct: false, unknown: true, createdAt: at(32), questionId: "f3", durationMs: null }),
    answer({ skillSlug: "dec", correct: false, createdAt: at(33), questionId: "d0", durationMs: 120_000, misconception: "ممیز جا مانده" }),
    answer({ skillSlug: "dec", correct: false, createdAt: at(34), questionId: "d1", misconception: "ممیز جا مانده" }),
    answer({ skillSlug: "dec", correct: true, createdAt: at(35), questionId: "d2" }),
    ...[0, 1, 2].map((i) => answer({ skillSlug: "word", correct: true, createdAt: at(36 + i), questionId: `w${i}`, durationMs: i === 0 ? null : 10_000 })),
  ];
  const report = buildJourneyReport(input(answers));
  assert.equal(report.root?.slug, "frac");
  assert.ok(report.chain.find((c) => c.slug === "frac")?.explains.includes("اعشار"));
  assert.equal(report.recommendation, "کلاس خصوصی");
  assert.ok(report.summary.length >= 3 && report.summary.length <= 5);
  assert.equal(report.misconceptions[0]?.tag, "صورت و مخرج را جدا جمع می‌کند");
  assert.equal(report.misconceptions[0]?.items[0]?.correctText, "$\\dfrac{5}{6}$");
  assert.equal(report.fast.length, 1);
  assert.equal(report.slow.length, 1);
  assert.equal(report.skips.length, 1);
  assert.equal(report.pauses.length, 1);
  assert.ok(report.untimed >= 1);
  assert.equal(report.weeks.length, 4);
  assert.ok(report.parent.length >= 3);
  assert.equal(report.topics[0]?.title, "کسر");
  const badge = journeyHighlights(5, "", answers);
  assert.equal(badge.rootTitle, "کسر");
  assert.equal(badge.topMisconception, "صورت و مخرج را جدا جمع می‌کند");
});

test("a confident path recommends a single conversation", () => {
  const answers = ["add", "times", "mul", "frac", "simplify", "dec", "word"].flatMap((skill) =>
    [0, 1, 2].map((i) => answer({ skillSlug: skill, correct: true, questionId: `${skill}${i}`, durationMs: 15_000 })),
  );
  const report = buildJourneyReport(input(answers));
  assert.equal(report.root, null);
  assert.equal(report.recommendation, "جلسه مشاوره");
});
