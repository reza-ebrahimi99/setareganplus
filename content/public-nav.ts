/**
 * Public primary navigation.
 * Kept separate while content/site.ts may be editor-locked; includes /gallery.
 */
export const publicNavLinks = [
  { href: "/", label: "صفحه اصلی" },
  { href: "/team", label: "تیم ما" },
  { href: "/achievements", label: "افتخارات" },
  { href: "/gallery", label: "گالری" },
  { href: "/assessments", label: "آزمون" },
  { href: "/courses", label: "دوره‌ها" },
  { href: "/classes", label: "کلاس‌ها" },
  { href: "/exams", label: "آزمون‌ها" },
  { href: "/consultation", label: "مشاوره" },
  { href: "/pre-registration", label: "پیش‌ثبت‌نام" },
] as const;
