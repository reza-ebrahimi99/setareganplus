export const services = [
  {
    title: "دوره‌ها",
    description:
      "معرفی دوره‌های آموزشی مرکز، شرایط عمومی و مسیر آشنایی با ثبت‌نام.",
    href: "/courses",
    statusLabel: "اطلاعات خدمات",
    statusTone: "default" as const,
  },
  {
    title: "کلاس‌های تقویتی",
    description:
      "راهنمای کلاس‌های تقویتی مرکز و نحوه پیگیری مسیر ثبت‌نام.",
    href: "/classes",
    statusLabel: "در حال توسعه",
    statusTone: "development" as const,
  },
  {
    title: "آزمون‌های آموزشی",
    description:
      "اطلاعات آزمون‌های آموزشی مرکز و برنامه دسترسی دیجیتال.",
    href: "/exams",
    statusLabel: "اطلاعات خدمات",
    statusTone: "default" as const,
  },
  {
    title: "مشاوره تحصیلی",
    description:
      "آشنایی با خدمات مشاوره مرکز و مسیر درخواست راهنمایی.",
    href: "/consultation",
    statusLabel: "در حال توسعه",
    statusTone: "development" as const,
  },
  {
    title: "پیش‌ثبت‌نام",
    description:
      "راهنمای پیش‌ثبت‌نام در خدمات مرکز و مراحل آینده ثبت آنلاین.",
    href: "/pre-registration",
    statusLabel: "مسیر ثبت‌نام",
    statusTone: "enrollment" as const,
  },
  {
    title: "سوالات متداول",
    description:
      "پاسخ به پرسش‌های رایج درباره سکو، خدمات و مسیر ثبت‌نام.",
    href: "/faq",
    statusLabel: "اطلاعات خدمات",
    statusTone: "default" as const,
  },
] as const;
