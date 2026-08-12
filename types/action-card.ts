/**
 * Premium website-guidance action cards for Star / Atrin (interactive UX layer).
 */

export type ActionCardType =
  | "navigate"
  | "chat"
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
  | "robot"
  | "chat"
  | "camera"
  | "spark";

export type ActionCard = {
  id: string;
  type: ActionCardType;
  title: string;
  subtitle: string;
  icon: ActionCardIcon;
  /**
   * Target for navigate / external / call / open-form / copy fallback.
   * Chat actions may use "#chat" — execution uses `prompt`.
   */
  href: string;
  /** Lower number = higher priority (shown first). */
  priority: number;
  /** Required for type "chat" — sent or inserted into the conversation. */
  prompt?: string;
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
  | "greeting"
  | "admissions"
  | "school"
  | "study"
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
