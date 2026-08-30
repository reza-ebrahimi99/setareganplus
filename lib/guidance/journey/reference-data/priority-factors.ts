/**
 * Guidance Journey Engine Step 9 — fixed priority factors the student ranks.
 */

export const GUIDANCE_PRIORITY_FACTORS = [
  { code: "MAJOR", label: "رشته تحصیلی" },
  { code: "UNIVERSITY", label: "اعتبار دانشگاه" },
  { code: "CITY", label: "شهر محل تحصیل" },
  { code: "EDUCATION_TYPE", label: "نوع دوره (روزانه/شبانه/...)" },
  { code: "DISTANCE", label: "فاصله از خانواده" },
  { code: "DORMITORY", label: "امکان خوابگاه" },
  { code: "MIGRATION", label: "تمایل به مهاجرت تحصیلی" },
  { code: "INCOME", label: "چشم‌انداز درآمد آینده" },
  { code: "CAREER", label: "چشم‌انداز شغلی" },
  { code: "ACADEMIC_REPUTATION", label: "شهرت علمی رشته/دانشگاه" },
] as const;

export type GuidancePriorityFactorCode =
  (typeof GUIDANCE_PRIORITY_FACTORS)[number]["code"];
