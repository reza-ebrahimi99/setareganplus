import { detectAiIntent } from "@/lib/ai/actions";
import { isAiFeatureEnabled } from "@/lib/ai/config";
import { ensureDefaultAiPluginsRegistered, listAiPlugins } from "@/lib/ai/plugins/registry";

export type AiRequestClass =
  | "question"
  | "navigation"
  | "registration"
  | "crm"
  | "school"
  | "calendar"
  | "tool_call"
  | "human_handoff";

export type AiActionPlan = {
  classification: AiRequestClass;
  intent: string;
  suggestedPluginIds: string[];
  handoffRecommended: boolean;
  notes: string[];
};

function classify(query: string): AiRequestClass {
  const q = query.toLowerCase();
  if (/(انسانی|مشاور صحبت|تماس بگیر|handoff)/i.test(q)) return "human_handoff";
  if (/(ثبت\s*نام|پیش\s*ثبت)/.test(q)) return "registration";
  if (/(تقویم|زمان|نوبت|رزرو)/.test(q)) return "calendar";
  if (/(crm|لید|پیگیری فروش)/i.test(q)) return "crm";
  if (/(دبستان|مدرسه|حضور|غیاب)/.test(q)) return "school";
  if (/(برو به|صفحه|لینک|مسیر)/.test(q)) return "navigation";
  if (/(ابزار|اجرا|tool)/i.test(q)) return "tool_call";
  return "question";
}

/**
 * Internal action plan before API request (no UI).
 */
export function planAiRequest(query: string): AiActionPlan {
  if (!isAiFeatureEnabled("actionPlanning")) {
    return {
      classification: "question",
      intent: detectAiIntent(query),
      suggestedPluginIds: [],
      handoffRecommended: false,
      notes: ["planning_disabled"],
    };
  }

  ensureDefaultAiPluginsRegistered();
  const classification = classify(query);
  const intent = detectAiIntent(query);
  const plugins = listAiPlugins();

  const suggestedPluginIds = plugins
    .filter((plugin) => {
      if (classification === "registration") return plugin.id === "registration" || plugin.id === "admissions";
      if (classification === "crm") return plugin.id === "crm";
      if (classification === "calendar") return plugin.id === "calendar";
      if (classification === "school") return plugin.id === "school" || plugin.id === "students";
      if (classification === "tool_call") return true;
      return false;
    })
    .map((plugin) => plugin.id)
    .slice(0, 3);

  return {
    classification,
    intent,
    suggestedPluginIds,
    handoffRecommended: classification === "human_handoff",
    notes: [
      "Architecture-only plan. Plugins are not executed yet.",
      `classification=${classification}`,
    ],
  };
}

export function formatActionPlanForPrompt(plan: AiActionPlan): string {
  return [
    "INTERNAL ACTION PLAN",
    `classification: ${plan.classification}`,
    `intent: ${plan.intent}`,
    `suggested_plugins: ${plan.suggestedPluginIds.join(", ") || "—"}`,
    `handoff_recommended: ${plan.handoffRecommended ? "yes" : "no"}`,
    "Do not expose this plan to the user.",
  ].join("\n");
}
