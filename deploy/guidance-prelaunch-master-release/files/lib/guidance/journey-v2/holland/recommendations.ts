/**
 * Interest-pattern major recommendations from stored RIASEC scores.
 * Not a diagnosis and not a deterministic admission prediction.
 */

import {
  MAJOR_CLUSTERS,
  type MajorClusterId,
} from "@/lib/guidance/journey/assessment/major-clusters";
import type { GuidanceExamGroup } from "@/lib/guidance/journey-v2/constants";
import {
  HOLLAND_TYPE_LABELS,
  type HollandType,
} from "@/lib/guidance/journey-v2/holland/profiles";

export const HOLLAND_RECOMMENDATION_DISCLAIMER =
  "این پیشنهاد فقط بر اساس رغبت تحصیلی/شغلی است و باید در کنار رتبه، توانمندی درسی، شرایط خانوادگی و اولویت‌های شخصی بررسی شود.";

export const HOLLAND_RECOMMENDATION_TITLE =
  "پیشنهاد مهندس ابراهیمی بر اساس الگوی رغبت شما";

export type HollandScoreInput = {
  type: HollandType | string;
  normalized: number;
};

type ClusterAffinity = {
  id: MajorClusterId;
  title: string;
  score: number;
  examFit: boolean;
};

export type HollandRecommendationGroup = {
  key: "high" | "review" | "lower";
  title: string;
  items: Array<{ title: string; note: string }>;
};

export type HollandRecommendationModel = {
  title: string;
  disclaimer: string;
  code: string;
  groups: HollandRecommendationGroup[];
};

const TYPE_WEIGHTS: Record<HollandType, Partial<Record<MajorClusterId, number>>> = {
  R: {
    ENGINEERING: 1,
    COMPUTER_SCIENCE: 0.55,
    AGRICULTURE_ENVIRONMENT: 0.7,
    BASIC_SCIENCES: 0.25,
  },
  I: {
    MEDICINE_HEALTH: 0.85,
    BASIC_SCIENCES: 1,
    COMPUTER_SCIENCE: 0.7,
    ENGINEERING: 0.55,
  },
  A: {
    ARTS_DESIGN: 1,
    HUMANITIES_LAW: 0.35,
    EDUCATION_TEACHING: 0.25,
  },
  S: {
    EDUCATION_TEACHING: 1,
    SOCIAL_SCIENCES_PSYCHOLOGY: 0.9,
    MEDICINE_HEALTH: 0.55,
    HUMANITIES_LAW: 0.35,
  },
  E: {
    BUSINESS_MANAGEMENT: 1,
    HUMANITIES_LAW: 0.55,
    SOCIAL_SCIENCES_PSYCHOLOGY: 0.25,
  },
  C: {
    BUSINESS_MANAGEMENT: 0.7,
    HUMANITIES_LAW: 0.45,
    COMPUTER_SCIENCE: 0.25,
  },
};

const EXAM_CLUSTER_FIT: Record<GuidanceExamGroup, MajorClusterId[]> = {
  MATHEMATICS: ["ENGINEERING", "COMPUTER_SCIENCE", "BASIC_SCIENCES", "BUSINESS_MANAGEMENT"],
  EXPERIMENTAL_SCIENCES: [
    "MEDICINE_HEALTH",
    "BASIC_SCIENCES",
    "AGRICULTURE_ENVIRONMENT",
    "EDUCATION_TEACHING",
  ],
  HUMANITIES: [
    "HUMANITIES_LAW",
    "SOCIAL_SCIENCES_PSYCHOLOGY",
    "BUSINESS_MANAGEMENT",
    "EDUCATION_TEACHING",
  ],
  ARTS: ["ARTS_DESIGN", "HUMANITIES_LAW", "EDUCATION_TEACHING"],
  LANGUAGES: ["HUMANITIES_LAW", "EDUCATION_TEACHING", "SOCIAL_SCIENCES_PSYCHOLOGY"],
};

function asHollandType(value: string): HollandType | null {
  return value === "R" || value === "I" || value === "A" || value === "S" || value === "E" || value === "C"
    ? value
    : null;
}

export function buildHollandRecommendations(params: {
  scores: readonly HollandScoreInput[];
  examGroup?: GuidanceExamGroup | null;
}): HollandRecommendationModel | null {
  const scores = params.scores
    .map((row) => {
      const type = asHollandType(String(row.type));
      if (!type) return null;
      return { type, normalized: Math.max(0, Math.min(100, row.normalized)) };
    })
    .filter((row): row is { type: HollandType; normalized: number } => Boolean(row));

  if (scores.length === 0) return null;

  const ranked = [...scores].sort((a, b) => b.normalized - a.normalized);
  const code = ranked.slice(0, 3).map((row) => row.type).join("");
  const examFit = params.examGroup ? new Set(EXAM_CLUSTER_FIT[params.examGroup]) : null;

  const affinities: ClusterAffinity[] = MAJOR_CLUSTERS.map((cluster) => {
    let weighted = 0;
    let total = 0;
    for (const score of scores) {
      const w = TYPE_WEIGHTS[score.type][cluster.id] ?? 0;
      if (w <= 0) continue;
      weighted += score.normalized * w;
      total += w;
    }
    const base = total > 0 ? weighted / total : 0;
    const fit = examFit ? examFit.has(cluster.id) : true;
    return {
      id: cluster.id,
      title: cluster.title,
      score: fit ? base : base * 0.82,
      examFit: fit,
    };
  }).sort((a, b) => b.score - a.score);

  const high = affinities.slice(0, 3);
  const review = affinities.slice(3, 6);
  const lower = affinities.slice(6);

  const noteFor = (item: ClusterAffinity, kind: "high" | "review" | "lower") => {
    const cluster = MAJOR_CLUSTERS.find((row) => row.id === item.id);
    const examNote = item.examFit
      ? ""
      : " با توجه به گروه آزمایشی فعلی، این حوزه را با احتیاط و در کنار معیارهای دیگر ببینید.";
    if (kind === "high") {
      return `هم‌راستا با الگوی ${ranked
        .slice(0, 2)
        .map((row) => HOLLAND_TYPE_LABELS[row.type])
        .join(" و ")}.${examNote}`;
    }
    if (kind === "review") {
      return `${cluster?.cautionNote ?? "این حوزه را در کنار رتبه و توانمندی درسی بررسی کنید."}${examNote}`;
    }
    return `با الگوی فعلی رغبت فاصله بیشتری دارد و نباید تنها بر اساس این آزمون کنار گذاشته شود.${examNote}`;
  };

  return {
    title: HOLLAND_RECOMMENDATION_TITLE,
    disclaimer: HOLLAND_RECOMMENDATION_DISCLAIMER,
    code,
    groups: [
      {
        key: "high",
        title: "هم‌راستایی بالا با الگوی رغبت شما",
        items: high.map((item) => ({ title: item.title, note: noteFor(item, "high") })),
      },
      {
        key: "review",
        title: "قابل بررسی با توجه به سایر معیارها",
        items: review.map((item) => ({ title: item.title, note: noteFor(item, "review") })),
      },
      {
        key: "lower",
        title: "هم‌راستایی کمتر با الگوی فعلی",
        items: lower.map((item) => ({ title: item.title, note: noteFor(item, "lower") })),
      },
    ],
  };
}
