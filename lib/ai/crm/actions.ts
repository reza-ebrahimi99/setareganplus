import type { AiCrmAction, AiCrmIntent } from "@/types/ai-crm";

/**
 * Structured CRM/navigation actions for admissions assistant.
 */
export function buildCrmActions(intent: AiCrmIntent): AiCrmAction[] {
  const catalog: Record<AiCrmIntent, AiCrmAction[]> = {
    ask_registration: [
      {
        id: "crm-pre-reg",
        type: "start_pre_registration",
        label: "شروع پیش‌ثبت‌نام",
        href: "/pre-registration",
      },
      {
        id: "crm-contact-reg",
        type: "contact_advisor",
        label: "تماس با مشاور",
        href: "/contact",
      },
    ],
    ask_consultation: [
      {
        id: "crm-book",
        type: "book_consultation",
        label: "رزرو مشاوره",
        href: "/consultation",
      },
      {
        id: "crm-contact-consult",
        type: "contact_advisor",
        label: "تماس با مشاور",
        href: "/contact",
      },
    ],
    ask_tuition: [
      {
        id: "crm-tuition",
        type: "view_tuition",
        label: "استعلام شهریه",
        href: "/contact",
      },
      {
        id: "crm-pre-reg-tuition",
        type: "start_pre_registration",
        label: "پیش‌ثبت‌نام",
        href: "/pre-registration",
      },
    ],
    ask_school: [
      {
        id: "crm-about-school",
        type: "view_about",
        label: "مشاهده دبستان",
        href: "/about",
      },
      {
        id: "crm-pre-reg-school",
        type: "start_pre_registration",
        label: "پیش‌ثبت‌نام",
        href: "/pre-registration",
      },
    ],
    ask_courses: [
      {
        id: "crm-courses",
        type: "view_courses",
        label: "مشاهده دوره‌ها",
        href: "/courses",
      },
      {
        id: "crm-classes",
        type: "view_courses",
        label: "کلاس‌ها",
        href: "/classes",
      },
    ],
    ask_exam: [
      {
        id: "crm-exams",
        type: "view_exams",
        label: "آزمون‌ها",
        href: "/exams",
      },
    ],
    ask_qalamchi: [
      {
        id: "crm-ghalamchi",
        type: "start_pre_registration",
        label: "ثبت‌نام قلم‌چی",
        href: "/ghalamchi/register",
      },
      {
        id: "crm-exams-q",
        type: "view_exams",
        label: "برنامه آزمون",
        href: "/exams",
      },
    ],
    ask_summer: [
      {
        id: "crm-summer",
        type: "start_pre_registration",
        label: "ثبت‌نام باشگاه تابستانی",
        href: "/pre-registration",
      },
    ],
    ask_staros: [
      {
        id: "crm-about-staros",
        type: "view_about",
        label: "درباره مجموعه",
        href: "/about",
      },
    ],
    ask_location: [
      {
        id: "crm-contact-loc",
        type: "view_contact",
        label: "آدرس و تماس",
        href: "/contact",
      },
    ],
    ask_contact: [
      {
        id: "crm-contact",
        type: "contact_advisor",
        label: "تماس با مشاور",
        href: "/contact",
      },
    ],
    ask_teacher: [
      {
        id: "crm-team",
        type: "view_about",
        label: "تیم آموزشی",
        href: "/team",
      },
    ],
    ask_schedule: [
      {
        id: "crm-schedule-contact",
        type: "contact_advisor",
        label: "پرسش برنامه از مشاور",
        href: "/contact",
      },
      {
        id: "crm-brochure",
        type: "download_brochure",
        label: "مشاهده خدمات",
        href: "/courses",
      },
    ],
    unknown: [
      {
        id: "crm-achievements",
        type: "navigate_achievements",
        label: "افتخارات",
        href: "/achievements",
      },
      {
        id: "crm-contact-unknown",
        type: "contact_advisor",
        label: "تماس با مشاور",
        href: "/contact",
      },
    ],
  };

  return catalog[intent] ?? catalog.unknown;
}
