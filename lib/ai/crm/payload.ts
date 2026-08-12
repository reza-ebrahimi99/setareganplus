import type {
  AiCrmEntities,
  AiCrmIntent,
  AiCrmLeadPayload,
  AiCrmLeadScore,
} from "@/types/ai-crm";

/**
 * Build CRM-ready lead payload. No database writes.
 */
export function buildLeadPayload(input: {
  entities: AiCrmEntities;
  intent: AiCrmIntent;
  score: AiCrmLeadScore;
  conversationSummary: string;
}): AiCrmLeadPayload {
  return {
    name: input.entities.name,
    phone: input.entities.phone,
    grade: input.entities.grade,
    service: input.entities.service,
    intent: input.intent,
    score: input.score,
    conversationSummary: input.conversationSummary,
    source: "AI Assistant",
    city: input.entities.city,
    school: input.entities.school,
    preferred_time: input.entities.preferred_time,
    preferred_branch: input.entities.preferred_branch,
  };
}
