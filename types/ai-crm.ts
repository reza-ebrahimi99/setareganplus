export type AiCrmIntent =
  | "ask_school"
  | "ask_courses"
  | "ask_registration"
  | "ask_consultation"
  | "ask_tuition"
  | "ask_exam"
  | "ask_qalamchi"
  | "ask_summer"
  | "ask_staros"
  | "ask_location"
  | "ask_contact"
  | "ask_teacher"
  | "ask_schedule"
  | "unknown";

export type AiCrmLeadScore = "High" | "Medium" | "Low";

export type AiCrmEntities = {
  name: string | null;
  phone: string | null;
  grade: string | null;
  city: string | null;
  school: string | null;
  service: string | null;
  preferred_time: string | null;
  preferred_branch: string | null;
};

export type AiCrmLeadPayload = {
  name: string | null;
  phone: string | null;
  grade: string | null;
  service: string | null;
  intent: AiCrmIntent;
  score: AiCrmLeadScore;
  conversationSummary: string;
  source: "AI Assistant";
  city?: string | null;
  school?: string | null;
  preferred_time?: string | null;
  preferred_branch?: string | null;
};

export type AiCrmActionType =
  | "book_consultation"
  | "start_pre_registration"
  | "contact_advisor"
  | "view_tuition"
  | "download_brochure"
  | "navigate_achievements"
  | "view_courses"
  | "view_exams"
  | "view_about"
  | "view_contact";

export type AiCrmAction = {
  id: string;
  type: AiCrmActionType;
  label: string;
  href: string;
};

export type AiCrmRecommendation = {
  id: string;
  label: string;
  href: string;
  reason: string;
};

export type AiCrmInsight = {
  intent: AiCrmIntent;
  entities: AiCrmEntities;
  score: AiCrmLeadScore;
  payload: AiCrmLeadPayload;
  actions: AiCrmAction[];
  recommendations: AiCrmRecommendation[];
  conversationSummary: string;
};
