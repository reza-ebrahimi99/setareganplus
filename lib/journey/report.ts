import { fa } from "@/lib/format";
import { FIELD_LABEL, FOLLOW, GRADE_LABEL, pathSkills, skillBySlug, statusOf, type StatusId } from "./catalog";

const BOOK = ["", "اول", "دوم", "سوم", "چهارم", "پنجم", "ششم", "هفتم", "هشتم", "نهم", "دهم", "یازدهم", "دوازدهم"];
const FAST_MS = 4_000;
const SLOW_MS = 90_000;
const PAUSE_MS = 8 * 60_000;

export type ReportStatus = StatusId | "none";

export const REPORT_STATUS: Record<ReportStatus, string> = {
  strong: "مسلط",
  mid: "نیاز به تمرین",
  grow: "پایه ضعیف",
  none: "هنوز طی نشده",
};

export type ReportQuestion = {
  stem: string;
  explain: string;
  options: { id: string; text: string; correct: boolean }[];
};

export type ReportAnswer = {
  id: string;
  questionId: string;
  skillSlug: string;
  optionId: string;
  correct: boolean;
  unknown: boolean;
  misconception: string;
  drill: boolean;
  createdAt: Date;
  durationMs: number | null;
};

export type ReportInput = {
  name: string;
  grade: number;
  field: string;
  school: string;
  mobile: string;
  parentMobile: string;
  status: string;
  followUp: string;
  createdAt: Date;
  finishedAt: Date | null;
  adminNote: string;
  state: { queue?: { skill: string; ids: string[]; drill: boolean }[]; cursor?: number };
  answers: ReportAnswer[];
  questions: Map<string, ReportQuestion>;
};

export type SkillRow = {
  slug: string;
  title: string;
  taughtGrade: number;
  book: string;
  correct: number;
  total: number;
  ratio: number;
  status: ReportStatus;
  label: string;
  avgMs: number | null;
  avgLabel: string;
  unknown: number;
};

export type ChainLink = {
  slug: string;
  title: string;
  status: ReportStatus;
  weak: boolean;
  explains: string[];
};

export type MissItem = {
  stem: string;
  picked: string;
  correctText: string;
  explain: string;
  skillTitle: string;
  skillSlug: string;
};

export type MissGroup = { tag: string; count: number; items: MissItem[] };

export type LogRow = {
  stem: string;
  explain: string;
  picked: string;
  correctText: string;
  correct: boolean;
  unknown: boolean;
  misconception: string;
  durationLabel: string;
  options: { text: string; correct: boolean; picked: boolean }[];
};

export type Topic = { title: string; why: string; prompts: string[] };

export type JourneyReport = {
  who: string;
  gradeLabel: string;
  fieldLabel: string;
  school: string;
  followLabel: string;
  whenLabel: string;
  wallLabel: string;
  activeLabel: string;
  puzzles: number;
  drills: number;
  correct: number;
  unknown: number;
  summary: string[];
  skills: SkillRow[];
  root: SkillRow | null;
  chain: ChainLink[];
  chainNotes: string[];
  misconceptions: MissGroup[];
  fast: { skill: string; stem: string; durationLabel: string }[];
  slow: { skill: string; stem: string; durationLabel: string }[];
  skips: { skill: string; stem: string }[];
  pauses: string[];
  stopped: string;
  changeNote: string;
  timed: number;
  untimed: number;
  stations: { title: string; drill: boolean; rows: LogRow[] }[];
  topics: Topic[];
  weeks: { title: string; text: string }[];
  recommendation: "کلاس تقویتی" | "کلاس خصوصی" | "جلسه مشاوره";
  recommendationWhy: string;
  parent: string[];
};

export type JourneyHighlight = { rootTitle: string | null; topMisconception: string | null };

function joinFa(items: string[]) {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} و ${items[1]}`;
  return `${items.slice(0, -1).join("، ")} و ${items[items.length - 1]}`;
}

export function formatDuration(ms: number | null | undefined) {
  if (ms == null) return "ثبت نشده";
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${fa(s)} ثانیه`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${fa(m)} دقیقه و ${fa(r)} ثانیه` : `${fa(m)} دقیقه`;
}

function formatSpan(ms: number) {
  const m = Math.max(0, Math.round(ms / 60_000));
  if (m < 60) return `${fa(m)} دقیقه`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${fa(h)} ساعت و ${fa(r)} دقیقه` : `${fa(h)} ساعت`;
}

function bookOf(grade: number) {
  return BOOK[grade] ? `کتاب ${BOOK[grade]}` : "کتاب";
}

function ancestors(slug: string) {
  const out: string[] = [];
  let cur = skillBySlug(slug)?.prereq;
  const seen = new Set<string>();
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    out.push(cur);
    cur = skillBySlug(cur)?.prereq;
  }
  return out;
}

function skillRows(input: ReportInput): SkillRow[] {
  return pathSkills(input.grade, input.field).map((skill) => {
    const main = input.answers.filter((a) => a.skillSlug === skill.slug && !a.drill);
    const timed = main.map((a) => a.durationMs).filter((n): n is number => typeof n === "number");
    const correct = main.filter((a) => a.correct).length;
    const total = main.length;
    const ratio = total ? correct / total : 0;
    const status: ReportStatus = total ? statusOf(ratio) : "none";
    const avgMs = timed.length ? Math.round(timed.reduce((s, n) => s + n, 0) / timed.length) : null;
    return {
      slug: skill.slug,
      title: skill.title,
      taughtGrade: skill.taughtGrade,
      book: bookOf(skill.taughtGrade),
      correct,
      total,
      ratio,
      status,
      label: REPORT_STATUS[status],
      avgMs,
      avgLabel: formatDuration(avgMs),
      unknown: main.filter((a) => a.unknown).length,
    };
  });
}

function rootOf(skills: SkillRow[]) {
  return skills
    .filter((s) => s.status === "grow")
    .sort((a, b) => a.taughtGrade - b.taughtGrade || (skillBySlug(a.slug)?.sortOrder ?? 0) - (skillBySlug(b.slug)?.sortOrder ?? 0))[0] ?? null;
}

export function journeyHighlights(grade: number, field: string, answers: Pick<ReportAnswer, "skillSlug" | "correct" | "drill" | "unknown" | "misconception">[]): JourneyHighlight {
  const report = buildJourneyReport({
    name: "",
    grade,
    field,
    school: "",
    mobile: "",
    parentMobile: "",
    status: "DONE",
    followUp: "NEW",
    createdAt: new Date(0),
    finishedAt: new Date(0),
    adminNote: "",
    state: {},
    answers: answers.map((a, i) => ({
      id: String(i),
      questionId: String(i),
      skillSlug: a.skillSlug,
      optionId: "",
      correct: a.correct,
      unknown: a.unknown,
      misconception: a.misconception,
      drill: a.drill,
      createdAt: new Date(i),
      durationMs: null,
    })),
    questions: new Map(),
  });
  return { rootTitle: report.root?.title ?? null, topMisconception: report.misconceptions[0]?.tag ?? null };
}

function decorate(answer: ReportAnswer, questions: Map<string, ReportQuestion>): LogRow {
  const q = questions.get(answer.questionId);
  const picked = answer.unknown ? "هنوز به این نرسیدم" : q?.options.find((o) => o.id === answer.optionId)?.text ?? "—";
  const correctText = q?.options.find((o) => o.correct)?.text ?? "—";
  return {
    stem: q?.stem ?? "معما در بانک پیدا نشد",
    explain: q?.explain ?? "",
    picked,
    correctText,
    correct: answer.correct,
    unknown: answer.unknown,
    misconception: answer.misconception,
    durationLabel: formatDuration(answer.durationMs),
    options: (q?.options ?? []).map((o) => ({ text: o.text, correct: o.correct, picked: !answer.unknown && o.id === answer.optionId })),
  };
}

export function buildJourneyReport(input: ReportInput): JourneyReport {
  const answers = [...input.answers].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const skills = skillRows({ ...input, answers });
  const root = rootOf(skills);
  const weak = new Set(skills.filter((s) => s.status === "grow").map((s) => s.slug));
  const chain: ChainLink[] = skills.map((s) => ({ slug: s.slug, title: s.title, status: s.status, weak: s.status === "grow", explains: [] as string[] }));
  for (const link of chain) {
    if (!link.weak) continue;
    const line = ancestors(link.slug);
    const earliest = [...line].reverse().find((slug) => weak.has(slug));
    if (!earliest || earliest === link.slug) continue;
    const host = chain.find((c) => c.slug === earliest);
    if (host && !host.explains.includes(link.title)) host.explains.push(link.title);
  }
  const chainNotes = chain
    .filter((c) => c.explains.length)
    .map((c) => `ضعف در «${c.title}» این‌ها را هم سست کرده است: ${joinFa(c.explains)}.`);

  const missItems: { tag: string; item: MissItem }[] = [];
  for (const answer of answers) {
    if (answer.correct || answer.unknown) continue;
    const row = decorate(answer, input.questions);
    const tag = answer.misconception.trim() || "سرنخ بدون برچسب";
    missItems.push({
      tag,
      item: { stem: row.stem, picked: row.picked, correctText: row.correctText, explain: row.explain, skillTitle: skillBySlug(answer.skillSlug)?.title ?? answer.skillSlug, skillSlug: answer.skillSlug },
    });
  }
  const grouped = new Map<string, MissItem[]>();
  for (const row of missItems) {
    const list = grouped.get(row.tag) ?? [];
    list.push(row.item);
    grouped.set(row.tag, list);
  }
  const misconceptions: MissGroup[] = [...grouped.entries()]
    .map(([tag, items]) => ({ tag, count: items.length, items }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "fa"));

  const fast = answers
    .filter((a) => typeof a.durationMs === "number" && a.durationMs < FAST_MS)
    .slice(0, 6)
    .map((a) => ({ skill: skillBySlug(a.skillSlug)?.title ?? a.skillSlug, stem: input.questions.get(a.questionId)?.stem ?? "", durationLabel: formatDuration(a.durationMs) }));
  const slow = answers
    .filter((a) => typeof a.durationMs === "number" && a.durationMs > SLOW_MS)
    .slice(0, 6)
    .map((a) => ({ skill: skillBySlug(a.skillSlug)?.title ?? a.skillSlug, stem: input.questions.get(a.questionId)?.stem ?? "", durationLabel: formatDuration(a.durationMs) }));
  const skips = answers.filter((a) => a.unknown).map((a) => ({ skill: skillBySlug(a.skillSlug)?.title ?? a.skillSlug, stem: input.questions.get(a.questionId)?.stem ?? "" }));
  const pauses: string[] = [];
  for (let i = 1; i < answers.length; i++) {
    const gap = answers[i].createdAt.getTime() - answers[i - 1].createdAt.getTime();
    if (gap >= PAUSE_MS) {
      const after = skillBySlug(answers[i - 1].skillSlug)?.title ?? "نشان قبلی";
      pauses.push(`بعد از «${after}» حدود ${formatSpan(gap)} فاصله افتاده و دوباره برگشته است.`);
    }
  }
  const cursorSkill = input.state.queue?.[input.state.cursor ?? 0]?.skill;
  const stopped = input.status === "DONE"
    ? "سفر را تا آخر رفته است."
    : `سفر روی نشان «${skillBySlug(cursorSkill ?? "")?.title ?? "باز"}» متوقف است.`;

  const queue = input.state.queue ?? [];
  const stations = queue.length
    ? queue.map((item) => ({
      title: skillBySlug(item.skill)?.title ?? item.skill,
      drill: item.drill,
      rows: item.ids
        .map((id) => answers.find((a) => a.questionId === id && a.drill === item.drill))
        .filter((a): a is ReportAnswer => !!a)
        .map((a) => decorate(a, input.questions)),
    })).filter((s) => s.rows.length)
    : [...new Map(answers.map((a) => [a.skillSlug + (a.drill ? ":d" : ""), a.skillSlug])).entries()].map(([key, slug]) => ({
      title: skillBySlug(slug)?.title ?? slug,
      drill: key.endsWith(":d"),
      rows: answers.filter((a) => a.skillSlug === slug && a.drill === key.endsWith(":d")).map((a) => decorate(a, input.questions)),
    }));

  const who = input.name.trim().split(/\s+/)[0] || "دانش‌آموز";
  const strong = skills.filter((s) => s.status === "strong");
  const grow = skills.filter((s) => s.status === "grow");
  const earlyWeak = grow.filter((s) => s.taughtGrade <= 6);
  const unknown = answers.filter((a) => a.unknown).length;
  const correct = answers.filter((a) => a.correct).length;
  const summary: string[] = [];
  if (strong.length) summary.push(`${who} در ${joinFa(strong.slice(0, 3).map((s) => s.title))} دستش باز است و این بخش‌ها مسلط به نظر می‌رسند.`);
  else summary.push(`${who} هنوز بخشی را با اطمینان کامل طی نکرده و بیشتر نشان‌ها نیاز به کار دارند.`);
  if (root) {
    summary.push(`ریشهٔ اصلی در «${root.title}» است؛ این مهارت در ${root.book} آمده و ${fa(root.correct)} از ${fa(root.total)} درست بوده.`);
    const blocked = chain.find((c) => c.slug === root.slug)?.explains ?? [];
    if (blocked.length) summary.push(`همین ریشه، ضعف بعدی در ${joinFa(blocked)} را هم توضیح می‌دهد.`);
  } else if (grow.length === 0) {
    summary.push("ریشهٔ سستی در مهارت‌های قدیمی دیده نمی‌شود.");
  }
  if (misconceptions[0]) summary.push(`پرتکرارترین سرنخ این است: «${misconceptions[0].tag}» (${fa(misconceptions[0].count)} بار).`);
  if (unknown) summary.push(`${fa(unknown)} معما را با «هنوز به این نرسیدم» رد کرده است.`);
  if (summary.length < 3) summary.push(`${who} روی هم ${fa(answers.length)} معما را طی کرده و ${fa(correct)} تایش درست بوده.`);
  if (summary.length < 3) summary.push("جلسه را از همان ریشه شروع کن و بعد به مهارت‌های بعدی برس.");

  const unknownRate = answers.length ? unknown / answers.length : 0;
  let recommendation: JourneyReport["recommendation"] = "جلسه مشاوره";
  let recommendationWhy = "مسیر عمدتاً مسلط است و یک جلسه برای جمع‌بندی و چیدن چند هفته کافی است.";
  if (earlyWeak.length >= 2) {
    recommendation = "کلاس خصوصی";
    recommendationWhy = "بیش از یک مهارتِ قدیمی سست است و بهتر است کسی کنارش بنشیند.";
  } else if (unknownRate >= 0.25) {
    recommendation = "کلاس خصوصی";
    recommendationWhy = "بخش زیادی از معماها را «هنوز به این نرسیدم» زده و نیاز به همراهی نزدیک دارد.";
  } else if (grow.length >= 1) {
    recommendation = "کلاس تقویتی";
    recommendationWhy = "ریشه معلوم است و یک کلاس تقویتی کوتاه می‌تواند همان را ببندد.";
  }

  const focus = [...grow, ...skills.filter((s) => s.status === "mid")];
  const topics: Topic[] = focus.map((skill) => {
    const related = misconceptions.filter((g) => g.items.some((item) => item.skillSlug === skill.slug)).slice(0, 2);
    const prompts = related.flatMap((g) => [`بپرس چرا این مسیر را رفته: ${g.tag}`, g.items[0]?.explain ? `با هم این را بخوانید: ${g.items[0].explain}` : ""]).filter(Boolean);
    if (!prompts.length) prompts.push(`چند نمونهٔ کوتاه از «${skill.title}» را بلند حل کنید و ببینید کجا می‌ایستد.`);
    return { title: skill.title, why: `${fa(skill.correct)} از ${fa(skill.total)} درست است و جایش در ${skill.book} است.`, prompts };
  });

  const first = focus[0]?.title ?? root?.title ?? "همان مهارتی که سست‌تر است";
  const second = focus[1]?.title ?? "مهارت بعدی در زنجیره";
  const rest = focus.slice(2, 4).map((s) => s.title);
  const weeks = [
    { title: "هفتهٔ ۱", text: `هر روز یک ربع، فقط «${first}». همان سرنخ پرتکرار را با دو مثال درست و یک مثال غلط ببندید.` },
    { title: "هفتهٔ ۲", text: `«${second}» را به ریشه وصل کنید. اول یک یادآوری دو دقیقه‌ای از هفتهٔ قبل، بعد سه معمای تازه.` },
    { title: "هفتهٔ ۳", text: rest.length ? `سراغ ${joinFa(rest)} بروید، ولی اگر جایی گیر کرد به ریشه برگردید.` : `همان دو مهارت را مخلوط کنید تا از یکی به دیگری بلغزد.` },
    { title: "هفتهٔ ۴", text: "یک دور کوتاه از ریشه تا آخر زنجیره. اگر روان شد، نقشه را یک بار دیگر با هم مرور کنید." },
  ];

  const parent = [
    strong.length ? `${who} این‌جاها را خوب بلد است: ${joinFa(strong.slice(0, 2).map((s) => s.title))}.` : `${who} هنوز جایی را با اطمینان کامل نشان نداده است.`,
    root ? `اول باید «${root.title}» محکم شود، چون بقیهٔ راه به آن تکیه دارد.` : "پایهٔ قدیمی سست دیده نشد.",
    unknown ? `${fa(unknown)} جا گفته هنوز به آن نرسیده؛ این عیب نیست و همان‌جاها را بعداً برمی‌گردیم.` : "تقریباً همهٔ معماها را جواب داده است.",
    recommendation === "کلاس خصوصی"
      ? "پیشنهاد ما یک همراهی نزدیک و کوتاه است، نه یک برنامهٔ سنگین."
      : recommendation === "کلاس تقویتی"
        ? "یک کلاس تقویتی کوتاه روی همین ریشه کافی است."
        : "یک جلسهٔ آرام برای چیدن چند هفته کافی است.",
  ];

  const end = input.finishedAt ?? answers.at(-1)?.createdAt ?? input.createdAt;
  const timed = answers.filter((a) => typeof a.durationMs === "number").length;
  return {
    who,
    gradeLabel: GRADE_LABEL[input.grade] ?? String(input.grade),
    fieldLabel: FIELD_LABEL[input.field] ?? (input.field || "—"),
    school: input.school.trim() || "ثبت نشده",
    followLabel: FOLLOW.find((f) => f.id === input.followUp)?.label ?? input.followUp,
    whenLabel: "",
    wallLabel: formatSpan(end.getTime() - input.createdAt.getTime()),
    activeLabel: timed ? formatSpan(answers.reduce((s, a) => s + (a.durationMs ?? 0), 0)) : "زمان هر معما برای این سفر ثبت نشده",
    puzzles: answers.length,
    drills: answers.filter((a) => a.drill).length,
    correct,
    unknown,
    summary: summary.slice(0, 5),
    skills,
    root,
    chain,
    chainNotes,
    misconceptions,
    fast,
    slow,
    skips,
    pauses,
    stopped,
    changeNote: "تغییر پاسخ ذخیره نمی‌شود؛ هر معما یک بار ثبت می‌شود.",
    timed,
    untimed: answers.length - timed,
    stations,
    topics,
    weeks,
    recommendation,
    recommendationWhy,
    parent,
  };
}
