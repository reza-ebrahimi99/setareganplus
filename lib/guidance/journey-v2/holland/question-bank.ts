/**
 * LOCAL compile shim only.
 *
 * Production already has the real 60-question Holland bank.
 * NEVER copy this file to production. Counselor OS v3 deploy packs
 * explicitly forbid question-bank.ts.
 */
export type HollandQuestion = {
  id: string;
  type: "R" | "I" | "A" | "S" | "E" | "C";
  text: string;
};

export const HOLLAND_QUESTIONS: readonly HollandQuestion[] = [];
export const HOLLAND_QUESTION_COUNT = 0;
