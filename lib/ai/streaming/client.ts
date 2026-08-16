import {
  getAiAssistantBaseUrl,
  getAiAssistantChatPath,
} from "@/lib/ai/assistant-config";
import { isAiFeatureEnabled } from "@/lib/ai/config";
import { enrichAiResponse } from "@/lib/ai/enrich";
import { appendStreamToken, parseSseChunk } from "@/lib/ai/streaming/parser";
import type { AiStreamHandlers } from "@/lib/ai/streaming/types";
import type { AiChatRequest, AiChatResult } from "@/types/ai";

function endpoint(): string {
  return `${getAiAssistantBaseUrl()}${getAiAssistantChatPath()}`;
}

async function fallbackNonStreaming(
  request: AiChatRequest,
  handlers: AiStreamHandlers,
): Promise<AiChatResult> {
  const { sendAiChat } = await import("@/lib/ai/api");
  const result = await sendAiChat(request);
  if (!result.ok) {
    handlers.onError?.(result.error.message);
    return result;
  }
  handlers.onToken?.(result.content);
  handlers.onDone?.(result.content);
  return result;
}

/**
 * Streaming-ready client.
 * Always builds the same reasoned outbound payload as sendAiChat.
 * Flag off / non-SSE → falls back to existing sendAiChat (no break).
 */
export async function sendAiChatStreamingReady(
  request: AiChatRequest,
  handlers: AiStreamHandlers = {},
): Promise<AiChatResult> {
  if (!isAiFeatureEnabled("streaming")) {
    return fallbackNonStreaming(request, handlers);
  }

  try {
    const { buildOutboundMessages } = await import("@/lib/ai/api");
    const outbound = await buildOutboundMessages(request);

    if (outbound.lightweight) {
      return fallbackNonStreaming(request, handlers);
    }

    const response = await fetch(endpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream, application/json",
      },
      body: JSON.stringify({
        messages: outbound.messages,
        system: outbound.systemPrompt,
        stream: true,
        locale: "fa",
        context: {
          pathname: outbound.pathname,
          page: outbound.page,
          atrin_intent: outbound.turn.primaryIntent,
          shape: outbound.turn.reasoning.responseShape,
        },
      }),
      signal: request.signal,
    });

    const contentType = response.headers.get("content-type") ?? "";
    if (
      !response.ok ||
      !contentType.includes("text/event-stream") ||
      !response.body
    ) {
      return fallbackNonStreaming(request, handlers);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let full = "";
    handlers.onEvent?.({ type: "message_start" });

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const event of parseSseChunk(chunk)) {
        handlers.onEvent?.(event);
        if (event.type === "token" && event.data) {
          full = appendStreamToken(full, event.data);
          handlers.onToken?.(event.data);
        }
        if (event.type === "error") {
          handlers.onError?.(event.error ?? "stream_error");
        }
        if (event.type === "done") {
          const enriched = enrichAiResponse({
            rawReply: full,
            query: outbound.query,
            pathname: outbound.pathname,
            page: outbound.page,
            deepPage: outbound.deepPage,
            knowledge: outbound.knowledge,
            siteHits: outbound.siteHits,
            recentUserTexts: outbound.recentUserTexts,
            turn: outbound.turn,
          });
          handlers.onDone?.(enriched.content);
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
      }
    }

    const enriched = enrichAiResponse({
      rawReply: full,
      query: outbound.query,
      pathname: outbound.pathname,
      page: outbound.page,
      deepPage: outbound.deepPage,
      knowledge: outbound.knowledge,
      siteHits: outbound.siteHits,
      recentUserTexts: outbound.recentUserTexts,
      turn: outbound.turn,
    });
    handlers.onDone?.(enriched.content);
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
      handlers.onError?.("aborted");
      return {
        ok: false,
        error: { code: "timeout", message: "درخواست لغو شد." },
      };
    }
    return fallbackNonStreaming(request, handlers);
  }
}
