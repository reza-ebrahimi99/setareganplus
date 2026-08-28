import type { AtrinEntityBag } from "@/lib/atrin/pipeline/types";
import type { EducationAnalysis } from "@/lib/atrin/education/types";

function normalize(text: string): string {
  return text
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c\u200f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Structured entity extraction for one turn (merged corpus).
 */
export function extractAtrinEntities(
  texts: readonly string[],
  education: EducationAnalysis | null,
): AtrinEntityBag {
  const corpus = normalize(texts.slice(-10).join("\n"));

  const name =
    corpus.match(
      /(?:اسمم|اسم من|من)\s+([آابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهیءٔ‌]{2,16})(?:\s|$|هستم)/,
    )?.[1] ?? null;

  const parentName =
    corpus.match(
      /(?:فرزندم|دخترم|پسرم)\s+([آابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهیءٔ‌]{2,16})/,
    )?.[1] ?? null;

  const grade =
    corpus.match(
      /(?:کلاس|پایه)\s*(اول|دوم|سوم|چهارم|پنجم|ششم|هفتم|هشتم|نهم|دهم|یازدهم|دوازدهم|\d{1,2})/,
    )?.[1] ??
    (education?.grade.value != null ? String(education.grade.value) : null);

  const major =
    corpus.match(/(?:رشته)\s*(ریاضی|تجربی|انسانی|فنی|هنر)/)?.[1] ?? null;

  const lesson =
    corpus.match(/(?:درس|فصل)\s*([^\n،.]{2,40})/)?.[1]?.trim() ?? null;

  const topic =
    education?.mathTopics[0] ??
    education?.physicsTopics[0] ??
    education?.chemistryTopics[0] ??
    education?.languageTopics[0] ??
    corpus.match(/(?:مبحث|موضوع)\s*([^\n،.]{2,40})/)?.[1]?.trim() ??
    null;

  const exam =
    corpus.match(/(کنکور|قلم\s*چی|قلمچی|تیزهوشان|نمونه دولتی|میان‌ترم|پایان‌ترم)/)?.[1] ??
    null;

  const goal =
    corpus.match(
      /(?:هدفم|میخوام|می‌خوام|می خواهم)\s*([^\n.]{3,60})/,
    )?.[1]?.trim() ?? null;

  const difficulty =
    education?.difficulty.value ??
    (corpus.match(/(سخت|آسان|ساده|پیشرفته)/)?.[1] ?? null);

  const school =
    corpus.match(/(ستارگان|دبستان|مؤسسه|موسسه)/)?.[1] ?? null;

  const course =
    corpus.match(/(کلاس تقویتی|دوره|باشگاه تابستانی)/)?.[1] ?? null;

  const competition =
    corpus.match(/(المپیاد|مسابقه|رقابت)/)?.[1] ?? null;

  const hoursPerDay =
    corpus.match(/(\d+)\s*ساعت/)?.[1] ?? null;

  return {
    name: name && !/پایه|کلاس|ریاضی/.test(name) ? name : null,
    parentName,
    grade: grade ? (grade.match(/^\d+$/) ? `پایه ${grade}` : `پایه ${grade}`) : null,
    major,
    lesson,
    topic,
    exam,
    goal,
    difficulty,
    school,
    course,
    competition,
    hoursPerDay: hoursPerDay ? `${hoursPerDay} ساعت` : null,
  };
}
