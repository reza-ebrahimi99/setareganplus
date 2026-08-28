import { detectAiIntent } from "@/lib/ai/actions";
import type { DeepPageContext } from "@/lib/ai/page-context";
import type { AiAction } from "@/types/ai-actions";

const BASE_SUGGESTIONS: AiAction[] = [
  {
    id: "sug-reg",
    type: "registration",
    label: "پیش‌ثبت‌نام",
    href: "/pre-registration",
  },
  {
    id: "sug-consult",
    type: "page",
    label: "مشاوره",
    href: "/consultation",
  },
  {
    id: "sug-classes",
    type: "page",
    label: "کلاس‌ها",
    href: "/classes",
  },
  {
    id: "sug-summer",
    type: "registration",
    label: "باشگاه تابستانی",
    href: "/pre-registration",
  },
  {
    id: "sug-achievements",
    type: "page",
    label: "افتخارات",
    href: "/achievements",
  },
  {
    id: "sug-contact",
    type: "contact",
    label: "تماس",
    href: "/contact",
  },
  {
    id: "sug-about",
    type: "page",
    label: "درباره ما",
    href: "/about",
  },
  {
    id: "sug-faq",
    type: "page",
    label: "سوالات متداول",
    href: "/faq",
  },
];

/**
 * Contextual quick actions after each response (page + conversation aware).
 */
export function buildSmartSuggestions(input: {
  query: string;
  page: DeepPageContext;
  recentUserTexts?: readonly string[];
}): AiAction[] {
  const corpus = [input.query, ...(input.recentUserTexts ?? [])].join(" ");
  const intent = detectAiIntent(corpus);
  const ranked = [...BASE_SUGGESTIONS];

  const boost = (href: string) => {
    const index = ranked.findIndex((item) => item.href === href);
    if (index > 0) {
      const [item] = ranked.splice(index, 1);
      if (item) ranked.unshift(item);
    }
  };

  switch (input.page.kind) {
    case "pre-registration":
    case "forms":
    case "form-detail":
    case "ghalamchi":
      boost("/pre-registration");
      boost("/contact");
      break;
    case "achievements":
    case "achievement-detail":
      boost("/achievements");
      boost("/courses");
      break;
    case "gallery":
    case "gallery-detail":
      boost("/gallery");
      boost("/about");
      break;
    case "courses":
    case "course-detail":
      boost("/classes");
      boost("/consultation");
      break;
    case "about":
      boost("/about");
      boost("/achievements");
      break;
    case "contact":
    case "faq":
      boost("/contact");
      boost("/faq");
      break;
    default:
      break;
  }

  if (intent === "gifted") {
    boost("/courses");
    boost("/achievements");
  }
  if (intent === "summer-club") {
    boost("/pre-registration");
    boost("/classes");
  }
  if (intent === "ghalamchi") {
    boost("/ghalamchi/register");
    boost("/exams");
  }
  if (intent === "school-registration") {
    boost("/pre-registration");
    boost("/about");
  }

  // Ensure ghalamchi register exists in pool when boosted
  if (intent === "ghalamchi") {
    ranked.unshift({
      id: "sug-ghalamchi",
      type: "registration",
      label: "ثبت‌نام",
      href: "/ghalamchi/register",
    });
  }

  const seen = new Set<string>();
  const unique: AiAction[] = [];
  for (const item of ranked) {
    if (seen.has(item.href)) continue;
    seen.add(item.href);
    unique.push(item);
    if (unique.length >= 6) break;
  }
  return unique;
}
