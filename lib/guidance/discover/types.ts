/**
 * Discovery Center — static editorial catalog (no Prisma).
 * Copy is qualitative counseling support, not official Sanjesh data.
 */

import type { GuidanceExamGroup } from "@/lib/guidance/types";
import type { MajorClusterId } from "@/lib/guidance/journey/assessment/major-clusters";

export type DiscoverFaq = { question: string; answer: string };

export type DiscoverInsight = {
  mistakes: string;
  succeeds: string;
  families: string;
  before: string;
};

export type DiscoverRelated = {
  majors: readonly string[];
  systems: readonly string[];
  pathways: readonly string[];
  careers: readonly string[];
};

export type DiscoverSystem = {
  slug: string;
  title: string;
  kicker: string;
  lead: string;
  overview: string;
  admission: string;
  tuition: string;
  studentLife: string;
  advantages: readonly string[];
  challenges: readonly string[];
  faq: readonly DiscoverFaq[];
  insight: DiscoverInsight;
  relatedPathways: readonly string[];
  relatedSystems: readonly string[];
};

export type DiscoverPathway = {
  slug: string;
  title: string;
  kicker: string;
  lead: string;
  overview: string;
  duration: string;
  after: string;
  who: string;
  faq: readonly DiscoverFaq[];
  insight: DiscoverInsight;
  relatedPathways: readonly string[];
  relatedSystems: readonly string[];
};

export type DiscoverCareer = {
  paths: readonly string[];
  environments: readonly string[];
  responsibilities: readonly string[];
  outlook: string;
  skills: readonly string[];
};

export type DiscoverMajor = {
  slug: string;
  code: string;
  title: string;
  examGroup: GuidanceExamGroup;
  cluster: MajorClusterId;
  kicker: string;
  lead: string;
  overview: string;
  study: string;
  courses: readonly string[];
  traits: readonly string[];
  skills: readonly string[];
  continuing: string;
  misconceptions: readonly DiscoverFaq[];
  faq: readonly DiscoverFaq[];
  insight: DiscoverInsight;
  career: DiscoverCareer;
};

export type DiscoverKind = "system" | "major" | "pathway" | "career" | "program";

export type DiscoverProgramCategory =
  | "DEGREE_LEVEL"
  | "INSTITUTION_TYPE"
  | "ADMISSION_METHOD"
  | "SPECIAL_CONDITION";

export type DiscoverProgramAtAGlance = {
  degreeLevel?: string;
  programType?: string;
  admissionMethod?: string;
  tuition?: string;
  continuingEducation?: string;
  keyNote?: string;
};

export type DiscoverProgram = {
  slug: string;
  title: string;
  shortTitle: string;
  category: DiscoverProgramCategory;
  duration: string;
  admissionType: string;
  continuityType: string | null;
  description: string;
  summary: string;
  suitableFor: string;
  structure: string;
  admissionNotes: string;
  continuingEducation: string;
  careerNotes: string;
  degreeStatus: string;
  tuitionNotes: string;
  advantages: readonly string[];
  challenges: readonly string[];
  importantNotes: readonly string[];
  commonMistakes: readonly string[];
  beforeYouChoose: readonly string[];
  relatedPrograms: readonly string[];
  searchTerms: readonly string[];
  faq: readonly DiscoverFaq[];
  insight: DiscoverInsight;
  atAGlance: DiscoverProgramAtAGlance;
};

export type DiscoverSearchHit = {
  kind: DiscoverKind;
  slug: string;
  title: string;
  href: string;
  excerpt: string;
  groupLabel: string;
};

export const DISCOVER_PHOTOS = [
  { src: "/images/gallery/gallery-1.jpg", alt: "فضای آموزشی مجموعه ستارگان پلاس" },
  { src: "/images/gallery/gallery-2.jpg", alt: "محیط کلاس و همراهی دانش‌آموزان ستارگان" },
  { src: "/images/hero/hero.jpg", alt: "نمای مجموعه آموزشی ستارگان پلاس در نسیم‌شهر" },
  { src: "/images/gallery/gallery-3.jpg", alt: "فضای جمعی دانش‌آموزان در ستارگان پلاس" },
  { src: "/images/about/about.png", alt: "معرفی مؤسسه آموزشی ستارگان" },
  { src: "/images/gallery/gallery-4.jpg", alt: "لحظه‌های حضور در مجموعه ستارگان" },
  { src: "/images/gallery/gallery-5.jpg", alt: "فضای مطالعه و گفت‌وگو در ستارگان پلاس" },
  { src: "/images/about/girls-branch.png", alt: "شاخه دخترانه مجموعه ستارگان" },
] as const;

export function discoverPhotoForSlug(slug: string): (typeof DISCOVER_PHOTOS)[number] {
  let hash = 0;
  for (let i = 0; i < slug.length; i += 1) hash = (hash + slug.charCodeAt(i) * (i + 1)) % DISCOVER_PHOTOS.length;
  return DISCOVER_PHOTOS[hash]!;
}
