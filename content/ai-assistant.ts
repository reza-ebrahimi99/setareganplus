export const AI_WELCOME_MESSAGE = `سلام 👋
خوش اومدی.
از کجا شروع کنیم؟`;

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
  title: "آترین",
  subtitle: "همراه آموزشی مؤسسه علمی ستارگان",
  statusLabel: "آنلاین",
  fabLabel: "آترین",
  fabTooltip: "آترین — همراه آموزشی مؤسسه علمی ستارگان",
  closeLabel: "بستن آترین",
  backdropLabel: "بستن پس‌زمینه آترین",
  composerLabel: "پیام به آترین",
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

  if (pathname === "/atrin" || pathname.startsWith("/atrin/")) {
    return "از آترین چه کمکی می‌خواهید؟";
  }

  return "چطور می‌توانم کمکتان کنم؟";
}
