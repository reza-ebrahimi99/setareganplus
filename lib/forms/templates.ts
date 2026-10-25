// Starting points for new forms. Prices are left at 0 on purpose: the institute sets real prices before publishing.
import type { FieldDef } from "./types";

type T = Omit<FieldDef, "id"> & { id?: string };
export type FormTemplate = {
  key: string;
  title: string;
  slug: string;
  icon: string;
  blurb: string;
  description: string;
  theme: string;
  payMode: "FREE" | "FIXED" | "OPTIONS";
  uniqueBy: "NONE" | "MOBILE" | "NATIONAL_CODE";
  submitLabel: string;
  successTitle: string;
  successMessage: string;
  fields: T[];
};

const CONSENT: T = { type: "consent", label: "اطلاعات واردشده را تأیید می‌کنم", help: "در صورت نادرست بودن اطلاعات، ثبت‌نام قابل پیگیری نخواهد بود.", required: true };

export const TEMPLATES: FormTemplate[] = [
  {
    key: "class",
    title: "ثبت‌نام کلاس تقویتی",
    slug: "kelas-taghviati-register",
    icon: "📚",
    blurb: "چندمرحله‌ای، انتخاب درس با قیمت جدا، پرداخت آنلاین",
    description: "برای ثبت‌نام در کلاس‌های تقویتی ستارگان، اطلاعات دانش‌آموز را وارد و درس‌ها را انتخاب کنید.\n\nپس از پرداخت، رسید و کد پیگیری فوراً صادر می‌شود.",
    theme: "navy",
    payMode: "OPTIONS",
    uniqueBy: "NATIONAL_CODE",
    submitLabel: "ثبت‌نام",
    successTitle: "ثبت‌نام کلاس انجام شد",
    successMessage: "برنامهٔ کلاس‌ها از طریق پیامک و تماس همکاران ما اطلاع‌رسانی می‌شود.",
    fields: [
      { type: "page", label: "اطلاعات دانش‌آموز" },
      { type: "text", label: "نام و نام خانوادگی دانش‌آموز", required: true },
      { type: "nationalCode", label: "کد ملی دانش‌آموز", required: true, half: true },
      { type: "grade", label: "پایهٔ تحصیلی", required: true, half: true },
      { type: "major", label: "رشته", half: true, help: "برای پایهٔ دهم به بالا" },
      { type: "text", label: "نام مدرسه", half: true },
      { type: "page", label: "انتخاب کلاس" },
      { type: "checkbox", label: "درس‌ها", required: true, options: ["ریاضی", "فیزیک", "شیمی", "زیست‌شناسی", "عربی", "زبان انگلیسی"], prices: {} },
      { type: "radio", label: "زمان ترجیحی", options: ["صبح", "عصر"] },
      { type: "page", label: "تماس و تأیید" },
      { type: "phone", label: "موبایل ولی", required: true, half: true },
      { type: "phone", label: "موبایل دانش‌آموز", half: true },
      CONSENT,
    ],
  },
  {
    key: "ghalamchi",
    title: "ثبت‌نام آزمون قلم‌چی",
    slug: "ghalamchi-register",
    icon: "📝",
    blurb: "هزینهٔ ثابت، عکس پرسنلی، یک ثبت‌نام برای هر کد ملی",
    description: "ثبت‌نام آزمون‌های آزمایشی کانون فرهنگی آموزش (قلم‌چی) در نمایندگی نسیم‌شهر.",
    theme: "crimson",
    payMode: "FIXED",
    uniqueBy: "NATIONAL_CODE",
    submitLabel: "ثبت‌نام",
    successTitle: "ثبت‌نام آزمون انجام شد",
    successMessage: "زمان و محل آزمون از طریق پیامک اطلاع‌رسانی می‌شود.",
    fields: [
      { type: "text", label: "نام و نام خانوادگی", required: true, half: true },
      { type: "nationalCode", label: "کد ملی", required: true, half: true },
      { type: "grade", label: "پایه", required: true, half: true },
      { type: "major", label: "رشته", half: true },
      { type: "phone", label: "شماره موبایل", required: true, half: true },
      { type: "radio", label: "نوع ثبت‌نام", required: true, options: ["ثبت‌نام جدید", "تمدید"], half: true },
      { type: "file", label: "عکس پرسنلی", help: "عکس رنگی و واضح از رو به رو" },
      CONSENT,
    ],
  },
  {
    key: "konkur",
    title: "پیش‌ثبت‌نام کنکور",
    slug: "konkur-pre-register",
    icon: "🎯",
    blurb: "رایگان، یک ثبت‌نام برای هر موبایل، پیامک تأیید",
    description: "برای اطلاع از برنامهٔ کلاس‌ها و آزمون‌های کنکور ستارگان پیش‌ثبت‌نام کنید؛ همکاران ما با شما تماس می‌گیرند.",
    theme: "royal",
    payMode: "FREE",
    uniqueBy: "MOBILE",
    submitLabel: "پیش‌ثبت‌نام",
    successTitle: "پیش‌ثبت‌نام شما ثبت شد",
    successMessage: "به‌زودی برای هماهنگی با شما تماس می‌گیریم.",
    fields: [
      { type: "text", label: "نام و نام خانوادگی", required: true, half: true },
      { type: "phone", label: "شماره موبایل", required: true, half: true },
      { type: "select", label: "پایه", required: true, options: ["دهم", "یازدهم", "دوازدهم", "فارغ‌التحصیل"], half: true },
      { type: "major", label: "رشته", required: true, half: true },
      { type: "textarea", label: "رشته یا دانشگاه هدف", placeholder: "اختیاری" },
      { type: "radio", label: "روش تماس ترجیحی", options: ["تماس تلفنی", "پیامک"] },
    ],
  },
  {
    key: "consult",
    title: "مشاوره رایگان",
    slug: "moshavere-rayegan",
    icon: "💬",
    blurb: "رایگان، موضوع مشاوره و زمان پیشنهادی",
    description: "درخواست جلسهٔ مشاورهٔ تحصیلی بدهید؛ برای تعیین وقت با شما تماس می‌گیریم.",
    theme: "emerald",
    payMode: "FREE",
    uniqueBy: "NONE",
    submitLabel: "درخواست مشاوره",
    successTitle: "درخواست مشاوره ثبت شد",
    successMessage: "برای هماهنگی زمان جلسه با شما تماس می‌گیریم.",
    fields: [
      { type: "text", label: "نام و نام خانوادگی", required: true, half: true },
      { type: "phone", label: "شماره موبایل", required: true, half: true },
      { type: "grade", label: "پایهٔ تحصیلی", required: true, half: true },
      { type: "radio", label: "موضوع مشاوره", required: true, options: ["انتخاب رشته", "برنامه‌ریزی درسی", "کنکور", "سایر"] },
      { type: "textarea", label: "توضیح موضوع", showIf: null, placeholder: "اختیاری" },
      { type: "date", label: "تاریخ پیشنهادی", half: true },
    ],
  },
];

const uid = () => "f_" + Math.random().toString(36).slice(2, 8);
export const withIds = (fields: T[]): FieldDef[] => fields.map((f) => ({ ...f, id: f.id ?? uid() }) as FieldDef);
