import { DRILL_SIZE, STATION_SIZE, pathSkills, skillBySlug, statusOf, type StatusId } from "./catalog";
import { twinKey } from "./math";

export type BankQ = {
  id: string;
  skill: string;
  stem: string;
  explain: string;
  options: { id: string; text: string; correct: boolean; misconception: string }[];
};

export type QueueItem = { skill: string; ids: string[]; drill: boolean };

export type Note = { stem: string; picked: string; correct: string; explain: string };

export type RunState = {
  queue: QueueItem[];
  cursor: number;
  qIndex: number;
  drilled: string[];
  reveal: null | { skill: string; drill: boolean; notes: Note[] };
};

export type PublicOption = { id: string; text: string };
export type PublicQuestion = { id: string; stem: string; skill: string; drill: boolean; index: number; total: number; options: PublicOption[] };

const UNKNOWN = "__unknown";

function mix(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507) >>> 0;
    return h;
  };
}

function difficulty(id: string) {
  const m = /-(\d+)$/.exec(id);
  return m ? Number(m[1]) : 0;
}

type PickOpts = { skip?: (id: string) => boolean; twin?: (id: string) => string };

/** Stable shuffle for one journey. The chosen puzzles are then ordered easy to hard. */
export function pickSubset(ids: string[], n: number, seed: string, opts?: PickOpts): string[] {
  const arr = ids.filter((id) => !opts?.skip?.(id));
  const next = mix(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = next() % (i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  const chosen: string[] = [];
  const seen = new Set<string>();
  for (const id of arr) {
    const twin = opts?.twin?.(id);
    if (twin && seen.has(twin)) continue;
    if (twin) seen.add(twin);
    chosen.push(id);
    if (chosen.length >= n) break;
  }
  return chosen.sort((a, b) => difficulty(a) - difficulty(b) || a.localeCompare(b));
}

export function buildQueue(grade: number, field: string, bank: BankQ[], seed = "journey"): QueueItem[] {
  const bySkill = new Map<string, string[]>();
  const twins = new Map<string, string>();
  for (const item of bank) {
    const list = bySkill.get(item.skill) ?? [];
    list.push(item.id);
    bySkill.set(item.skill, list);
    twins.set(item.id, twinKey(item.stem));
  }
  const usedIds = new Set<string>();
  const usedTwins = new Set<string>();
  return pathSkills(grade, field).flatMap((skill) => {
    const ids = pickSubset(bySkill.get(skill.slug) ?? [], STATION_SIZE, `${seed}:${skill.slug}`, {
      skip: (id) => usedIds.has(id) || usedTwins.has(twins.get(id) ?? id),
      twin: (id) => twins.get(id) ?? id,
    });
    for (const id of ids) {
      usedIds.add(id);
      usedTwins.add(twins.get(id) ?? id);
    }
    return ids.length ? [{ skill: skill.slug, ids, drill: false }] : [];
  });
}

export function emptyState(queue: QueueItem[]): RunState {
  return { queue, cursor: 0, qIndex: 0, drilled: [], reveal: null };
}

export function currentQuestion(state: RunState, bank: Map<string, BankQ>): PublicQuestion | null {
  if (state.reveal) return null;
  const station = state.queue[state.cursor];
  if (!station) return null;
  const id = station.ids[state.qIndex];
  const q = id ? bank.get(id) : undefined;
  if (!q) return null;
  return {
    id: q.id,
    stem: q.stem,
    skill: station.skill,
    drill: station.drill,
    index: state.qIndex + 1,
    total: station.ids.length,
    options: [
      ...q.options.map((o) => ({ id: o.id, text: o.text })),
      { id: UNKNOWN, text: "هنوز به این نرسیدم" },
    ],
  };
}

export function applyAnswer(state: RunState, bank: Map<string, BankQ>, optionId: string): { state: RunState; saved: { questionId: string; skill: string; optionId: string; correct: boolean; unknown: boolean; misconception: string; drill: boolean } | null } {
  if (state.reveal) return { state, saved: null };
  const station = state.queue[state.cursor];
  if (!station) return { state, saved: null };
  const qid = station.ids[state.qIndex];
  const q = qid ? bank.get(qid) : undefined;
  if (!q) return { state, saved: null };
  const unknown = optionId === UNKNOWN;
  const picked = unknown ? null : q.options.find((o) => o.id === optionId);
  if (!unknown && !picked) return { state, saved: null };
  const saved = {
    questionId: q.id,
    skill: station.skill,
    optionId: unknown ? "" : picked!.id,
    correct: !!picked?.correct,
    unknown,
    misconception: picked && !picked.correct ? picked.misconception : "",
    drill: station.drill,
  };
  const next = structuredClone(state) as RunState;
  next.qIndex += 1;
  if (next.qIndex >= station.ids.length) {
    const notes: Note[] = [];
    // notes are filled by the caller from the full answer list; placeholder here
    next.reveal = { skill: station.skill, drill: station.drill, notes };
    next.qIndex = station.ids.length;
  }
  return { state: next, saved };
}

export function notesForStation(station: QueueItem, bank: Map<string, BankQ>, answers: { questionId: string; optionId: string; unknown: boolean; correct: boolean }[]): Note[] {
  const notes: Note[] = [];
  for (const id of station.ids) {
    const q = bank.get(id);
    const ans = [...answers].reverse().find((a) => a.questionId === id);
    if (!q || !ans || ans.correct) continue;
    const picked = ans.unknown ? "هنوز به این نرسیدم" : q.options.find((o) => o.id === ans.optionId)?.text ?? "";
    const correct = q.options.find((o) => o.correct)?.text ?? "";
    notes.push({ stem: q.stem, picked, correct, explain: q.explain });
  }
  return notes;
}

export function stationRatio(station: QueueItem, answers: { questionId: string; correct: boolean }[]) {
  const mine = station.ids.map((id) => answers.find((a) => a.questionId === id)).filter(Boolean) as { correct: boolean }[];
  if (!mine.length) return 1;
  return mine.filter((a) => a.correct).length / mine.length;
}

/** True only for the puzzle sitting at the open station cursor. Locked and finished stations are rejected. */
export function answerTargetsCurrent(state: RunState, questionId: string) {
  if (!questionId || state.reveal) return false;
  const station = state.queue[state.cursor];
  if (!station) return false;
  return station.ids[state.qIndex] === questionId;
}

/** After a finished station, maybe insert a short prerequisite check. Returns the next state with reveal cleared and cursor advanced. */
export function advance(state: RunState, bankBySkill: Map<string, string[]>, ratio: number, seed = "journey", twins?: Map<string, string>): RunState {
  const next = structuredClone(state) as RunState;
  const station = next.queue[next.cursor];
  next.reveal = null;
  const usedIds = new Set<string>();
  const usedTwins = new Set<string>();
  for (const item of next.queue) {
    for (const id of item.ids) {
      usedIds.add(id);
      usedTwins.add(twins?.get(id) ?? id);
    }
  }
  if (station && !station.drill && ratio < 0.5) {
    const prereq = skillBySlug(station.skill)?.prereq;
    if (prereq && !next.drilled.includes(prereq)) {
      const ids = pickSubset(bankBySkill.get(prereq) ?? [], DRILL_SIZE, `${seed}:drill:${prereq}`, {
        skip: (id) => usedIds.has(id) || usedTwins.has(twins?.get(id) ?? id),
        twin: (id) => twins?.get(id) ?? id,
      });
      if (ids.length) {
        next.drilled.push(prereq);
        next.queue.splice(next.cursor + 1, 0, { skill: prereq, ids, drill: true });
      }
    }
  }
  next.cursor += 1;
  next.qIndex = 0;
  return next;
}

export function isFinished(state: RunState) {
  return !state.reveal && state.cursor >= state.queue.length;
}

export type SkillScore = { slug: string; title: string; ratio: number; status: StatusId; drillRatio: number | null; courseSlug?: string };

export function scoreSkills(grade: number, field: string, answers: { skillSlug: string; correct: boolean; drill: boolean }[]): SkillScore[] {
  return pathSkills(grade, field).map((skill) => {
    const main = answers.filter((a) => a.skillSlug === skill.slug && !a.drill);
    const drill = answers.filter((a) => a.skillSlug === skill.slug && a.drill);
    const ratio = main.length ? main.filter((a) => a.correct).length / main.length : 0;
    const drillRatio = drill.length ? drill.filter((a) => a.correct).length / drill.length : null;
    return { slug: skill.slug, title: skill.title, ratio, status: main.length ? statusOf(ratio) : "grow", drillRatio, courseSlug: skill.courseSlug };
  }).filter((s) => answers.some((a) => a.skillSlug === s.slug));
}
