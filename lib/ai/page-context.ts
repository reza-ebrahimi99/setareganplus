/**
 * Deep page context — automatic pathname/slug awareness for «ستاره».
 */

export type DeepPageKind =
  | "home"
  | "about"
  | "achievements"
  | "achievement-detail"
  | "gallery"
  | "gallery-detail"
  | "courses"
  | "course-detail"
  | "pre-registration"
  | "forms"
  | "form-detail"
  | "news"
  | "news-detail"
  | "services"
  | "service-detail"
  | "faq"
  | "contact"
  | "ghalamchi"
  | "general";

export type DeepPageContext = {
  kind: DeepPageKind;
  pathname: string;
  slug: string | null;
  service: string | null;
  label: string;
  instruction: string;
};

function segmentAt(pathname: string, index: number): string | null {
  const parts = pathname.split("/").filter(Boolean);
  return parts[index] ?? null;
}

/**
 * Resolve rich page context from the current public URL.
 */
export function resolveDeepPageContext(
  pathnameInput?: string | null,
): DeepPageContext {
  const pathname =
    pathnameInput?.trim() ||
    (typeof window !== "undefined" ? window.location.pathname : "/") ||
    "/";

  if (pathname === "/" || pathname === "") {
    return {
      kind: "home",
      pathname,
      slug: null,
      service: null,
      label: "صفحه اصلی",
      instruction:
        "User is on Home. Orient across school, Ghalamchi, courses, and pre-registration.",
    };
  }

  if (pathname === "/about" || pathname.startsWith("/about/")) {
    return {
      kind: "about",
      pathname,
      slug: null,
      service: null,
      label: "درباره ما",
      instruction: "Prioritize institution story, timeline, and trust facts.",
    };
  }

  if (pathname.startsWith("/achievements/")) {
    const slug = segmentAt(pathname, 1);
    return {
      kind: "achievement-detail",
      pathname,
      slug,
      service: null,
      label: "جزئیات افتخار",
      instruction: `User opened achievement slug «${slug ?? ""}». Discuss carefully; never invent identities.`,
    };
  }

  if (pathname === "/achievements") {
    return {
      kind: "achievements",
      pathname,
      slug: null,
      service: null,
      label: "افتخارات",
      instruction: "User is browsing achievements list.",
    };
  }

  if (pathname.startsWith("/gallery/")) {
    const slug = segmentAt(pathname, 1);
    return {
      kind: "gallery-detail",
      pathname,
      slug,
      service: null,
      label: "آلبوم گالری",
      instruction: `User opened gallery album «${slug ?? ""}».`,
    };
  }

  if (pathname === "/gallery") {
    return {
      kind: "gallery",
      pathname,
      slug: null,
      service: null,
      label: "گالری",
      instruction: "User is browsing gallery albums.",
    };
  }

  if (pathname.startsWith("/courses/") || pathname.startsWith("/classes/")) {
    const slug = segmentAt(pathname, 1);
    return {
      kind: "course-detail",
      pathname,
      slug,
      service: "courses",
      label: "جزئیات دوره/کلاس",
      instruction: `User opened course/class slug «${slug ?? ""}».`,
    };
  }

  if (pathname === "/courses" || pathname === "/classes") {
    return {
      kind: "courses",
      pathname,
      slug: null,
      service: "courses",
      label: "دوره‌ها و کلاس‌ها",
      instruction: "User is browsing courses/classes.",
    };
  }

  if (
    pathname === "/pre-registration" ||
    pathname.startsWith("/pre-registration/")
  ) {
    return {
      kind: "pre-registration",
      pathname,
      slug: null,
      service: "registration",
      label: "پیش‌ثبت‌نام",
      instruction: "Help the user choose a service and continue pre-registration.",
    };
  }

  if (pathname.startsWith("/forms/")) {
    const slug = segmentAt(pathname, 1);
    return {
      kind: "form-detail",
      pathname,
      slug,
      service: "forms",
      label: "فرم عمومی",
      instruction: `User opened public form «${slug ?? ""}». Guide completion without inventing fields.`,
    };
  }

  if (pathname === "/forms") {
    return {
      kind: "forms",
      pathname,
      slug: null,
      service: "forms",
      label: "فرم‌ها",
      instruction: "User is exploring public forms.",
    };
  }

  if (pathname.startsWith("/register/")) {
    const slug = segmentAt(pathname, 1);
    return {
      kind: "service-detail",
      pathname,
      slug,
      service: "registration",
      label: "ثبت‌نام خدمت",
      instruction: `User is in registration flow «${slug ?? ""}».`,
    };
  }

  if (pathname.startsWith("/book/")) {
    const slug = segmentAt(pathname, 1);
    return {
      kind: "service-detail",
      pathname,
      slug,
      service: "booking",
      label: "رزرو خدمت",
      instruction: `User opened booking service «${slug ?? ""}».`,
    };
  }

  if (pathname.startsWith("/ghalamchi")) {
    return {
      kind: "ghalamchi",
      pathname,
      slug: segmentAt(pathname, 2),
      service: "ghalamchi",
      label: "قلم‌چی",
      instruction: "User is in Ghalamchi registration/services area.",
    };
  }

  if (pathname === "/faq" || pathname.startsWith("/faq/")) {
    return {
      kind: "faq",
      pathname,
      slug: null,
      service: null,
      label: "سوالات متداول",
      instruction: "Prefer FAQ-style concise answers and contact handoff.",
    };
  }

  if (pathname === "/contact" || pathname.startsWith("/contact/")) {
    return {
      kind: "contact",
      pathname,
      slug: null,
      service: null,
      label: "تماس",
      instruction: "Help the user reach advisors and branches.",
    };
  }

  // News / CMS pages
  if (pathname.startsWith("/p/")) {
    const slug = segmentAt(pathname, 1);
    return {
      kind: "news-detail",
      pathname,
      slug,
      service: null,
      label: "صفحه محتوا",
      instruction: `User opened CMS/news page «${slug ?? ""}».`,
    };
  }

  return {
    kind: "general",
    pathname,
    slug: null,
    service: null,
    label: "صفحه عمومی",
    instruction: "Stay focused on institutional admissions and education guidance.",
  };
}

export function formatDeepPageContextForPrompt(ctx: DeepPageContext): string {
  return [
    "DEEP PAGE CONTEXT",
    `kind: ${ctx.kind}`,
    `label: ${ctx.label}`,
    `pathname: ${ctx.pathname}`,
    `slug: ${ctx.slug ?? "—"}`,
    `service: ${ctx.service ?? "—"}`,
    `instruction: ${ctx.instruction}`,
    "Injected automatically. Do not invent page-specific unpublished details.",
  ].join("\n");
}
