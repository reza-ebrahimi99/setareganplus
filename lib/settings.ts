import { prisma } from "@/lib/prisma";

export type Branch = { name: string; address: string; mapUrl?: string };
export type ContactSettings = {
  phones: string[];
  hours: string[];
  branches: Branch[];
  social: { label: string; url: string }[];
  enamadUrl?: string;
};
export type Stat = { value: string; label: string };
export type HomeSettings = {
  eyebrow: string;
  title: string;
  subtitle: string;
  slogan: string;
  heroImage: string;
};
export type AboutSettings = {
  intro: string;
  mission: string;
  vision: string;
  values: { title: string; text: string }[];
  timeline: { year: string; title: string; text?: string }[];
  founder: { name: string; title: string; bio: string; points: string[]; photo: string };
  images: { src: string; alt: string }[];
};

/** Top-of-home highlight (e.g. the ceremony photo). Shown above the hero when enabled. */
export type HighlightSettings = {
  enabled: boolean;
  title: string;
  subtitle: string;
  text: string;
  image: string;
  imageAlt: string;
  ctaLabel: string;
  ctaHref: string;
};

export const DEFAULT_HIGHLIGHT_IMAGE = "/highlight/tajlil-1405.webp";
export const DEFAULT_HIGHLIGHT: HighlightSettings = {
  enabled: true,
  title: "آیین تجلیل از رتبه‌های برتر کنکور ۱۴۰۵",
  subtitle: "نمایندگی قلم‌چی نسیم‌شهر",
  text: "به همهٔ دانش‌آموزان پرتلاش، خانواده‌های همراه و دبیران دلسوزشان تبریک می‌گوییم؛ این موفقیت حاصل یک سال تلاش و پشتکار است.",
  image: DEFAULT_HIGHLIGHT_IMAGE,
  imageAlt: "آیین تجلیل از رتبه‌های برتر کنکور ۱۴۰۵ در نمایندگی قلم‌چی نسیم‌شهر؛ دانش‌آموزان برتر کنار بنر مراسم",
  ctaLabel: "آزمون‌های قلم‌چی نسیم‌شهر",
  ctaHref: "/ghalamchi-nasimshahr",
};

export type Settings = {
  highlight: HighlightSettings;
  contact: ContactSettings;
  stats: Stat[];
  home: HomeSettings;
  about: AboutSettings;
};

export const EMPTY_SETTINGS: Settings = {
  highlight: DEFAULT_HIGHLIGHT,
  contact: { phones: [], hours: [], branches: [], social: [] },
  stats: [],
  home: { eyebrow: "", title: "", subtitle: "", slogan: "", heroImage: "" },
  about: {
    intro: "",
    mission: "",
    vision: "",
    values: [],
    timeline: [],
    founder: { name: "", title: "", bio: "", points: [], photo: "" },
    images: [],
  },
};

export async function getSettings(): Promise<Settings> {
  const rows = await prisma.setting.findMany();
  const out = structuredClone(EMPTY_SETTINGS) as Record<string, unknown>;
  for (const r of rows) out[r.key] = r.value;
  // highlight: stored fields override the defaults one by one (an empty image falls back to the ceremony photo)
  const h = { ...DEFAULT_HIGHLIGHT, ...((out.highlight as Partial<HighlightSettings>) ?? {}) };
  if (!h.image) h.image = DEFAULT_HIGHLIGHT_IMAGE;
  out.highlight = h;
  return out as Settings;
}

export async function saveSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  await prisma.setting.upsert({
    where: { key },
    create: { key, value: value as object },
    update: { value: value as object },
  });
}
