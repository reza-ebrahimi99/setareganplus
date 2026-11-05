import "server-only";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/shop/sms";
import { allow } from "@/lib/shop/ratelimit";
import { QUESTIONS, scoreAnswers, ARCHETYPES, type ArchetypeKey } from "./content";
import { parseSessionToken } from "./otp";
import { uniqueRewardCode } from "./codes";
import { getQuizSettings, quizIsOpen } from "./settings";
import { DEFAULT_REWARD_SMS_TEXT, QUIZ_REWARD_SMS_ITEMS } from "./reward";

export type SubmitResult =
  | {
      ok: true;
      archetype: ArchetypeKey;
      rewardCode: string;
      firstName: string;
      lastName: string;
      returning: boolean;
    }
  | { ok: false; error: string };

export async function submitQuiz(opts: {
  sessionToken: string;
  answers: Record<string, number>;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<SubmitResult> {
  const settings = await getQuizSettings();
  const open = quizIsOpen(settings);
  if (!open.open) return { ok: false, error: open.reason || "کمپین بسته است." };

  if (!allow(`quiz:sub:${opts.ip || "x"}`, 20, 10 * 60_000)) return { ok: false, error: "تعداد ارسال زیاد است؛ کمی بعد تلاش کنید." };

  const parsed = parseSessionToken(opts.sessionToken);
  if (!parsed) return { ok: false, error: "نشست نامعتبر است؛ دوباره از اول شروع کنید." };

  const otp = await prisma.studyQuizOtp.findUnique({ where: { id: parsed.otpId } });
  if (!otp || otp.mobile !== parsed.mobile || !otp.verifiedAt) return { ok: false, error: "شماره هنوز تأیید نشده است." };

  const existing = await prisma.studyQuizLead.findUnique({ where: { mobile: otp.mobile } });
  if (existing) {
    return {
      ok: true,
      archetype: existing.archetype as ArchetypeKey,
      rewardCode: existing.rewardCode,
      firstName: existing.firstName,
      lastName: existing.lastName,
      returning: true,
    };
  }

  // validate answers
  const answers: Record<string, number> = {};
  for (const q of QUESTIONS) {
    const v = opts.answers[q.id];
    if (typeof v !== "number" || v < 0 || v >= q.options.length) return { ok: false, error: "لطفاً به همهٔ سؤال‌ها پاسخ دهید." };
    answers[q.id] = v;
  }
  const { key } = scoreAnswers(answers);
  if (!ARCHETYPES[key]) return { ok: false, error: "خطا در محاسبهٔ نتیجه." };

  const rewardCode = await uniqueRewardCode();
  const now = new Date();
  const lead = await prisma.studyQuizLead.create({
    data: {
      firstName: otp.firstName,
      lastName: otp.lastName,
      grade: otp.grade,
      field: otp.field,
      mobile: otp.mobile,
      archetype: key,
      answers,
      rewardCode,
      referral: otp.referral,
      ip: opts.ip || otp.ip,
      userAgent: opts.userAgent?.slice(0, 300) || null,
      verifiedAt: otp.verifiedAt,
      completedAt: now,
    },
  });

  if (settings.rewardSms) {
    const fullName = `${lead.firstName} ${lead.lastName}`.trim();
    void sendSms("form", lead.mobile, { CODE: lead.rewardCode, FULLNAME: fullName, REWARD: DEFAULT_REWARD_SMS_TEXT, GIFT1: QUIZ_REWARD_SMS_ITEMS[0], GIFT2: QUIZ_REWARD_SMS_ITEMS[1], GIFT3: QUIZ_REWARD_SMS_ITEMS[2] }, undefined, { templateId: settings.rewardTemplateId });
  }

  return {
    ok: true,
    archetype: key,
    rewardCode: lead.rewardCode,
    firstName: lead.firstName,
    lastName: lead.lastName,
    returning: false,
  };
}

export async function lookupByMobile(mobile: string) {
  return prisma.studyQuizLead.findUnique({ where: { mobile } });
}
