/**
 * Guidance Journey Engine Step 2 — major-cluster affinity map.
 * Deterministic, rule-based (no AI): each cluster carries category weights;
 * fit score = weighted average of the student's normalized category scores.
 */

import type { AssessmentCategoryId } from "@/lib/guidance/journey/assessment/categories";

export type MajorClusterId =
  | "ENGINEERING"
  | "COMPUTER_SCIENCE"
  | "MEDICINE_HEALTH"
  | "BASIC_SCIENCES"
  | "HUMANITIES_LAW"
  | "SOCIAL_SCIENCES_PSYCHOLOGY"
  | "BUSINESS_MANAGEMENT"
  | "ARTS_DESIGN"
  | "EDUCATION_TEACHING"
  | "AGRICULTURE_ENVIRONMENT";

export type MajorClusterDefinition = {
  id: MajorClusterId;
  title: string;
  weights: Partial<Record<AssessmentCategoryId, number>>;
};

export const MAJOR_CLUSTERS: readonly MajorClusterDefinition[] = [
  {
    id: "ENGINEERING",
    title: "مهندسی و فنی",
    weights: { technical: 0.9, research: 0.4, work_style: 0.4, creativity: 0.3 },
  },
  {
    id: "COMPUTER_SCIENCE",
    title: "کامپیوتر و فناوری اطلاعات",
    weights: { technical: 0.9, research: 0.5, creativity: 0.5, business: 0.2 },
  },
  {
    id: "MEDICINE_HEALTH",
    title: "پزشکی و علوم سلامت",
    weights: { social: 0.7, research: 0.7, technical: 0.3, leadership: 0.2 },
  },
  {
    id: "BASIC_SCIENCES",
    title: "علوم پایه",
    weights: { research: 0.9, technical: 0.4, interests: 0.4, creativity: 0.2 },
  },
  {
    id: "HUMANITIES_LAW",
    title: "علوم انسانی و حقوق",
    weights: { social: 0.5, leadership: 0.6, research: 0.4, business: 0.2 },
  },
  {
    id: "SOCIAL_SCIENCES_PSYCHOLOGY",
    title: "علوم اجتماعی و روان‌شناسی",
    weights: { social: 0.9, research: 0.4, personality: 0.3, artistic: 0.1 },
  },
  {
    id: "BUSINESS_MANAGEMENT",
    title: "مدیریت و کسب‌وکار",
    weights: { business: 0.9, leadership: 0.7, social: 0.3, work_style: 0.3 },
  },
  {
    id: "ARTS_DESIGN",
    title: "هنر و طراحی",
    weights: { artistic: 0.9, creativity: 0.8, interests: 0.2 },
  },
  {
    id: "EDUCATION_TEACHING",
    title: "علوم تربیتی و آموزش",
    weights: { social: 0.7, leadership: 0.3, research: 0.2, personality: 0.2 },
  },
  {
    id: "AGRICULTURE_ENVIRONMENT",
    title: "کشاورزی و محیط زیست",
    weights: { research: 0.5, technical: 0.3, interests: 0.4 },
  },
];
