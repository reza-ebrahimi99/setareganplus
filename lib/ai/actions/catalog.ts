import { contactContent } from "@/content/home";
import type { ActionCard } from "@/types/action-card";
import type { WebsiteGuideIntent } from "@/types/action-card";
import { isSafeActionHref } from "@/lib/ai/actions/routes";

const PRIMARY_PHONE = contactContent.phones[0]?.href ?? "tel:02156766772";
const MOBILE_PHONE =
  contactContent.phones.find((p) => p.href.includes("0938"))?.href ??
  "tel:09380190586";
const MAP_URL =
  contactContent.branches[0]?.mapUrl ??
  "https://maps.app.goo.gl/jKQLs65S6Jv8MfKv8?g_st=ac";

/** WhatsApp deep-link from published mobile (contactContent). */
function whatsappHrefFromTel(telHref: string): string {
  const digits = telHref.replace(/\D/g, "");
  const national = digits.startsWith("0") ? digits.slice(1) : digits;
  return `https://wa.me/98${national}`;
}

const WA_HREF = whatsappHrefFromTel(MOBILE_PHONE);

function card(
  partial: Omit<ActionCard, "priority"> & { priority: number },
): ActionCard | null {
  if (!isSafeActionHref(partial.href)) return null;
  return partial;
}

/**
 * Intent → action card catalog (existing site routes / published contacts only).
 */
export function catalogForIntent(intent: WebsiteGuideIntent): ActionCard[] {
  const lists: Record<WebsiteGuideIntent, Array<ActionCard | null>> = {
    tuition: [
      card({
        id: "tuition-view",
        type: "navigate",
        title: "مشاهده شهریه",
        subtitle: "استعلام از مسیر تماس و پذیرش",
        icon: "book",
        href: "/contact",
        priority: 10,
      }),
      card({
        id: "tuition-reg",
        type: "open-form",
        title: "ثبت نام",
        subtitle: "شروع پیش‌ثبت‌نام آنلاین",
        icon: "register",
        href: "/pre-registration",
        priority: 20,
      }),
      card({
        id: "tuition-consult",
        type: "navigate",
        title: "مشاوره",
        subtitle: "رزرو جلسه مشاوره تحصیلی",
        icon: "graduation",
        href: "/consultation",
        priority: 30,
      }),
    ],
    pre_registration: [
      card({
        id: "prereg-start",
        type: "open-form",
        title: "شروع پیش ثبت نام",
        subtitle: "ثبت درخواست پذیرش",
        icon: "register",
        href: "/pre-registration",
        priority: 10,
      }),
      card({
        id: "prereg-docs",
        type: "navigate",
        title: "مدارک لازم",
        subtitle: "راهنما و سوالات متداول",
        icon: "book",
        href: "/faq",
        priority: 20,
      }),
      card({
        id: "prereg-advisor",
        type: "navigate",
        title: "تماس با مشاور",
        subtitle: "گفتگو با تیم پذیرش",
        icon: "phone",
        href: "/contact",
        priority: 30,
      }),
    ],
    ghalamchi: [
      card({
        id: "gh-reg",
        type: "open-form",
        title: "ثبت نام قلم چی",
        subtitle: "مسیر ثبت‌نام نمایندگی",
        icon: "register",
        href: "/ghalamchi/register",
        priority: 10,
      }),
      card({
        id: "gh-exams",
        type: "navigate",
        title: "برنامه آزمون",
        subtitle: "خدمات و زمان‌بندی آزمون‌ها",
        icon: "calendar",
        href: "/exams",
        priority: 20,
      }),
      card({
        id: "gh-reports",
        type: "navigate",
        title: "کارنامه ها",
        subtitle: "آزمون و نتایج مرتبط",
        icon: "graduation",
        href: "/assessments",
        priority: 30,
      }),
    ],
    about_school: [
      card({
        id: "about-page",
        type: "navigate",
        title: "درباره ما",
        subtitle: "آشنایی با مجموعه ستارگان",
        icon: "graduation",
        href: "/about",
        priority: 10,
      }),
      card({
        id: "about-trophy",
        type: "navigate",
        title: "افتخارات",
        subtitle: "دستاوردهای تأییدشده",
        icon: "trophy",
        href: "/achievements",
        priority: 20,
      }),
      card({
        id: "about-gallery",
        type: "navigate",
        title: "گالری",
        subtitle: "فضای آموزشی و رویدادها",
        icon: "gallery",
        href: "/gallery",
        priority: 30,
      }),
    ],
    contact: [
      card({
        id: "contact-page",
        type: "navigate",
        title: "تماس",
        subtitle: "صفحه ارتباط با مرکز",
        icon: "phone",
        href: "/contact",
        priority: 10,
      }),
      card({
        id: "contact-map",
        type: "external",
        title: "مسیریابی",
        subtitle: "مسیر به شعبه روی نقشه",
        icon: "location",
        href: MAP_URL,
        priority: 20,
      }),
      card({
        id: "contact-wa",
        type: "external",
        title: "واتساپ",
        subtitle: "پیام به شماره رسمی موبایل",
        icon: "phone",
        href: WA_HREF,
        priority: 30,
      }),
      card({
        id: "contact-call",
        type: "call",
        title: "تماس تلفنی",
        subtitle: "شماره ثابت مرکز",
        icon: "phone",
        href: PRIMARY_PHONE,
        priority: 40,
      }),
    ],
    consultation: [
      card({
        id: "consult-book",
        type: "open-form",
        title: "رزرو مشاوره",
        subtitle: "شروع مسیر مشاوره تحصیلی",
        icon: "graduation",
        href: "/consultation",
        priority: 10,
      }),
      card({
        id: "consult-contact",
        type: "navigate",
        title: "تماس با مشاور",
        subtitle: "ارتباط مستقیم",
        icon: "phone",
        href: "/contact",
        priority: 20,
      }),
      card({
        id: "consult-reg",
        type: "open-form",
        title: "پیش‌ثبت‌نام",
        subtitle: "ثبت درخواست پذیرش",
        icon: "register",
        href: "/pre-registration",
        priority: 30,
      }),
    ],
    courses: [
      card({
        id: "courses-page",
        type: "navigate",
        title: "دوره‌ها",
        subtitle: "مشاهده دوره‌های آموزشی",
        icon: "book",
        href: "/courses",
        priority: 10,
      }),
      card({
        id: "classes-page",
        type: "navigate",
        title: "کلاس‌ها",
        subtitle: "برنامه کلاس‌های تقویتی",
        icon: "calendar",
        href: "/classes",
        priority: 20,
      }),
      card({
        id: "courses-reg",
        type: "open-form",
        title: "ثبت نام",
        subtitle: "پیش‌ثبت‌نام",
        icon: "register",
        href: "/pre-registration",
        priority: 30,
      }),
    ],
    exams: [
      card({
        id: "exams-page",
        type: "navigate",
        title: "آزمون‌ها",
        subtitle: "راهنمای آزمون‌ها",
        icon: "calendar",
        href: "/exams",
        priority: 10,
      }),
      card({
        id: "exams-assess",
        type: "navigate",
        title: "کارنامه‌ها",
        subtitle: "نتایج و ارزیابی",
        icon: "graduation",
        href: "/assessments",
        priority: 20,
      }),
    ],
    achievements: [
      card({
        id: "achievements-page",
        type: "navigate",
        title: "افتخارات",
        subtitle: "مشاهده دستاوردها",
        icon: "trophy",
        href: "/achievements",
        priority: 10,
      }),
      card({
        id: "achievements-students",
        type: "navigate",
        title: "دانش‌آموزان",
        subtitle: "نمونه‌های موفق",
        icon: "graduation",
        href: "/students",
        priority: 20,
      }),
    ],
    gallery: [
      card({
        id: "gallery-page",
        type: "navigate",
        title: "گالری",
        subtitle: "تصاویر فضای آموزشی",
        icon: "gallery",
        href: "/gallery",
        priority: 10,
      }),
    ],
    staros: [
      card({
        id: "staros-about",
        type: "navigate",
        title: "درباره مجموعه",
        subtitle: "آشنایی با اکوسیستم ستارگان",
        icon: "robot",
        href: "/about",
        priority: 10,
      }),
      card({
        id: "staros-contact",
        type: "navigate",
        title: "تماس",
        subtitle: "ارتباط با مرکز",
        icon: "phone",
        href: "/contact",
        priority: 20,
      }),
    ],
    general: [
      card({
        id: "general-reg",
        type: "open-form",
        title: "پیش‌ثبت‌نام",
        subtitle: "شروع مسیر پذیرش",
        icon: "register",
        href: "/pre-registration",
        priority: 10,
      }),
      card({
        id: "general-contact",
        type: "navigate",
        title: "تماس با مشاور",
        subtitle: "راهنمایی اختصاصی",
        icon: "phone",
        href: "/contact",
        priority: 20,
      }),
      card({
        id: "general-about",
        type: "navigate",
        title: "درباره ما",
        subtitle: "معرفی مجموعه",
        icon: "graduation",
        href: "/about",
        priority: 30,
      }),
    ],
    none: [],
  };

  return lists[intent].filter((item): item is ActionCard => Boolean(item));
}
