import assert from "node:assert/strict";
import test from "node:test";
import { SEED_QUESTIONS, seedIsConsistent } from "./bank";
import { SKILLS, pathSkills } from "./catalog";
import { buildQueue, currentQuestion, type BankQ } from "./engine";

test("every seed puzzle has one key and a note on each other choice", () => {
  assert.equal(seedIsConsistent(), true);
  for (const skill of SKILLS) {
    const n = SEED_QUESTIONS.filter((item) => item.skill === skill.slug).length;
    assert.ok(n >= 10, `${skill.slug} has ${n}`);
  }
  const ids = SEED_QUESTIONS.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("a fifth-grader only walks skills taught by the end of grade 4", () => {
  const slugs = pathSkills(5, "").map((s) => s.slug);
  assert.deepEqual(slugs, ["add", "times", "mul", "frac", "simplify", "dec", "word"]);
  assert.equal(slugs.includes("neg"), false);
  assert.equal(slugs.includes("pct"), false);
  assert.equal(slugs.includes("order"), false);
  assert.equal(slugs.includes("pow"), false);
});

test("a ninth-grader stops at the end of grade 8", () => {
  const slugs = pathSkills(9, "").map((s) => s.slug);
  assert.equal(slugs.includes("neg"), true);
  assert.equal(slugs.includes("pow"), true);
  assert.equal(slugs.includes("exp"), true);
  assert.equal(slugs.includes("order"), true);
  assert.equal(slugs.includes("ratio"), true);
  assert.equal(slugs.includes("rat"), true);
  assert.equal(slugs.includes("ident"), false);
  assert.equal(slugs.includes("negexp"), false);
  assert.equal(slugs.includes("radical"), false);
  assert.equal(slugs.includes("ineq"), false);
  assert.equal(slugs.includes("line"), false);
  assert.equal(slugs.includes("quad"), false);
});

test("grade 12 is field-specific and never includes a grade-12 skill", () => {
  const riazi = pathSkills(12, "riazi").map((s) => s.slug);
  const tajrobi = pathSkills(12, "tajrobi").map((s) => s.slug);
  const ensani = pathSkills(12, "ensani").map((s) => s.slug);
  assert.equal(riazi.includes("lim"), true);
  assert.equal(riazi.includes("log"), true);
  assert.equal(tajrobi.includes("lim"), false);
  assert.equal(tajrobi.includes("log"), true);
  assert.equal(ensani.includes("trig"), false);
  assert.equal(ensani.includes("log"), false);
  assert.equal(ensani.includes("line"), true);
  for (const slug of riazi) {
    const skill = pathSkills(12, "riazi").find((s) => s.slug === slug)!;
    assert.ok(skill.taughtGrade <= 11);
  }
});

test("each journey draws its own subset and keeps it easy to hard", () => {
  const bank: BankQ[] = SEED_QUESTIONS.filter((item) => item.skill === "add").map((item) => ({
    id: item.id,
    skill: item.skill,
    stem: item.stem,
    explain: item.explain,
    options: item.options.map((o, j) => ({ id: `${item.id}-${j}`, text: o.text, correct: !!o.ok, misconception: o.miss ?? "" })),
  }));
  const a = buildQueue(5, "", bank, "seed-a");
  const again = buildQueue(5, "", bank, "seed-a");
  assert.deepEqual(a[0].ids, again[0].ids);
  assert.equal(a[0].ids.length, 3);
  const ranks = a[0].ids.map((id) => Number(id.split("-")[1]));
  assert.deepEqual(ranks, [...ranks].sort((x, y) => x - y));
  let differed = false;
  for (const seed of ["b", "c", "d", "e", "f", "g"]) {
    const other = buildQueue(5, "", bank, seed);
    if (other[0].ids.join() !== a[0].ids.join()) differed = true;
  }
  assert.equal(differed, true);
});

test("the public puzzle does not carry the key", () => {
  const bank: BankQ[] = SEED_QUESTIONS.slice(0, 3).map((item, i) => ({
    id: item.id,
    skill: item.skill,
    stem: item.stem,
    explain: item.explain,
    options: item.options.map((o, j) => ({ id: `${item.id}-${j}`, text: o.text, correct: !!o.ok, misconception: o.miss ?? "" })),
  }));
  const queue = buildQueue(5, "", bank);
  const pub = currentQuestion({ queue, cursor: 0, qIndex: 0, drilled: [], reveal: null }, new Map(bank.map((q) => [q.id, q])));
  assert.ok(pub);
  assert.equal(JSON.stringify(pub).includes("correct"), false);
  assert.equal(JSON.stringify(pub).includes("misconception"), false);
  assert.equal(pub!.options.some((o) => o.text === "هنوز به این نرسیدم"), true);
});
