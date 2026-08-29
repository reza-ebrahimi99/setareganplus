/**
 * Lightweight post-LLM response validator — educational quality + anti-hallucination hints.
 */

export type ReplyValidation = {
  content: string;
  patched: boolean;
  notes: string[];
};

export function validateAtrinReply(input: {
  rawReply: string;
  shouldTeach: boolean;
  shouldAskClarifying: boolean;
  clarifyingQuestions: readonly string[];
  hasCurriculum: boolean;
}): ReplyValidation {
  let content = input.rawReply.trim();
  const notes: string[] = [];
  let patched = false;

  // Soft discourage invented tuition/capacity claims without grounding.
  if (/شهریه\s*\d+|ظرفیت\s*\d+/.test(content) && !/طبق اطلاعات|بر اساس/.test(content)) {
    notes.push("possible_unverified_number");
  }

  if (input.shouldTeach) {
    const hasSteps = /(?:^|\n)\s*(?:\d+[.)]|[-•*]|گام|مرحله)/m.test(content);
    const hasHeading = /(?:^|\n)\s*#{1,3}\s+/m.test(content) || /(?:^|\n)[^\n]{2,40}:\s*$/m.test(content);
    if (!hasSteps && content.length > 120) {
      notes.push("missing_steps");
    }
    if (!hasHeading && content.length > 220) {
      notes.push("missing_structure");
    }
  }

  if (
    input.shouldAskClarifying &&
    input.clarifyingQuestions[0] &&
    !content.includes("؟") &&
    content.length < 280
  ) {
    content = `${content}\n\n### یک سؤال کوتاه\n${input.clarifyingQuestions[0]}`;
    patched = true;
    notes.push("appended_clarifying_question");
  }

  if (input.hasCurriculum === false && /صفحه\s*\d{2,}/.test(content)) {
    notes.push("possible_invented_page");
  }

  // Ensure a next-action nudge for thin replies.
  if (content.length < 80 && !input.shouldAskClarifying) {
    content = `${content}\n\nاگر بخواهی، می‌توانم دقیق‌تر ادامه بدهم.`;
    patched = true;
    notes.push("expanded_thin_reply");
  }

  return { content, patched, notes };
}
