import "server-only";
import { prisma } from "@/lib/prisma";
import { QUIZ_PATH } from "./content";

export type StudyQuizSettings = {
  enabled: boolean;
  title: string;
  intro: string;
  rewardText: string;
  /** SMS the reward code after completion (needs rewardTemplateId) */
  rewardSms: boolean;
  /** SMS.ir verify template id; must include a CODE parameter */
  otpTemplateId: number | null;
  /** SMS.ir verify template for the reward; params: CODE, FULLNAME */
  rewardTemplateId: number | null;
  /** ISO date string or null = no end */
  endsAt: string | null;
  homeBanner: boolean;
};

export const DEFAULT_QUIZ_SETTINGS: StudyQuizSettings = {
  enabled: true,
  title: "درس خوندنت چه مدلیه؟",
  intro:
    "با یک تست کوتاه و سرگرم‌کننده، الگوی مطالعه‌ات را بشناس. در پایان هدیهٔ ویژه‌ای از ستارگان می‌گیری و مشاوران ما می‌توانند دقیق‌تر کمکت کنند.",
  rewardText:
    "کد هدیهٔ تو برای مشاورهٔ تحصیلی یا خرید جزوه از فروشگاه ستارگان است. این کد را هنگام تماس یا ثبت‌نام بگو تا اعمال شود.",
  rewardSms: false,
  otpTemplateId: null,
  rewardTemplateId: null,
  endsAt: null,
  homeBanner: true,
};

const KEY = "studyQuiz";

export async function getQuizSettings(): Promise<StudyQuizSettings> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: KEY } });
    const v = (row?.value ?? {}) as Partial<StudyQuizSettings>;
    return {
      ...DEFAULT_QUIZ_SETTINGS,
      ...v,
      otpTemplateId: Number(v.otpTemplateId) > 0 ? Number(v.otpTemplateId) : null,
      rewardTemplateId: Number(v.rewardTemplateId) > 0 ? Number(v.rewardTemplateId) : null,
      endsAt: typeof v.endsAt === "string" && v.endsAt ? v.endsAt : null,
      enabled: v.enabled !== false,
      homeBanner: v.homeBanner !== false,
    };
  } catch {
    return { ...DEFAULT_QUIZ_SETTINGS };
  }
}

export async function saveQuizSettings(v: StudyQuizSettings) {
  await prisma.setting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: v as object },
    update: { value: v as object },
  });
}

export function quizIsOpen(s: StudyQuizSettings, now = new Date()): { open: boolean; reason?: string } {
  if (!s.enabled) return { open: false, reason: "این کمپین فعلاً غیرفعال است." };
  if (s.endsAt) {
    const end = new Date(s.endsAt);
    if (!Number.isNaN(end.getTime()) && now > end) return { open: false, reason: "مهلت این کمپین به پایان رسیده است." };
  }
  return { open: true };
}

export { QUIZ_PATH };
