import { MAX_QUIZ_QUESTIONS } from "./catalog";

export type QbankChoice = { text: string; correct: boolean };
export type QbankQuestion = {
  externalId: string;
  lessonHash: string;
  prompt: string;
  explanation: string | null;
  published: boolean;
  choices: QbankChoice[];
};

export type QbankFile = { source?: string; questions: QbankQuestion[] };

/** Accepts the JSON the future qbank.setareganplus.ir sync will POST or that staff paste in the admin. */
export function parseQbank(input: unknown): { ok: true; file: QbankFile } | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "فایل JSON معتبر نیست." };
  const raw = input as { source?: unknown; questions?: unknown };
  if (!Array.isArray(raw.questions)) return { ok: false, error: "کلید questions باید یک آرایه باشد." };
  const questions: QbankQuestion[] = [];
  for (const [i, item] of raw.questions.entries()) {
    if (!item || typeof item !== "object") return { ok: false, error: `سؤال ${i + 1} شیء نیست.` };
    const q = item as Record<string, unknown>;
    const externalId = String(q.externalId ?? "").trim();
    const lessonHash = String(q.lessonHash ?? q.videohash ?? "").trim();
    const prompt = String(q.prompt ?? "").trim();
    if (!externalId || externalId.length > 80) return { ok: false, error: `سؤال ${i + 1}: externalId لازم است.` };
    if (!/^[A-Za-z0-9]{4,32}$/.test(lessonHash)) return { ok: false, error: `سؤال ${i + 1}: lessonHash شناخته نشد.` };
    if (prompt.length < 2 || prompt.length > 4000) return { ok: false, error: `سؤال ${i + 1}: متن سؤال نامعتبر است.` };
    if (!Array.isArray(q.choices) || q.choices.length < 2 || q.choices.length > MAX_QUIZ_QUESTIONS) {
      return { ok: false, error: `سؤال ${i + 1}: بین ۲ تا ${MAX_QUIZ_QUESTIONS} گزینه لازم است.` };
    }
    const choices: QbankChoice[] = [];
    for (const c of q.choices) {
      if (!c || typeof c !== "object") return { ok: false, error: `سؤال ${i + 1}: گزینه نامعتبر است.` };
      const text = String((c as { text?: unknown }).text ?? "").trim();
      if (!text || text.length > 1000) return { ok: false, error: `سؤال ${i + 1}: متن گزینه خالی است.` };
      choices.push({ text, correct: (c as { correct?: unknown }).correct === true });
    }
    if (choices.filter((c) => c.correct).length !== 1) return { ok: false, error: `سؤال ${i + 1}: دقیقاً یک گزینه باید درست باشد.` };
    questions.push({
      externalId,
      lessonHash,
      prompt,
      explanation: q.explanation == null ? null : String(q.explanation).trim().slice(0, 4000) || null,
      published: q.published !== false,
      choices,
    });
  }
  if (questions.length === 0) return { ok: false, error: "هیچ سؤالی در فایل نیست." };
  if (questions.length > 500) return { ok: false, error: "بیش از ۵۰۰ سؤال در یک فایل مجاز نیست." };
  const ids = new Set(questions.map((q) => q.externalId));
  if (ids.size !== questions.length) return { ok: false, error: "externalId تکراری است." };
  return { ok: true, file: { source: typeof raw.source === "string" ? raw.source.slice(0, 40) : "json", questions } };
}
