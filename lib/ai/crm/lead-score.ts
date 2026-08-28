import type { AiCrmIntent, AiCrmLeadScore } from "@/types/ai-crm";

/**
 * Lead scoring for AI admissions assistant.
 */
export function scoreCrmLead(intent: AiCrmIntent): AiCrmLeadScore {
  switch (intent) {
    case "ask_registration":
    case "ask_consultation":
    case "ask_qalamchi":
    case "ask_summer":
      return "High";
    case "ask_tuition":
      return "Medium";
    case "ask_school":
    case "ask_courses":
    case "ask_exam":
    case "ask_staros":
    case "ask_location":
    case "ask_contact":
    case "ask_teacher":
    case "ask_schedule":
    case "unknown":
    default:
      return "Low";
  }
}
