import type {
  DetectionScore,
  EducationDifficulty,
} from "@/lib/atrin/education/types";

export function detectEducationDifficulty(
  normalized: string,
): DetectionScore<EducationDifficulty> {
  let scoreEasy = 0;
  let scoreHard = 0;
  const signals: string[] = [];

  if (/آسان|ساده|مبتدی|easy|basic/i.test(normalized)) {
    scoreEasy += 4;
    signals.push("easy_word");
  }
  if (/سخت|پیچیده|پیشرفته|challenging|hard|advanced/i.test(normalized)) {
    scoreHard += 4;
    signals.push("hard_word");
  }
  if (/کنکور|تیزهوشان|المپیاد|انتگرال|ماتریس/.test(normalized)) {
    scoreHard += 3;
    signals.push("advanced_topic");
  }
  if (/جمع|تفریق|املا|معنی\s*کلمه/.test(normalized)) {
    scoreEasy += 2;
    signals.push("basic_topic");
  }

  if (scoreHard >= 3 && scoreHard > scoreEasy) {
    return {
      value: "hard",
      confidence: Math.min(1, scoreHard / 8),
      signals,
    };
  }
  if (scoreEasy >= 3 && scoreEasy > scoreHard) {
    return {
      value: "easy",
      confidence: Math.min(1, scoreEasy / 8),
      signals,
    };
  }
  if (scoreEasy > 0 || scoreHard > 0) {
    return { value: "medium", confidence: 0.45, signals };
  }
  return { value: "unknown", confidence: 0, signals: [] };
}
