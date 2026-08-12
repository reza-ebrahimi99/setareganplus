import {
  getAiAssistantBaseUrl,
  getAiAssistantChatPath,
} from "@/lib/ai/assistant-config";
import { isAiFeatureEnabled } from "@/lib/ai/config";
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
    const response = await fetch(endpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream, application/json",
      },
      body: JSON.stringify({
        messages: request.messages,
        stream: true,
        locale: "fa",
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
          handlers.onDone?.(full);
          return { ok: true, content: full };
        }
      }
    }

    handlers.onDone?.(full);
    return { ok: true, content: full };
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
