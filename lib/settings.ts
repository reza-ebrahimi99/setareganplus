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

export type Settings = {
  contact: ContactSettings;
  stats: Stat[];
  home: HomeSettings;
  about: AboutSettings;
};

export const EMPTY_SETTINGS: Settings = {
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
  return out as Settings;
}

export async function saveSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  await prisma.setting.upsert({
    where: { key },
    create: { key, value: value as object },
    update: { value: value as object },
  });
}
