/**
 * Unique SEO copy for static public pages.
 * Descriptions are distinct; titles are absolute (not template-suffixed).
 */

import type { CreatePageMetadataInput } from "@/lib/seo/create-page-metadata";
import { createPageMetadata } from "@/lib/seo/create-page-metadata";
import type { Metadata } from "next";

type PublicPageKey =
  | "home"
  | "about"
  | "gallery"
  | "contact"
  | "faq"
  | "courses"
  | "classes"
  | "exams"
  | "consultation"
  | "preRegistration"
  | "assessments"
  | "team"
  | "achievements"
  | "ghalamchiRegister";

const PUBLIC_PAGE_SEO: Record<PublicPageKey, CreatePageMetadataInput> = {
  home: {
    path: "/",
    title: "ستارگان پلاس | سامانه مدیریت آموزشی",
    description:
      "سامانه ستارگان پلاس برای معرفی دبستان ستارگان آینده، مرکز آموزشی نسیم‌شهر، خدمات قلم‌چی، پیش‌ثبت‌نام و مسیر ارتباط با اولیا و دانش‌آموزان.",
    keywords: [
      "ستارگان پلاس",
      "نسیم شهر",
      "دبستان ستارگان آینده",
      "قلم چی نسیم شهر",
      "مرکز آموزشی",
    ],
  },
  about: {
    path: "/about",
    title: "درباره ستارگان پلاس | معرفی مجموعه",
    description:
      "آشنایی با مجموعه ستارگان پلاس در نسیم‌شهر؛ از دبستان غیردولتی ستارگان آینده تا خدمات آموزشی تکمیلی و نمایندگی قلم‌چی.",
    keywords: [
      "درباره ستارگان پلاس",
      "دبستان غیردولتی نسیم شهر",
      "مجموعه ستارگان",
    ],
  },
  gallery: {
    path: "/gallery",
    title: "گالری تصاویر | ستارگان پلاس",
    description:
      "مشاهده تصاویر فضای آموزشی، رویدادها و فعالیت‌های مجموعه ستارگان در نسیم‌شهر؛ بدون انتشار هویت فردی دانش‌آموزان.",
    keywords: ["گالری ستارگان پلاس", "تصاویر مدرسه نسیم شهر", "رویدادهای آموزشی"],
  },
  contact: {
    path: "/contact",
    title: "تماس با ما | ستارگان پلاس",
    description:
      "راه‌های ارتباط با ستارگان پلاس در نسیم‌شهر؛ اطلاعات تماس، مسیر مراجعه و راهنمای پیگیری پیش‌ثبت‌نام و خدمات آموزشی.",
    keywords: ["تماس ستارگان پلاس", "آدرس نسیم شهر", "تلفن مرکز آموزشی"],
  },
  faq: {
    path: "/faq",
    title: "سؤالات متداول | ستارگان پلاس",
    description:
      "پاسخ پرسش‌های رایج درباره خدمات ستارگان پلاس، دبستان ستارگان آینده، نمایندگی قلم‌چی و مسیر پیش‌ثبت‌نام در نسیم‌شهر.",
    keywords: ["سؤالات متداول", "ستارگان پلاس", "ثبت نام مدرسه نسیم شهر"],
  },
  courses: {
    path: "/courses",
    title: "دوره‌های آموزشی | ستارگان پلاس",
    description:
      "راهنمای دوره‌های آموزشی مرکز ستارگان پلاس در نسیم‌شهر؛ معرفی مسیر یادگیری، آمادگی تحصیلی و خدمات مکمل کلاس‌ها.",
    keywords: ["دوره آموزشی نسیم شهر", "ستارگان پلاس", "آمادگی تحصیلی"],
  },
  classes: {
    path: "/classes",
    title: "کلاس‌های تقویتی | ستارگان پلاس",
    description:
      "معرفی کلاس‌های تقویتی و برنامه‌های آموزشی حضوری ستارگان پلاس در نسیم‌شهر برای تقویت درسی و پیگیری منظم یادگیری.",
    keywords: [
      "کلاس تقویتی نسیم شهر",
      "آموزشگاه نسیم شهر",
      "ستارگان پلاس",
    ],
  },
  exams: {
    path: "/exams",
    title: "آزمون‌های آموزشی | ستارگان پلاس",
    description:
      "آشنایی با آزمون‌های آموزشی و برنامه‌های ارزیابی در ستارگان پلاس؛ مکمل خدمات آزمون و آمادگی تحصیلی در نسیم‌شهر.",
    keywords: ["آزمون آموزشی", "ستارگان پلاس", "آمادگی آزمون نسیم شهر"],
  },
  consultation: {
    path: "/consultation",
    title: "مشاوره تحصیلی | ستارگان پلاس",
    description:
      "خدمات مشاوره تحصیلی ستارگان پلاس در نسیم‌شهر؛ راهنمایی مسیر تحصیلی، هماهنگی با برنامه‌های آموزشی و رزرو نوبت مشاوره.",
    keywords: ["مشاوره تحصیلی نسیم شهر", "ستارگان پلاس", "رزرو مشاوره"],
  },
  preRegistration: {
    path: "/pre-registration",
    title: "ثبت‌نام آنلاین | ستارگان پلاس",
    description:
      "پیش‌ثبت‌نام و آغاز مسیر ثبت‌نام در خدمات آموزشی ستارگان پلاس؛ راهنمای مراحل و ارتباط با مرکز آموزشی نسیم‌شهر.",
    keywords: [
      "ثبت نام آنلاین",
      "پیش ثبت نام ستارگان پلاس",
      "ثبت نام دبستان نسیم شهر",
    ],
  },
  assessments: {
    path: "/assessments",
    title: "آزمون و نتایج | ستارگان پلاس",
    description:
      "فهرست آزمون‌ها و نتایج منتشرشده در ستارگان پلاس؛ پوشش آزمون‌های قلم‌چی و ارزیابی‌های آموزشی مرتبط با نسیم‌شهر.",
    keywords: ["آزمون قلم چی نسیم شهر", "نتایج آزمون", "ستارگان پلاس"],
  },
  team: {
    path: "/team",
    title: "تیم آموزشی | ستارگان پلاس",
    description:
      "معرفی مدیران، دبیران، مشاوران و همکاران مجموعه ستارگان پلاس؛ آشنایی با تیم آموزشی و اجرایی در نسیم‌شهر.",
    keywords: ["تیم ستارگان پلاس", "دبیران نسیم شهر", "مشاوران تحصیلی"],
  },
  achievements: {
    path: "/achievements",
    title: "افتخارات و موفقیت‌ها | ستارگان پلاس",
    description:
      "مروری بر افتخارات آموزشی مجموعه ستارگان؛ المپیادها، پذیرش‌ها و گواهی‌ها با حفظ حریم خصوصی دانش‌آموزان.",
    keywords: ["افتخارات ستارگان پلاس", "موفقیت تحصیلی", "نسیم شهر"],
  },
  ghalamchiRegister: {
    path: "/ghalamchi/register",
    title: "ثبت نام آزمون قلم چی | ستارگان پلاس",
    description:
      "ثبت نام اینترنتی آزمون قلم چی، تکمیل اطلاعات، پرداخت آنلاین و دریافت رسید.",
    keywords: [
      "ثبت نام آزمون قلم چی",
      "قلم چی نسیم شهر",
      "ستارگان پلاس",
    ],
  },
};

export function getPublicPageMetadata(key: PublicPageKey): Metadata {
  return createPageMetadata(PUBLIC_PAGE_SEO[key]);
}

export function getPublicPageSeoInput(
  key: PublicPageKey,
): CreatePageMetadataInput {
  return PUBLIC_PAGE_SEO[key];
}
