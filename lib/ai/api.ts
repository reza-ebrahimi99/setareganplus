/**
 * Client wrapper for StarOS AI Assistant HTTP API.
 * Does not call OpenAI directly — only the configured assistant endpoint.
 */

import {
  getAiAssistantBaseUrl,
  getAiAssistantChatPath,
  getAiAssistantTimeoutMs,
} from "@/lib/ai/assistant-config";
import { trackAiEvent } from "@/lib/ai/analytics";
import { AI_TUNABLES, isAiFeatureEnabled } from "@/lib/ai/config";
import { enrichAiResponse } from "@/lib/ai/enrich";
import {
  detectWebsiteGuideIntent,
} from "@/lib/ai/actions/detect-intent";
import {
  buildLightweightReply,
  isTrivialConversation,
} from "@/lib/ai/lightweight";
import {
  extractLastUserQuery,
  preferredCategoriesForPage,
  retrieveKnowledgeContext,
} from "@/lib/ai/knowledge/retrieve";
import {
  persistSummary,
  prepareConversationMemory,
} from "@/lib/ai/memory";
import {
  formatDeepPageContextForPrompt,
  resolveDeepPageContext,
} from "@/lib/ai/page-context";
import { formatActionPlanForPrompt, planAiRequest } from "@/lib/ai/planning";
import { ensureDefaultAiPluginsRegistered } from "@/lib/ai/plugins/registry";
import { getSessionMeta } from "@/lib/ai/session";
import {
  formatSiteSearchForPrompt,
  searchInternalSite,
} from "@/lib/ai/site-search";
import { sendAiChatStreamingReady } from "@/lib/ai/streaming/client";
import {
  PROMPT_VERSION,
  buildSystemPrompt,
  estimatePromptTokens,
  isLightweightIntent,
  resolveAiPageContext,
} from "@/lib/ai/system-prompt";
import { resolveAtrinOutboundContext } from "@/lib/atrin/context-bridge";
import type {
  AiChatError,
  AiChatRequest,
  AiChatResult,
  AiStreamHandlers,
} from "@/types/ai";
import type { KnowledgeCategory } from "@/types/knowledge";
import type { WebsiteGuideIntent } from "@/types/action-card";

function resolveRequestPathname(pathname?: string | null): string {
  if (typeof pathname === "string" && pathname.trim()) {
    return pathname.trim();
  }
  if (typeof window !== "undefined" && window.location?.pathname) {
    return window.location.pathname;
  }
  return "/";
}

function preferredCategoriesForIntent(
  intent: WebsiteGuideIntent,
): readonly KnowledgeCategory[] {
  switch (intent) {
    case "admissions":
    case "pre_registration":
    case "tuition":
      return ["faq", "services", "school", "contact"];
    case "school":
    case "about_school":
    case "achievements":
    case "gallery":
      return ["institution", "history", "school", "statistics"];
    case "ghalamchi":
      return ["ghalamchi", "services", "faq"];
    case "study":
    case "courses":
    case "exams":
      return ["services", "school"];
    case "contact":
    case "consultation":
      return ["contact", "faq"];
    default:
      return [];
  }
}

/** Build reasoned outbound messages — shared by streaming and non-streaming. */
export async function buildOutboundMessages(request: AiChatRequest) {
  const pathname = resolveRequestPathname(request.pathname);
  const page = resolveAiPageContext(pathname);
  const deepPage = resolveDeepPageContext(pathname);
  const session = getSessionMeta();

  if (isAiFeatureEnabled("plugins")) {
    ensureDefaultAiPluginsRegistered();
  }

  const conversation = request.messages
    .filter((item) => item.role === "user" || item.role === "assistant")
    .map((item) => ({
      role: item.role as "user" | "assistant",
      content: item.content,
    }));

  const memory = isAiFeatureEnabled("memory")
    ? prepareConversationMemory(conversation, AI_TUNABLES.maxHistoryMessages)
    : {
        messages: conversation,
        summary: null,
        compacted: false,
      };
  persistSummary(memory.summary);

  const query = extractLastUserQuery(conversation);
  const detectedGuideIntent = detectWebsiteGuideIntent(query);
  const lightweightProbe =
    isLightweightIntent(detectedGuideIntent) || isTrivialConversation(query);

  const preferredEarly = [
    ...preferredCategoriesForIntent(detectedGuideIntent),
    ...preferredCategoriesForPage(page),
  ];

  const knowledge = lightweightProbe
    ? {
        hits: [],
        formatted: "",
        truncated: false,
        sourceId: "static-files" as const,
        confidence: 0,
      }
    : retrieveKnowledgeContext({
        query,
        preferredCategories: preferredEarly,
        maxBlocks: AI_TUNABLES.knowledgeMaxBlocks,
        maxCharacters: AI_TUNABLES.knowledgeMaxCharacters,
      });

  const atrinContext = resolveAtrinOutboundContext({
    query,
    recentUserTexts: conversation
      .filter((item) => item.role === "user")
      .slice(-6)
      .map((item) => item.content),
    knowledgeConfidence: knowledge.confidence,
  });

  const guideIntent = atrinContext.turn.guideIntent;
  const lightweight =
    isLightweightIntent(guideIntent) || isTrivialConversation(query);

  const preferred = [
    ...preferredCategoriesForIntent(guideIntent),
    ...preferredCategoriesForPage(page),
  ];

  // Re-retrieve if intent shifted to a different knowledge family.
  const knowledgeFinal =
    !lightweight &&
    preferred.join("|") !== preferredEarly.join("|")
      ? retrieveKnowledgeContext({
          query,
          preferredCategories: preferred,
          maxBlocks: AI_TUNABLES.knowledgeMaxBlocks,
          maxCharacters: AI_TUNABLES.knowledgeMaxCharacters,
        })
      : knowledge;

  const siteHits =
    !lightweight &&
    isAiFeatureEnabled("siteSearch") &&
    (atrinContext.turn.reasoning.shouldSearchCms ||
      knowledgeFinal.confidence < AI_TUNABLES.siteSearchConfidenceThreshold)
      ? await searchInternalSite(query)
      : [];

  const plan = lightweight
    ? {
        classification: "question" as const,
        intent: guideIntent,
        suggestedPluginIds: [] as string[],
        handoffRecommended: false,
        notes: ["lightweight"],
      }
    : (() => {
        const base = planAiRequest(query);
        return {
          ...base,
          notes: [
            ...base.notes,
            ...atrinContext.turn.reasoning.notes,
            `atrin_intent=${atrinContext.turn.primaryIntent}`,
            `shape=${atrinContext.turn.reasoning.responseShape}`,
          ],
        };
      })();

  const extraSections: string[] = [];
  if (!lightweight && isAiFeatureEnabled("deepPageContext")) {
    extraSections.push(formatDeepPageContextForPrompt(deepPage));
  }
  if (!lightweight && siteHits.length > 0) {
    extraSections.push(formatSiteSearchForPrompt(siteHits));
  }
  if (!lightweight && isAiFeatureEnabled("actionPlanning")) {
    extraSections.push(formatActionPlanForPrompt(plan));
  }
  if (!lightweight) {
    extraSections.push(...atrinContext.extraSections);
  }

  const systemPrompt = buildSystemPrompt({
    pathname,
    page,
    locale: "fa",
    intent: atrinContext.educationActive ? "study" : guideIntent,
    relevantKnowledge: knowledgeFinal.formatted,
    extraSections,
    lightweight,
  });

  return {
    pathname,
    page,
    deepPage,
    query,
    guideIntent,
    lightweight,
    knowledge: knowledgeFinal,
    siteHits,
    plan,
    session,
    atrinModeId: atrinContext.modeId,
    educationActive: atrinContext.educationActive,
    turn: atrinContext.turn,
    systemPrompt,
    promptTokensEstimate: estimatePromptTokens(systemPrompt),
    knowledgeIds: knowledgeFinal.hits.map((hit) => hit.block.id),
    recentUserTexts: conversation
      .filter((item) => item.role === "user")
      .slice(-4)
      .map((item) => item.content),
    messages: [
      { role: "system" as const, content: systemPrompt },
      ...(lightweight ? memory.messages.slice(-4) : memory.messages),
    ],
  };
}

function persianError(code: AiChatError["code"]): AiChatError {
  switch (code) {
    case "offline":
      return {
        code,
        message:
          "اتصال اینترنت برقرار نیست. لطفاً اتصال خود را بررسی کنید و دوباره تلاش کنید.",
      };
    case "timeout":
      return {
        code,
        message:
          "پاسخ مشاور هوشمند بیش از حد طول کشید. لطفاً دوباره تلاش کنید.",
      };
    case "server":
      return {
        code,
        message:
          "سرویس مشاور هوشمند موقتاً در دسترس نیست. لطفاً چند لحظه بعد دوباره تلاش کنید.",
      };
    case "invalid":
      return {
        code,
        message: "پاسخ نامعتبر از سرویس دریافت شد. لطفاً دوباره تلاش کنید.",
      };
    default:
      return {
        code: "unknown",
        message: "خطایی رخ داد. لطفاً دوباره تلاش کنید.",
      };
  }
}

function extractReply(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;

  if (typeof data.reply === "string" && data.reply.trim()) {
    return data.reply.trim();
  }
  if (typeof data.message === "string" && data.message.trim()) {
    return data.message.trim();
  }
  if (typeof data.content === "string" && data.content.trim()) {
    return data.content.trim();
  }
  if (typeof data.text === "string" && data.text.trim()) {
    return data.text.trim();
  }

  const choice = Array.isArray(data.choices) ? data.choices[0] : null;
  if (choice && typeof choice === "object") {
    const message = (choice as { message?: { content?: unknown } }).message;
    if (
      message &&
      typeof message.content === "string" &&
      message.content.trim()
    ) {
      return message.content.trim();
    }
  }

  return null;
}

export function getAiAssistantEndpoint(): string {
  return `${getAiAssistantBaseUrl()}${getAiAssistantChatPath()}`;
}

/**
 * Non-streaming chat completion against the configured StarOS AI endpoint.
 */
export async function sendAiChat(
  request: AiChatRequest,
): Promise<AiChatResult> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    const error = persianError("offline");
    trackAiEvent("ai_error", { category: error.code });
    return { ok: false, error };
  }

  const controller = new AbortController();
  const timeoutMs = getAiAssistantTimeoutMs();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  if (request.signal) {
    if (request.signal.aborted) {
      clearTimeout(timer);
      const error = persianError("timeout");
      trackAiEvent("ai_error", { category: error.code });
      return { ok: false, error };
    }
    request.signal.addEventListener("abort", () => controller.abort(), {
      once: true,
    });
  }

  const startedAt = Date.now();

  try {
    const outbound = await buildOutboundMessages(request);

    // Local lightweight path — no model call, no institutional knowledge dump.
    if (outbound.lightweight) {
      const content = buildLightweightReply(outbound.query);
      const enriched = enrichAiResponse({
        rawReply: content,
        query: outbound.query,
        pathname: outbound.pathname,
        page: outbound.page,
        deepPage: outbound.deepPage,
        knowledge: outbound.knowledge,
        siteHits: outbound.siteHits,
        recentUserTexts: outbound.recentUserTexts,
        turn: outbound.turn,
      });

      if (isAiFeatureEnabled("analytics")) {
        trackAiEvent("conversation_finished", {
          pathname: outbound.pathname,
          page: outbound.deepPage.kind,
          category: "greeting",
          meta: {
            durationMs: Date.now() - startedAt,
            messageCount: request.messages.length,
            lightweight: true,
            promptTokensEstimate: outbound.promptTokensEstimate,
          },
        });
      }

      return {
        ok: true,
        content: enriched.content,
        actions: enriched.actions,
        recommendations: enriched.recommendations,
        citations: enriched.citations,
        suggestions: enriched.suggestions,
        intent: enriched.intent,
        knowledgeIds: enriched.knowledgeIds,
        crm: enriched.crm,
      };
    }

    if (isAiFeatureEnabled("analytics")) {
      trackAiEvent("page_context", {
        pathname: outbound.pathname,
        page: outbound.deepPage.kind,
        meta: {
          intent: outbound.guideIntent,
          promptTokensEstimate: outbound.promptTokensEstimate,
        },
      });
    }

    const response = await fetch(getAiAssistantEndpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        messages: outbound.messages,
        system: outbound.systemPrompt,
        prompt_version: PROMPT_VERSION,
        stream: false,
        locale: "fa",
        context: {
          pathname: outbound.pathname,
          page: outbound.page,
          deep_page: outbound.deepPage.kind,
          slug: outbound.deepPage.slug,
          knowledge_ids: outbound.knowledgeIds,
          session_id: outbound.session.sessionId,
          conversation_id: outbound.session.conversationId,
          plan: outbound.plan.classification,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = persianError(
        response.status >= 500 ? "server" : "invalid",
      );
      trackAiEvent("ai_error", {
        category: error.code,
        pathname: outbound.pathname,
        page: outbound.page,
      });
      return { ok: false, error };
    }

    const payload: unknown = await response.json();
    const content = extractReply(payload);
    if (!content) {
      const error = persianError("invalid");
      trackAiEvent("ai_error", {
        category: error.code,
        pathname: outbound.pathname,
        page: outbound.page,
      });
      return { ok: false, error };
    }

    const enriched = enrichAiResponse({
      rawReply: content,
      query: outbound.query,
      pathname: outbound.pathname,
      page: outbound.page,
      deepPage: outbound.deepPage,
      knowledge: outbound.knowledge,
      siteHits: outbound.siteHits,
      recentUserTexts: outbound.recentUserTexts,
      turn: outbound.turn,
    });

    if (isAiFeatureEnabled("analytics")) {
      trackAiEvent("conversation_finished", {
        pathname: outbound.pathname,
        page: outbound.deepPage.kind,
        category: enriched.intent,
        meta: {
          durationMs: Date.now() - startedAt,
          messageCount: request.messages.length,
        },
      });
    }

    return {
      ok: true,
      content: enriched.content,
      actions: enriched.actions,
      recommendations: enriched.recommendations,
      citations: enriched.citations,
      suggestions: enriched.suggestions,
      intent: enriched.intent,
      knowledgeIds: enriched.knowledgeIds,
      crm: enriched.crm,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      const chatError = persianError("timeout");
      trackAiEvent("ai_error", { category: chatError.code });
      return { ok: false, error: chatError };
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      const chatError = persianError("offline");
      trackAiEvent("ai_error", { category: chatError.code });
      return { ok: false, error: chatError };
    }
    const chatError = persianError("unknown");
    trackAiEvent("ai_error", { category: chatError.code });
    return { ok: false, error: chatError };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Streaming-ready helper — delegates to streaming client.
 * Falls back to non-streaming sendAiChat when flag/SSE unavailable.
 */
export async function sendAiChatStreaming(
  request: AiChatRequest,
  handlers: AiStreamHandlers = {},
): Promise<AiChatResult> {
  return sendAiChatStreamingReady(request, {
    onToken: handlers.onToken,
    onDone: handlers.onDone,
    onError: (message) => {
      handlers.onError?.({
        code: "unknown",
        message,
      });
    },
  });
}
