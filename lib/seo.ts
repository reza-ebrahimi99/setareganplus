import { cache } from "react";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/shop/config";
import { toEn } from "@/lib/format";
import type { ContactSettings } from "@/lib/settings";

/* ------------------------------------------------------------------ */
/* Admin-editable SEO settings (Setting key "seo"; no schema change)   */
/* ------------------------------------------------------------------ */
export type SeoPageOverride = { title?: string; description?: string; intro?: string; faq?: string };
export type SeoSettings = {
  /** content of <meta name="google-site-verification"> */
  googleVerification?: string;
  /** content of <meta name="msvalidate.01"> (Bing Webmaster) */
  bingVerification?: string;
  /** per-branch coordinates, same order as contact.branches */
  geo?: { lat?: string; lng?: string }[];
  /** one rule per line: "Sa-We 12:00-20:30" */
  openingHours?: string;
  /** Ghalamchi exam calendar, one per line: "تاریخ | عنوان | توضیح" */
  examCalendar?: string;
  pages?: Record<string, SeoPageOverride>;
};

export const getSeo = cache(async (): Promise<SeoSettings> => {
  try {
    const row = await prisma.setting.findUnique({ where: { key: "seo" } });
    return (row?.value as SeoSettings) ?? {};
  } catch {
    return {};
  }
});

export const getContact = cache(async (): Promise<ContactSettings> => {
  try {
    const row = await prisma.setting.findUnique({ where: { key: "contact" } });
    const v = (row?.value ?? {}) as Partial<ContactSettings>;
    return { phones: v.phones ?? [], hours: v.hours ?? [], branches: v.branches ?? [], social: v.social ?? [], enamadUrl: v.enamadUrl };
  } catch {
    return { phones: [], hours: [], branches: [], social: [] };
  }
});

/* ------------------------------------------------------------------ */
/* Key pages: sensible Persian defaults; owner can override each one   */
/* ------------------------------------------------------------------ */
export const ORG_NAME = "مؤسسه علمی ستارگان";
export const BRAND = "ستارگان پلاس";

export type PageKey = keyof typeof PAGES;
export const PAGES = {
  home: {
    label: "صفحهٔ اصلی", path: "/",
    title: "ستارگان پلاس | آموزشگاه تقویتی، کنکور و نمایندگی قلم‌چی نسیم‌شهر",
    description: "مؤسسه علمی ستارگان در نسیم‌شهر: آموزشگاه تقویتی و کنکور ستارگان، نمایندگی قلم‌چی نسیم‌شهر، مشاوره تحصیلی و خرید آنلاین جزوه با تحویل حضوری در شعبه.",
  },
  education: {
    label: "آموزشگاه تقویتی و کنکور", path: "/education",
    title: "آموزشگاه تقویتی و کنکور ستارگان نسیم‌شهر",
    description: "آموزشگاه تقویتی و کنکور ستارگان در نسیم‌شهر: تقویت پایه متوسطه اول و دوم، کلاس‌های تیزهوشان و نمونه دولتی، آمادگی کنکور و مشاوره تحصیلی.",
  },
  ghalamchi: {
    label: "نمایندگی قلم‌چی", path: "/ghalamchi",
    title: "نمایندگی قلم‌چی نسیم‌شهر",
    description: "نمایندگی رسمی کانون فرهنگی آموزش (قلم‌چی) در نسیم‌شهر با شعبهٔ دختران و شعبهٔ پسران؛ برنامهٔ آموزشی، آزمون‌های منظم و مشاوره.",
  },
  shop: {
    label: "فروشگاه جزوه", path: "/shop",
    title: "فروشگاه جزوه | خرید آنلاین جزوه کنکور و درسی",
    description: "خرید آنلاین جزوه‌های مدرسان ستارگان و قلم‌چی نسیم‌شهر؛ پرداخت امن و تحویل حضوری در شعبه.",
    intro: "",
  },
  news: {
    label: "اخبار و اطلاعیه‌ها", path: "/news",
    title: "اخبار و اطلاعیه‌ها",
    description: "تازه‌ترین اطلاعیه‌ها، زمان آزمون‌ها، کلاس‌ها و نتایج مؤسسه علمی ستارگان و نمایندگی قلم‌چی نسیم‌شهر.",
    intro: "اطلاعیه‌های ثبت‌نام، زمان آزمون‌ها، شروع کلاس‌ها و خبرهای مؤسسه علمی ستارگان نسیم‌شهر را اینجا دنبال کنید.",
  },
  contact: {
    label: "تماس با ما", path: "/contact",
    title: "تماس با ما و نشانی شعبه‌ها",
    description: "شماره‌های تماس، نشانی شعبه‌های دختران و پسران در نسیم‌شهر، مسیر روی نقشه و ساعات کاری مؤسسه علمی ستارگان.",
  },
  about: {
    label: "درباره ما", path: "/about",
    title: "درباره مؤسسه علمی ستارگان نسیم‌شهر",
    description: "داستان، مأموریت، چشم‌انداز و ارزش‌های مؤسسه علمی ستارگان نسیم‌شهر.",
  },
  team: {
    label: "تیم ما", path: "/team",
    title: "تیم ما؛ مدیران، مشاوران و مدرسان",
    description: "مدیران، مشاوران و مدرسان مؤسسه علمی ستارگان و نمایندگی قلم‌چی نسیم‌شهر.",
  },
  gallery: {
    label: "گالری", path: "/gallery",
    title: "گالری تصاویر",
    description: "تصاویر آزمون‌ها، کلاس‌ها، همایش‌ها و جلسات مشاورهٔ مؤسسه علمی ستارگان نسیم‌شهر.",
  },
  faq: {
    label: "سؤالات متداول", path: "/faq",
    title: "سؤالات متداول",
    description: "پاسخ پرسش‌های رایج دربارهٔ ثبت‌نام، خدمات، شعبه‌ها و خرید جزوه در مؤسسه علمی ستارگان نسیم‌شهر.",
  },
  achievements: {
    label: "افتخارات", path: "/achievements",
    title: "افتخارات و قبولی‌ها",
    description: "قبولی‌های کنکور، مدارس تیزهوشان و نمونه دولتی دانش‌آموزان مؤسسه علمی ستارگان نسیم‌شهر.",
  },
  register: {
    label: "پیش‌ثبت‌نام", path: "/register",
    title: "پیش‌ثبت‌نام آنلاین",
    description: "فرم پیش‌ثبت‌نام آنلاین خدمات مؤسسه علمی ستارگان نسیم‌شهر؛ همکاران ما برای ادامهٔ مراحل با شما تماس می‌گیرند.",
  },
  // ---- local guide pages ----
  konkur: {
    label: "راهنما: کنکور در نسیم‌شهر", path: "/konkur-nasimshahr",
    title: "کنکور در نسیم‌شهر | کلاس، مشاوره، آزمون و جزوه",
    description: "هر آنچه برای آمادگی کنکور در نسیم‌شهر لازم است: آموزشگاه کنکور ستارگان، آزمون‌های قلم‌چی، مشاوره تحصیلی، جزوه و نشانی شعبه‌ها.",
    intro: "برای آمادگی کنکور در نسیم‌شهر لازم نیست راه دوری بروید. در این صفحه دوره‌ها، آزمون‌ها، جزوه‌ها و راه‌های ارتباط با مؤسسه علمی ستارگان را یک‌جا آورده‌ایم.",
  },
  amoozeshgah: {
    label: "راهنما: آموزشگاه تقویتی", path: "/amoozeshgah-taghviati-nasimshahr",
    title: "آموزشگاه تقویتی نسیم‌شهر | ستارگان",
    description: "آموزشگاه تقویتی و کنکور ستارگان در نسیم‌شهر: تقویت پایه، تیزهوشان و نمونه دولتی، کنکور، مشاوره و پانسیون مطالعاتی؛ با نشانی و راه‌های ثبت‌نام.",
    intro: "آموزشگاه تقویتی و کنکور ستارگان در نسیم‌شهر کنار دانش‌آموزان متوسطه اول و دوم است؛ از تقویت پایه تا آمادگی آزمون‌های تیزهوشان، نمونه دولتی و کنکور.",
  },
  ghalamchiGuide: {
    label: "راهنما: آزمون‌های قلم‌چی", path: "/ghalamchi-nasimshahr",
    title: "آزمون‌های قلم‌چی در نسیم‌شهر | تقویم و ثبت‌نام",
    description: "نمایندگی قلم‌چی نسیم‌شهر: تقویم آزمون‌ها، روش ثبت‌نام آنلاین، شعبهٔ دختران و پسران و پاسخ پرسش‌های رایج.",
    intro: "نمایندگی رسمی کانون فرهنگی آموزش (قلم‌چی) در نسیم‌شهر با دو شعبهٔ جداگانه برای دختران و پسران فعالیت می‌کند. در این صفحه روند ثبت‌نام و تقویم آزمون‌ها آمده است.",
  },
  jozve: {
    label: "راهنما: جزوه کنکور", path: "/jozve-konkur",
    title: "جزوه کنکور و جزوه درسی | خرید آنلاین در نسیم‌شهر",
    description: "خرید آنلاین جزوه کنکور و جزوه‌های درسی مدرسان ستارگان و قلم‌چی نسیم‌شهر به تفکیک پایه؛ پرداخت امن و تحویل حضوری در شعبه.",
    intro: "جزوه‌های مدرسان ستارگان و نمایندگی قلم‌چی نسیم‌شهر را آنلاین سفارش دهید و پس از آماده شدن، در شعبهٔ انتخابی تحویل بگیرید.",
  },
  classes: {
    label: "راهنما: کلاس تقویتی به تفکیک پایه", path: "/kelas-taghviati",
    title: "کلاس تقویتی در نسیم‌شهر به تفکیک پایه",
    description: "کلاس‌های تقویتی متوسطه اول و دوم، تیزهوشان و نمونه دولتی و کنکور در آموزشگاه ستارگان نسیم‌شهر؛ همراه با جزوه‌ها و افتخارات هر پایه.",
    intro: "کلاس تقویتی مناسب هر پایه متفاوت است. اینجا خدمات آموزشگاه ستارگان را به تفکیک مقطع، همراه با جزوه‌ها و نتایج هر بخش می‌بینید.",
  },
} satisfies Record<string, { label: string; path: string; title: string; description: string; intro?: string }>;

export const LANDINGS: PageKey[] = ["konkur", "amoozeshgah", "ghalamchiGuide", "jozve", "classes"];

export async function pageText(key: PageKey) {
  const seo = await getSeo();
  const d = PAGES[key] as { label: string; path: string; title: string; description: string; intro?: string };
  const o = seo.pages?.[key] ?? {};
  return {
    ...d,
    title: o.title?.trim() || d.title,
    description: o.description?.trim() || d.description,
    intro: o.intro?.trim() || d.intro || "",
    faq: parseFaq(o.faq ?? ""),
  };
}

/** "سؤال | پاسخ" per line (or "سؤال؟" line followed by answer line[s] separated by blank line). */
export function parseFaq(text: string): { q: string; a: string }[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.includes("|"))
    .map((l) => {
      const i = l.indexOf("|");
      return { q: l.slice(0, i).trim(), a: l.slice(i + 1).trim() };
    })
    .filter((x) => x.q && x.a);
}

/* ------------------------------------------------------------------ */
/* Metadata                                                            */
/* ------------------------------------------------------------------ */
export function buildMeta(o: {
  title: string;
  description?: string;
  path: string;
  absoluteTitle?: boolean;
  images?: { url: string; alt?: string; width?: number; height?: number }[];
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  noindex?: boolean;
}): Metadata {
  const path = o.path === "" ? "/" : o.path;
  // Child metadata replaces the root openGraph object, so always name an image
  // (the generated site card) unless the page brings its own.
  const images = o.images?.length ? o.images : [{ url: "/opengraph-image", width: 1200, height: 630, alt: BRAND }];
  return {
    title: o.absoluteTitle ? { absolute: o.title } : o.title,
    description: o.description,
    alternates: { canonical: path, languages: { "fa-IR": path, "x-default": path } },
    openGraph: {
      type: o.type ?? "website",
      locale: "fa_IR",
      siteName: BRAND,
      url: path,
      title: o.title,
      description: o.description,
      images,
      ...(o.publishedTime ? { publishedTime: o.publishedTime } : {}),
      ...(o.modifiedTime ? { modifiedTime: o.modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: o.title,
      description: o.description,
      images: images.map((i) => i.url),
    },
    ...(o.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

/** Metadata for one of the key pages, honoring owner overrides. */
export async function pageMeta(key: PageKey, extra: Partial<Parameters<typeof buildMeta>[0]> = {}): Promise<Metadata> {
  const t = await pageText(key);
  return buildMeta({ title: t.title, description: t.description, path: t.path, absoluteTitle: key === "home", ...extra });
}

/* ------------------------------------------------------------------ */
/* JSON-LD                                                             */
/* ------------------------------------------------------------------ */
export { abs, breadcrumbLd, type Crumb } from "@/lib/ld";
import { abs } from "@/lib/ld";

/** "02156766772" -> "+98-21-56766772", "0938..." -> "+98-938..." */
export function intlPhone(raw: string): string {
  const n = toEn(raw).replace(/\D/g, "");
  if (n.startsWith("021") && n.length === 11) return `+98-21-${n.slice(3)}`;
  if (n.startsWith("0") && n.length === 11) return `+98-${n.slice(1)}`;
  return raw;
}

const DAYS: Record<string, string> = { sa: "Saturday", su: "Sunday", mo: "Monday", tu: "Tuesday", we: "Wednesday", th: "Thursday", fr: "Friday" };
const ORDER = ["sa", "su", "mo", "tu", "we", "th", "fr"];

/** "Sa-We 12:00-20:30" / "Th 10:00-20:30" / "Sa,Mo 09:00-12:00" → OpeningHoursSpecification[] */
export function parseOpeningHours(text = "") {
  const out: { "@type": "OpeningHoursSpecification"; dayOfWeek: string[]; opens: string; closes: string }[] = [];
  for (const raw of text.split("\n")) {
    const m = toEn(raw.trim()).match(/^([A-Za-z,\- ]+)\s+(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})$/);
    if (!m) continue;
    const days: string[] = [];
    for (const part of m[1].toLowerCase().replace(/\s/g, "").split(",")) {
      const [a, b] = part.split("-").map((x) => x.slice(0, 2));
      if (!(a in DAYS)) continue;
      if (b && b in DAYS) {
        let i = ORDER.indexOf(a);
        const j = ORDER.indexOf(b);
        for (let k = 0; k < 7; k++, i = (i + 1) % 7) {
          days.push(DAYS[ORDER[i]]);
          if (i === j) break;
        }
      } else days.push(DAYS[a]);
    }
    const pad = (t: string) => t.padStart(5, "0");
    if (days.length) out.push({ "@type": "OpeningHoursSpecification", dayOfWeek: days, opens: pad(m[2]), closes: pad(m[3]) });
  }
  return out;
}

function geoOf(g?: { lat?: string; lng?: string }) {
  const lat = Number.parseFloat(toEn(g?.lat ?? "")), lng = Number.parseFloat(toEn(g?.lng ?? ""));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined;
  return { "@type": "GeoCoordinates", latitude: lat, longitude: lng };
}

function postal(address: string) {
  const local = /نسیم[‌ ]?شهر/.test(address);
  return {
    "@type": "PostalAddress",
    streetAddress: address.replace(/^نسیم[‌ ]?شهر[،,]\s*/, ""),
    ...(local ? { addressLocality: "نسیم‌شهر", addressRegion: "استان تهران" } : {}),
    addressCountry: "IR",
  };
}

export const AREA_SERVED = [
  { "@type": "City", name: "نسیم‌شهر" },
  { "@type": "AdministrativeArea", name: "شهرستان بهارستان" },
  { "@type": "AdministrativeArea", name: "استان تهران" },
];

/** EducationalOrganization + LocalBusiness built only from settings. */
export async function organizationLd() {
  const [contact, seo] = await Promise.all([getContact(), getSeo()]);
  const site = siteUrl();
  const hours = parseOpeningHours(seo.openingHours);
  const b0 = contact.branches[0];
  const sameAs = contact.social.map((s) => s.url).filter((u) => /^https?:\/\//.test(u));
  return {
    "@context": "https://schema.org",
    "@type": ["EducationalOrganization", "LocalBusiness"],
    "@id": `${site}/#organization`,
    name: ORG_NAME,
    alternateName: [BRAND, "Setaregan Plus"],
    url: `${site}/`,
    logo: `${site}/brand/logo.png`,
    image: `${site}/opengraph-image`,
    ...(contact.phones.length ? { telephone: intlPhone(contact.phones[0]) } : {}),
    ...(b0 ? { address: postal(b0.address) } : {}),
    ...(geoOf(seo.geo?.[0]) ? { geo: geoOf(seo.geo?.[0]) } : {}),
    ...(hours.length ? { openingHoursSpecification: hours } : {}),
    ...(b0?.mapUrl ? { hasMap: b0.mapUrl } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    areaServed: AREA_SERVED,
    ...(contact.phones.length
      ? { contactPoint: contact.phones.map((p) => ({ "@type": "ContactPoint", telephone: intlPhone(p), contactType: "customer service", availableLanguage: "fa" })) }
      : {}),
    subOrganization: [
      { "@type": "EducationalOrganization", name: "آموزشگاه تقویتی و کنکور ستارگان", url: `${site}/education` },
      { "@type": "EducationalOrganization", name: "نمایندگی قلم‌چی نسیم‌شهر", url: `${site}/ghalamchi` },
    ],
    ...(contact.branches.length
      ? {
          department: contact.branches.map((b, i) => ({
            "@type": ["EducationalOrganization", "LocalBusiness"],
            "@id": `${site}/#branch-${i + 1}`,
            name: `${ORG_NAME} — ${b.name}`,
            address: postal(b.address),
            ...(geoOf(seo.geo?.[i]) ? { geo: geoOf(seo.geo?.[i]) } : {}),
            ...(b.mapUrl ? { hasMap: b.mapUrl } : {}),
            ...(contact.phones.length ? { telephone: intlPhone(contact.phones[0]) } : {}),
            ...(hours.length ? { openingHoursSpecification: hours } : {}),
            areaServed: AREA_SERVED,
            parentOrganization: { "@id": `${site}/#organization` },
          })),
        }
      : {}),
  };
}

export function websiteLd() {
  const site = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${site}/#website`,
    name: BRAND,
    alternateName: ORG_NAME,
    url: `${site}/`,
    inLanguage: "fa-IR",
    publisher: { "@id": `${site}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${site}/shop?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function faqLd(items: { q: string; a: string }[]) {
  if (!items.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })),
  };
}
