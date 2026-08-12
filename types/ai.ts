import type { AiAction, AiRecommendation } from "@/types/ai-actions";
import type { AiCitation } from "@/types/ai-citations";

export type AiRole = "user" | "assistant" | "system";

export type AiMessage = {
  id: string;
  role: AiRole;
  content: string;
  createdAt: number;
  status?: "complete" | "streaming" | "error";
  /** Smart actions attached by enrichment (assistant messages). */
  actions?: AiAction[];
  /** Smart recommendations attached by enrichment (assistant messages). */
  recommendations?: AiRecommendation[];
  /** Optional factual sources */
  citations?: AiCitation[];
  /** Contextual quick suggestions */
  suggestions?: AiAction[];
};

export type AiChatStatus = "idle" | "loading" | "streaming" | "error";

export type AiChatErrorCode =
  | "offline"
  | "timeout"
  | "server"
  | "invalid"
  | "unknown";

export type AiChatError = {
  code: AiChatErrorCode;
  message: string;
};

export type AiChatRequest = {
  messages: Array<Pick<AiMessage, "role" | "content">>;
  signal?: AbortSignal;
  /** Optional pathname for system-prompt page context (defaults to window.location on client). */
  pathname?: string | null;
};

export type AiChatSuccess = {
  ok: true;
  content: string;
  actions?: AiAction[];
  recommendations?: AiRecommendation[];
  citations?: AiCitation[];
  suggestions?: AiAction[];
  intent?: string;
  knowledgeIds?: string[];
};

export type AiChatFailure = {
  ok: false;
  error: AiChatError;
};

export type AiChatResult = AiChatSuccess | AiChatFailure;

export type AiStreamHandlers = {
  onToken?: (token: string) => void;
  onDone?: (fullText: string) => void;
  onError?: (error: AiChatError) => void;
};
