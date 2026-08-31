/**
 * Major-cluster affinity map.
 * Deterministic weighted average of questionnaire dimension scores.
 * This is a preference map from this test — not a prediction of admission.
 */

import type { AssessmentCategoryId } from "@/lib/guidance/journey/assessment/categories";

export type MajorClusterId =
  | "ENGINEERING"
  | "COMPUTER_SCIENCE"
  | "MEDICINE_HEALTH"
  | "BASIC_SCIENCES"
  | "HUMANITIES_LAW"
  | "SOCIAL_SCIENCES_PSYCHOLOGY"
  | "BUSINESS_MANAGEMENT"
  | "ARTS_DESIGN"
  | "EDUCATION_TEACHING"
  | "AGRICULTURE_ENVIRONMENT";

export type MajorClusterDefinition = {
  id: MajorClusterId;
  title: string;
  cautionNote: string;
  weights: Partial<Record<AssessmentCategoryId, number>>;
};

export const MAJOR_CLUSTERS: readonly MajorClusterDefinition[] = [
  {
    id: "ENGINEERING",
    title: "مهندسی و فنی",
    cautionNote: "اگر گرایش فنی و تحمل کار دقیق در این آزمون پایین آمده، این گروه را با احتیاط ببینید.",
    weights: { technical: 0.9, research: 0.45, work_style: 0.35, decision_making: 0.2 },
  },
  {
    id: "COMPUTER_SCIENCE",
    title: "کامپیوتر و فناوری اطلاعات",
    cautionNote: "اگر کار با سیستم و ایده ساخت در پاسخ‌ها ضعیف بوده، این گروه ممکن است با الگوی فعلی‌تان فاصله داشته باشد.",
    weights: { technical: 0.85, research: 0.4, creativity: 0.4, future_goals: 0.15 },
  },
  {
    id: "MEDICINE_HEALTH",
    title: "پزشکی و علوم سلامت",
    cautionNote: "اگر کمک به دیگران یا تاب‌آوری فشار در این آزمون پایین آمده، این گروه نیاز به بررسی دقیق‌تر در جلسه دارد.",
    weights: { helping: 0.7, research: 0.55, stress_tolerance: 0.4, social: 0.25 },
  },
  {
    id: "BASIC_SCIENCES",
    title: "علوم پایه",
    cautionNote: "اگر کنجکاوی تحلیلی در پاسخ‌ها کم بوده، مسیر علوم پایه ممکن است برای الگوی فعلی‌تان سنگین باشد.",
    weights: { research: 0.9, interests: 0.4, technical: 0.3, future_goals: 0.15 },
  },
  {
    id: "HUMANITIES_LAW",
    title: "علوم انسانی و حقوق",
    cautionNote: "اگر تحلیل متن/استدلال و تصمیم‌گیری در این آزمون پایین آمده، این گروه را با احتیاط بخوانید.",
    weights: { research: 0.45, leadership: 0.4, decision_making: 0.35, social: 0.3 },
  },
  {
    id: "SOCIAL_SCIENCES_PSYCHOLOGY",
    title: "علوم اجتماعی و روان‌شناسی",
    cautionNote: "اگر ترجیح اجتماعی و کمک به دیگران پایین آمده، این گروه ممکن است با پاسخ‌های فعلی فاصله داشته باشد.",
    weights: { helping: 0.7, social: 0.6, research: 0.3, personality: 0.2 },
  },
  {
    id: "BUSINESS_MANAGEMENT",
    title: "مدیریت و کسب‌وکار",
    cautionNote: "اگر گرایش کارآفرینی و رهبری در آزمون پایین بوده، این گروه را بدون جلسه تخصصی انتخاب نکنید.",
    weights: { business: 0.9, leadership: 0.55, future_goals: 0.25, social: 0.2 },
  },
  {
    id: "ARTS_DESIGN",
    title: "هنر و طراحی",
    cautionNote: "اگر خلاقیت در این آزمون پایین آمده، این گروه با الگوی فعلی فاصله دارد — نه اینکه استعداد هنری «رد» شده باشد.",
    weights: { creativity: 0.95, interests: 0.25, environmental: 0.15 },
  },
  {
    id: "EDUCATION_TEACHING",
    title: "علوم تربیتی و آموزش",
    cautionNote: "اگر کمک به دیگران و یادگیری از طریق توضیح در پاسخ‌ها ضعیف بوده، این گروه نیاز به بررسی دارد.",
    weights: { helping: 0.7, social: 0.4, learning_style: 0.35, leadership: 0.2 },
  },
  {
    id: "AGRICULTURE_ENVIRONMENT",
    title: "کشاورزی و محیط زیست",
    cautionNote: "اگر ترجیح محیط باز/میدانی پایین آمده، این گروه ممکن است با فضای موردعلاقه شما یکی نباشد.",
    weights: { environmental: 0.85, interests: 0.3, research: 0.25, technical: 0.15 },
  },
];
