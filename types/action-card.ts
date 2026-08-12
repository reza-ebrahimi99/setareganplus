/**
 * Premium website-guidance action cards for Star assistant (UX layer).
 */

export type ActionCardType =
  | "navigate"
  | "external"
  | "call"
  | "copy"
  | "open-form";

export type ActionCardIcon =
  | "register"
  | "phone"
  | "location"
  | "graduation"
  | "trophy"
  | "gallery"
  | "book"
  | "calendar"
  | "robot";

export type ActionCard = {
  id: string;
  type: ActionCardType;
  title: string;
  subtitle: string;
  icon: ActionCardIcon;
  href: string;
  /** Lower number = higher priority (shown first). */
  priority: number;
  /** Optional payload for copy actions */
  copyText?: string;
};

export type AiActionResolverInput = {
  /** User / CRM / enrichment intent string (optional). */
  intent?: string | null;
  /** CRM lead score when available — do not import CRM modules here. */
  crmScore?: "High" | "Medium" | "Low" | null;
  pathname?: string | null;
  /** Assistant reply text (context only). */
  response?: string | null;
  /** Last user message — used for keyword intent when intent missing. */
  query?: string | null;
};

export type WebsiteGuideIntent =
  | "tuition"
  | "pre_registration"
  | "ghalamchi"
  | "about_school"
  | "contact"
  | "consultation"
  | "courses"
  | "exams"
  | "achievements"
  | "gallery"
  | "staros"
  | "general"
  | "none";
