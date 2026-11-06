"use server";

import { headers } from "next/headers";
import { GRADES, gradeHasMajor, MAJORS } from "@/lib/shop/config";
import { toEn } from "@/lib/format";
import { startQuizOtp, verifyQuizOtp } from "@/lib/quiz/otp";
import { submitQuiz } from "@/lib/quiz/submit";
import { recordQuizEvent } from "@/lib/analytics/store";
import { getQuizSettings, quizIsOpen } from "@/lib/quiz/settings";
import { ARCHETYPES, type ArchetypeKey } from "@/lib/quiz/content";

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export async function quizBootstrap() {
  const s = await getQuizSettings();
  const open = quizIsOpen(s);
  return {
    open: open.open,
    reason: open.reason,
    title: s.title,
    intro: s.intro,
    rewardText: s.rewardText,
    grades: [...GRADES],
    majors: [...MAJORS],
    gradeHasMajorGrades: GRADES.filter((g) => gradeHasMajor(g)),
  };
}

export async function actionStartOtp(input: {
  firstName: string;
  lastName: string;
  grade: string;
  field?: string;
  mobile: string;
  referral?: string;
}) {
  const s = await getQuizSettings();
  const open = quizIsOpen(s);
  if (!open.open) return { ok: false as const, error: open.reason || "کمپین بسته است." };
  if (input.grade && gradeHasMajor(input.grade) && !input.field?.trim()) {
    return { ok: false as const, error: "برای این پایه، رشته را هم انتخاب کنید." };
  }
  if (input.field && !(MAJORS as readonly string[]).includes(input.field)) {
    return { ok: false as const, error: "رشته نامعتبر است." };
  }
  if (!(GRADES as readonly string[]).includes(input.grade)) {
    return { ok: false as const, error: "پایه نامعتبر است." };
  }
  const result = await startQuizOtp({ ...input, mobile: toEn(input.mobile), ip: await clientIp() });
  if (result.ok && !result.alreadyDone) await recordQuizEvent("quiz_start");
  return result;
}

export async function actionVerifyOtp(otpId: string, code: string) {
  return verifyQuizOtp(otpId, toEn(code), await clientIp());
}

export async function actionSubmitQuiz(sessionToken: string, answers: Record<string, number>) {
  const h = await headers();
  const r = await submitQuiz({
    sessionToken,
    answers,
    ip: await clientIp(),
    userAgent: h.get("user-agent"),
  });
  if (r.ok && !r.returning) await recordQuizEvent("quiz_complete");
  if (!r.ok) return r;
  const a = ARCHETYPES[r.archetype as ArchetypeKey];
  const s = await getQuizSettings();
  return {
    ...r,
    archetypeInfo: a,
    rewardText: s.rewardText,
  };
}

export async function actionGetArchetype(key: string) {
  const a = ARCHETYPES[key as ArchetypeKey];
  if (!a) return null;
  const s = await getQuizSettings();
  return { archetypeInfo: a, rewardText: s.rewardText };
}
