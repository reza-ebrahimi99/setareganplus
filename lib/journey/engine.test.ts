import assert from "node:assert/strict";
import test from "node:test";
import katex from "katex";
import { SEED_QUESTIONS, seedIsConsistent } from "./bank";
import { SKILLS, pathSkills, stationPoints } from "./catalog";
import { advance, answerTargetsCurrent, applyAnswer, buildQueue, currentQuestion, emptyState, isFinished, notesForStation, orderedOptionIds, stationMarks, type BankQ } from "./engine";
import { bareMathIssues, mathSegments, twinKey } from "./math";

function asBank(): BankQ[] {
  return SEED_QUESTIONS.map((item) => ({
    id: item.id,
    skill: item.skill,
    stem: item.stem,
    explain: item.explain,
    options: item.options.map((o, j) => ({ id: `${item.id}-${j}`, text: o.text, correct: !!o.ok, misconception: o.miss ?? "" })),
  }));
}

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

test("every puzzle keeps each formula in one isolated math node", () => {
  assert.equal(SEED_QUESTIONS.length, 260);
  for (const item of SEED_QUESTIONS) {
    const fields: [string, string][] = [
      ["stem", item.stem],
      ["explain", item.explain],
      ...item.options.flatMap((o, i) => [[`option ${i}`, o.text], [`miss ${i}`, o.miss ?? ""]] as [string, string][]),
    ];
    for (const [name, text] of fields) {
      const issues = bareMathIssues(text);
      assert.deepEqual(issues, [], `${item.id} ${name}: ${issues.join(", ")} in ${text}`);
      for (const seg of mathSegments(text)) {
        assert.doesNotThrow(() => katex.renderToString(seg, { throwOnError: true }), `${item.id} ${name}: ${seg}`);
      }
    }
  }
  const sub = SEED_QUESTIONS.find((item) => item.id === "add-2");
  const eq = SEED_QUESTIONS.find((item) => item.id === "eq-2");
  assert.match(sub?.stem ?? "", /\$90-36\$/);
  assert.match(eq?.stem ?? "", /\$2x=10\$/);
  assert.match(eq?.stem ?? "", /\$x\$/);
});

test("a journey never repeats a puzzle or its numeric twin", () => {
  const bank = asBank();
  const byId = new Map(bank.map((q) => [q.id, q]));
  const twins = new Map(bank.map((q) => [q.id, twinKey(q.stem)]));
  const bySkill = new Map<string, string[]>();
  for (const q of bank) {
    const list = bySkill.get(q.skill) ?? [];
    list.push(q.id);
    bySkill.set(q.skill, list);
  }
  for (const [grade, field] of [[5, ""], [9, ""], [12, "riazi"]] as const) {
    let state = emptyState(buildQueue(grade, field, bank, `once-${grade}-${field}`));
    const seen: string[] = [];
    let guard = 0;
    while (!isFinished(state) && guard < 500) {
      guard += 1;
      if (state.reveal) {
        state = advance(state, bySkill, 0, `once-${grade}`, twins);
        continue;
      }
      const pub = currentQuestion(state, byId);
      assert.ok(pub, `missing puzzle at ${grade}`);
      assert.equal(answerTargetsCurrent(state, pub.id), true);
      const later = state.queue[state.cursor + 1]?.ids[0];
      if (later) assert.equal(answerTargetsCurrent(state, later), false);
      seen.push(pub.id);
      const step = applyAnswer(state, byId, "__unknown");
      assert.ok(step.saved);
      state = step.state;
    }
    assert.equal(isFinished(state), true, `grade ${grade} did not finish`);
    assert.equal(new Set(seen).size, seen.length, `repeated id in grade ${grade}`);
    const keys = seen.map((id) => twinKey(byId.get(id)!.stem));
    assert.equal(new Set(keys).size, keys.length, `repeated twin in grade ${grade}: ${keys.join(" ")}`);
  }
});

test("only the open station can be answered, and the review names both keys", () => {
  const bank = asBank();
  const byId = new Map(bank.map((q) => [q.id, q]));
  const queue = buildQueue(5, "", bank, "review");
  const state = emptyState(queue);
  assert.equal(answerTargetsCurrent(state, queue[0].ids[0]), true);
  assert.equal(answerTargetsCurrent(state, queue[1].ids[0]), false);
  assert.equal(answerTargetsCurrent({ ...state, reveal: { skill: "add", drill: false, notes: [] } }, queue[0].ids[0]), false);
  const q = byId.get("add-2")!;
  const wrong = q.options.find((o) => !o.correct)!;
  const notes = notesForStation({ skill: "add", ids: ["add-2"], drill: false }, byId, [{ questionId: "add-2", optionId: wrong.id, unknown: false, correct: false }]);
  assert.equal(notes.length, 1);
  assert.equal(notes[0].picked, wrong.text);
  assert.equal(notes[0].correct, "$54$");
  assert.match(notes[0].stem, /\$90-36\$/);
});

test("map markers are one point per station along the downward trail", () => {
  for (const n of [7, 16, 26]) {
    const pts = stationPoints(n);
    assert.equal(pts.length, n);
    for (let i = 0; i < pts.length; i++) {
      assert.ok(pts[i].x > 30 && pts[i].x < 70, `x ${pts[i].x}`);
      assert.ok(pts[i].y > 10 && pts[i].y < 90, `y ${pts[i].y}`);
      if (i) assert.ok(pts[i].y >= pts[i - 1].y - 0.01);
    }
  }
});

test("a prerequisite drill does not send the map pin back to the first station", () => {
  const skills = ["add", "times", "mul", "frac", "word", "dec"];
  let state = emptyState(skills.map((skill) => ({ skill, ids: [`${skill}-1`], drill: false })));
  const bank = new Map(skills.map((skill) => [skill, [`${skill}-1`, `${skill}-8`, `${skill}-9`]]));
  for (let i = 0; i < 4; i++) state = advance(state, bank, 1, "resume");
  state = advance(state, bank, 0, "resume");
  assert.equal(state.queue[state.cursor]?.drill, true);
  assert.equal(state.queue[state.cursor]?.skill, "add");
  const marks = stationMarks(state.queue, state.cursor, false);
  assert.deepEqual(marks.map((mark) => [mark.slug, mark.state]), [
    ["add", "passed"],
    ["times", "passed"],
    ["mul", "passed"],
    ["frac", "passed"],
    ["word", "passed"],
    ["dec", "now"],
  ]);
});

test("the correct choice moves around and grading still follows the option id", () => {
  const bank = asBank().filter((q) => q.options.length === 4);
  const parked = bank.filter((q) => q.options.findIndex((o) => o.correct) === 1).length;
  assert.ok(parked / bank.length > 0.9);
  const counts = [0, 0, 0, 0];
  let samples = 0;
  for (let j = 0; j < 24; j++) {
    const journey = `journey-${j}`;
    for (const q of bank) {
      const ids = q.options.map((o) => o.id);
      const order = orderedOptionIds(ids, `${journey}:${q.id}`);
      assert.deepEqual(order, orderedOptionIds(ids, `${journey}:${q.id}`));
      assert.equal(new Set(order).size, 4);
      const at = order.findIndex((id) => q.options.find((o) => o.id === id)?.correct);
      counts[at] += 1;
      samples += 1;
    }
  }
  for (const [i, n] of counts.entries()) {
    const share = n / samples;
    assert.ok(share > 0.18 && share < 0.32, `slot ${i} held the key ${share.toFixed(3)} of the time`);
  }
  const q = bank.find((item) => item.id === "add-2")!;
  const order = orderedOptionIds(q.options.map((o) => o.id), "old-run:add-2");
  const correct = q.options.find((o) => o.correct)!;
  const wrongId = order.find((id) => id !== correct.id)!;
  const state = { queue: [{ skill: "add", ids: ["add-2"], drill: false }], cursor: 0, qIndex: 0, drilled: [] as string[], reveal: null, optionOrder: { "add-2": order } };
  const map = new Map([[q.id, q]]);
  const pub = currentQuestion(state, map, "different-seed-must-not-override-stored-order");
  assert.deepEqual(pub!.options.slice(0, 4).map((o) => o.id), order);
  assert.equal(JSON.stringify(pub).includes("correct"), false);
  assert.equal(JSON.stringify(pub).includes("misconception"), false);
  assert.equal(applyAnswer(state, map, correct.id).saved?.correct, true);
  assert.equal(applyAnswer(state, map, wrongId).saved?.correct, false);
  const legacy = { queue: state.queue, cursor: 0, qIndex: 0, drilled: [] as string[], reveal: null };
  assert.equal(applyAnswer(legacy, map, correct.id).saved?.correct, true);
  assert.equal(applyAnswer(legacy, map, wrongId).saved?.correct, false);
  assert.deepEqual(currentQuestion(legacy, map, "old-run")!.options.slice(0, 4).map((o) => o.id), order);
  const notes = notesForStation(state.queue[0], map, [{ questionId: "add-2", optionId: wrongId, unknown: false, correct: false }]);
  assert.equal(notes[0].picked, q.options.find((o) => o.id === wrongId)!.text);
  assert.equal(notes[0].correct, correct.text);
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
