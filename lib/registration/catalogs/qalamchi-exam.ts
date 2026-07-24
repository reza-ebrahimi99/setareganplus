/**
 * Qalamchi exam registration catalog — first consumer of the Registration Engine.
 * Future flows add sibling catalogs; the wizard stays catalog-driven.
 */

import { RegistrationProductType } from "@/generated/prisma/enums";
import type { RegistrationFlowCatalog } from "@/lib/registration/types";

export const QALAMCHI_EXAM_FLOW_KEY = "qalamchi-exam" as const;

export const qalamchiExamCatalog: RegistrationFlowCatalog = {
  flowKey: QALAMCHI_EXAM_FLOW_KEY,
  productType: RegistrationProductType.EXAM,
  title: "ثبت‌نام آزمون قلم‌چی",
  subtitle:
    "اطلاعات دانش‌آموز و ولی را تکمیل کنید، آزمون و بسته را انتخاب کنید، سپس به مرحله پرداخت بروید.",
  products: [
    {
      key: "qalamchi-comprehensive",
      title: "آزمون جامع قلم‌چی",
      description: "آزمون دوره‌ای جامع ویژه پایه‌های متوسطه",
    },
    {
      key: "qalamchi-stage",
      title: "آزمون مرحله‌ای قلم‌چی",
      description: "آزمون مرحله‌ای متناسب با برنامه مطالعاتی",
    },
    {
      key: "qalamchi-trial",
      title: "آزمون آزمایشی قلم‌چی",
      description: "آزمون آزمایشی برای سنجش آمادگی",
    },
  ],
  sessions: [
    {
      key: "session-morning",
      title: "صبح — ساعت ۹:۰۰",
      description: "شروع ۹ صبح",
    },
    {
      key: "session-afternoon",
      title: "عصر — ساعت ۱۴:۳۰",
      description: "شروع ۱۴:۳۰",
    },
  ],
  packages: [
    {
      key: "pkg-single",
      title: "تک‌آزمون",
      description: "ثبت‌نام یک نوبت آزمون",
      amountRials: 2_500_000,
    },
    {
      key: "pkg-triple",
      title: "بسته ۳ آزمونه",
      description: "سه نوبت با تخفیف بسته",
      amountRials: 6_500_000,
    },
    {
      key: "pkg-term",
      title: "بسته ترم",
      description: "پوشش ترم تحصیلی",
      amountRials: 12_000_000,
    },
  ],
  venueBranches: [
    {
      key: "nasimshahr-main",
      title: "نمایندگی نسیم‌شهر — مرکز اصلی",
      description: "مرکز آموزشی ستارگان پلاس",
    },
    {
      key: "nasimshahr-west",
      title: "نمایندگی نسیم‌شهر — غرب",
      description: "شعبه غرب نسیم‌شهر",
    },
  ],
  discountCodes: {},
};
