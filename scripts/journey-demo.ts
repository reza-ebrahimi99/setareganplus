/**
 * Local screenshot fixture only. Never call this from production seed.
 *   JOURNEY_DEMO=1 npx tsx scripts/journey-demo.ts
 */
import { prisma } from "../lib/prisma";
import { SEED_QUESTIONS } from "../lib/journey/bank";
import { SKILLS, pathSkills } from "../lib/journey/catalog";

if (process.env.JOURNEY_DEMO !== "1") {
  console.error("Refusing to write a demo journey. Set JOURNEY_DEMO=1 on a local database only.");
  process.exit(1);
}

const MOBILE = "09127770009";
const host = process.env.DATABASE_URL ?? "";
if (!/127\.0\.0\.1|localhost/.test(host)) {
  console.error("Refusing to seed a demo journey outside localhost.");
  process.exit(1);
}

type Mode = "ok" | "wrong" | "skip" | "fast" | "slow";
const PLAN: Record<string, Mode[]> = {
  add: ["ok", "ok", "ok"],
  times: ["ok", "ok", "ok"],
  mul: ["ok", "ok", "wrong"],
  frac: ["wrong", "wrong", "skip"],
  simplify: ["wrong", "ok", "wrong"],
  dec: ["wrong", "slow", "wrong"],
  word: ["ok", "ok", "ok"],
  pct: ["wrong", "skip", "wrong"],
  order: ["ok", "ok", "fast"],
  ratio: ["wrong", "ok", "wrong"],
  neg: ["ok", "ok", "ok"],
  pow: ["wrong", "wrong", "ok"],
  exp: ["ok", "wrong", "ok"],
  alg: ["ok", "ok", "wrong"],
  eq: ["wrong", "ok", "wrong"],
  rat: ["ok", "fast", "ok"],
};

const MS: Record<Mode, number | null> = { ok: 14_000, wrong: 22_000, skip: 6_000, fast: 1_600, slow: 110_000 };

async function main() {
  for (const skill of SKILLS) {
    await prisma.journeySkill.upsert({
      where: { slug: skill.slug },
      create: { slug: skill.slug, title: skill.title, taughtGrade: skill.taughtGrade, sortOrder: skill.sortOrder, prereqSlug: skill.prereq ?? null, courseSlug: skill.courseSlug ?? null, fields: skill.fields },
      update: { title: skill.title, taughtGrade: skill.taughtGrade, sortOrder: skill.sortOrder, prereqSlug: skill.prereq ?? null, courseSlug: skill.courseSlug ?? null, fields: skill.fields },
    });
  }
  const skills = pathSkills(9, "");
  const queue: { skill: string; ids: string[]; drill: boolean }[] = [];
  const answers: { questionId: string; skillSlug: string; optionId: string; correct: boolean; unknown: boolean; misconception: string; durationMs: number | null; createdAt: Date }[] = [];
  let clock = new Date("2026-11-10T08:00:00Z").getTime();
  for (const skill of skills) {
    const pool = SEED_QUESTIONS.filter((q) => q.skill === skill.slug).slice(0, 3);
    const modes = PLAN[skill.slug] ?? ["ok", "ok", "ok"];
    const ids: string[] = [];
    if (skill.slug === "pct") clock += 18 * 60_000;
    for (let i = 0; i < pool.length; i++) {
      const item = pool[i];
      ids.push(item.id);
      await prisma.journeyQuestion.upsert({
        where: { id: item.id },
        create: { id: item.id, skillSlug: item.skill, stem: item.stem, explain: item.explain, sortOrder: i + 1 },
        update: { stem: item.stem, explain: item.explain },
      });
      for (let j = 0; j < item.options.length; j++) {
        const o = item.options[j];
        await prisma.journeyOption.upsert({
          where: { id: `${item.id}-${j}` },
          create: { id: `${item.id}-${j}`, questionId: item.id, text: o.text, correct: !!o.ok, misconception: o.miss ?? "", sortOrder: j },
          update: { text: o.text, correct: !!o.ok, misconception: o.miss ?? "" },
        });
      }
      const mode = modes[i] ?? "ok";
      const wrong = item.options.find((o) => !o.ok);
      const right = item.options.find((o) => o.ok);
      const picked = mode === "ok" || mode === "slow" ? right : mode === "skip" ? null : wrong;
      const index = picked ? item.options.indexOf(picked) : 0;
      clock += 40_000;
      answers.push({
        questionId: item.id,
        skillSlug: skill.slug,
        optionId: mode === "skip" ? "" : `${item.id}-${index}`,
        correct: mode === "ok" || mode === "slow",
        unknown: mode === "skip",
        misconception: mode === "wrong" || mode === "fast" ? wrong?.miss ?? "" : "",
        durationMs: MS[mode],
        createdAt: new Date(clock),
      });
    }
    queue.push({ skill: skill.slug, ids, drill: false });
  }
  await prisma.journeyRun.deleteMany({ where: { mobile: MOBILE } });
  const run = await prisma.journeyRun.create({
    data: {
      name: "کیمیا رضایی",
      mobile: MOBILE,
      parentMobile: "09120000456",
      grade: 9,
      field: "",
      school: "ستارگان نسیم‌شهر",
      status: "DONE",
      followUp: "NEW",
      adminNote: "قرار شد هفتهٔ بعد روی کسر، با مادر هماهنگ کنیم.",
      fresh: true,
      createdAt: new Date("2026-11-10T07:55:00Z"),
      finishedAt: new Date(clock + 60_000),
      state: { queue, cursor: queue.length, qIndex: 0, drilled: [], reveal: null, shownAt: null },
      answers: { create: answers },
    },
  });
  console.log(run.id);
}

main().finally(() => prisma.$disconnect());
