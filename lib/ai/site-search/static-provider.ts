import type {
  SiteSearchDocument,
  SiteSearchHit,
  SiteSearchProvider,
} from "@/lib/ai/site-search/types";

/**
 * Static corpus provider — architecture stand-in for DB/vector later.
 */
const STATIC_CORPUS: SiteSearchDocument[] = [
  {
    id: "page-about",
    collection: "pages",
    title: "درباره مؤسسه علمی ستارگان",
    summary: "داستان شکل‌گیری، مأموریت، چشم‌انداز و اکوسیستم آموزشی.",
    href: "/about",
    keywords: ["درباره", "مؤسسه", "تاریخچه", "مأموریت"],
  },
  {
    id: "page-achievements",
    collection: "achievements",
    title: "افتخارات",
    summary: "قبولی‌ها، المپیادها و دستاوردهای آموزشی مجموعه.",
    href: "/achievements",
    keywords: ["افتخارات", "قبولی", "تیزهوشان", "المپیاد"],
  },
  {
    id: "page-gallery",
    collection: "pages",
    title: "گالری",
    summary: "تصاویر فضای آموزشی و رویدادها.",
    href: "/gallery",
    keywords: ["گالری", "تصاویر", "مدرسه"],
  },
  {
    id: "page-courses",
    collection: "courses",
    title: "دوره‌ها",
    summary: "دوره‌ها و مسیرهای آموزشی تکمیلی.",
    href: "/courses",
    keywords: ["دوره", "کلاس", "آموزش"],
  },
  {
    id: "page-classes",
    collection: "courses",
    title: "کلاس‌ها",
    summary: "کلاس‌های تقویتی و برنامه‌های آموزشی.",
    href: "/classes",
    keywords: ["کلاس", "تقویتی", "برنامه"],
  },
  {
    id: "page-pre-reg",
    collection: "forms",
    title: "پیش‌ثبت‌نام",
    summary: "شروع مسیر پذیرش و انتخاب خدمت.",
    href: "/pre-registration",
    keywords: ["پیش ثبت نام", "ثبت نام", "پذیرش"],
  },
  {
    id: "page-faq",
    collection: "content",
    title: "سوالات متداول",
    summary: "پاسخ پرسش‌های رایج خانواده‌ها.",
    href: "/faq",
    keywords: ["سوالات", "متداول", "faq"],
  },
  {
    id: "page-contact",
    collection: "pages",
    title: "تماس با ما",
    summary: "راه‌های ارتباط با مشاوران و شعب.",
    href: "/contact",
    keywords: ["تماس", "آدرس", "تلفن"],
  },
  {
    id: "page-news",
    collection: "news",
    title: "اخبار و صفحات محتوا",
    summary: "اخبار و صفحات منتشرشده از طریق CMS عمومی.",
    href: "/p",
    keywords: ["خبر", "اخبار", "محتوا"],
  },
  {
    id: "page-ghalamchi",
    collection: "forms",
    title: "ثبت‌نام قلم‌چی",
    summary: "مسیر ثبت‌نام نمایندگی رسمی قلم‌چی نسیم‌شهر.",
    href: "/ghalamchi/register",
    keywords: ["قلم چی", "قلم‌چی", "آزمون"],
  },
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c\u200f]/g, "")
    .trim();
}

function scoreDocument(doc: SiteSearchDocument, query: string): number {
  const q = normalize(query);
  if (!q) return 0;
  let score = 0;
  const title = normalize(doc.title);
  const summary = normalize(doc.summary);
  if (title.includes(q)) score += 8;
  if (summary.includes(q)) score += 3;
  for (const keyword of doc.keywords) {
    const k = normalize(keyword);
    if (q.includes(k) || k.includes(q)) score += 5;
    for (const token of q.split(/\s+/)) {
      if (token.length >= 2 && (k.includes(token) || title.includes(token))) {
        score += 1.5;
      }
    }
  }
  return score;
}

export const staticSiteSearchProvider: SiteSearchProvider = {
  id: "static-corpus",
  label: "Static site content index",
  search(query: string, limit = 5): SiteSearchHit[] {
    return STATIC_CORPUS.map((document) => ({
      document,
      score: scoreDocument(document, query),
    }))
      .filter((hit) => hit.score >= 3)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  },
};
