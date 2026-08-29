export type AiActionType =
  | "link"
  | "page"
  | "contact"
  | "registration"
  | "phone"
  | "download";

export type AiAction = {
  id: string;
  type: AiActionType;
  label: string;
  href: string;
  description?: string;
  /** Optional analytics category */
  category?: string;
};

export type AiRecommendationKind = "page" | "service" | "registration";

export type AiRecommendation = {
  id: string;
  kind: AiRecommendationKind;
  label: string;
  href: string;
  reason?: string;
};

export type AiIntent =
  | "school-registration"
  | "ghalamchi"
  | "gifted"
  | "summer-club"
  | "about"
  | "tuition"
  | "contact"
  | "general";
