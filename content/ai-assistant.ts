export const AI_WELCOME_MESSAGE = `سلام 👋
من «ستاره» هستم.
دستیار هوشمند مؤسسه علمی ستارگان.
می‌توانم درباره موارد زیر راهنمایی‌تان کنم:
🏫 دبستان غیردولتی ستارگان آینده
📘 نمایندگی رسمی قلم‌چی نسیم‌شهر
📚 آموزشگاه علمی و تقویتی
🧠 تیزهوشان و نمونه دولتی
☀️ باشگاه تابستانی
📝 پیش‌ثبت‌نام
🤖 سامانه StarOS
هر سؤال آموزشی یا ثبت‌نامی داشته باشید، در کنار شما هستم.`;

export const AI_SUGGESTIONS = [
  "پیش‌ثبت‌نام",
  "دبستان",
  "قلم‌چی",
  "تیزهوشان",
  "شهریه",
  "کلاس‌ها",
  "باشگاه تابستانی",
  "تماس با مشاور",
] as const;

export const AI_HEADER = {
  title: "ستاره",
  subtitle: "دستیار هوشمند مؤسسه علمی ستارگان",
  statusLabel: "آنلاین",
  fabLabel: "✨ ستاره",
  fabTooltip: "مشاور هوشمند مؤسسه علمی ستارگان",
  closeLabel: "بستن ستاره",
  backdropLabel: "بستن پس‌زمینه ستاره",
  composerLabel: "پیام به ستاره",
} as const;

/** UI-only contextual opener by public pathname. */
export function getAiContextPrompt(pathname: string | null): string {
  if (!pathname || pathname === "/") {
    return "چطور می‌توانم کمکتان کنم؟";
  }

  if (pathname === "/about" || pathname.startsWith("/about/")) {
    return "درباره مؤسسه سؤال دارید؟";
  }

  if (
    pathname === "/pre-registration" ||
    pathname.startsWith("/pre-registration/")
  ) {
    return "در انتخاب خدمت مناسب کمکتان کنم؟";
  }

  if (pathname === "/achievements" || pathname.startsWith("/achievements/")) {
    return "درباره افتخارات و قبولی‌ها سؤال دارید؟";
  }

  if (pathname === "/gallery" || pathname.startsWith("/gallery/")) {
    return "دنبال تصاویر مدرسه یا مؤسسه هستید؟";
  }

  return "چطور می‌توانم کمکتان کنم؟";
}
