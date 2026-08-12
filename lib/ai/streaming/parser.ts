import type { AiStreamEvent } from "@/lib/ai/streaming/types";

/**
 * Parse SSE-like chunks into stream events.
 * Compatible with future `text/event-stream` responses.
 */
export function parseSseChunk(chunk: string): AiStreamEvent[] {
  const events: AiStreamEvent[] = [];
  const blocks = chunk.split("\n\n");

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    let eventType = "token";
    let data = "";

    for (const line of trimmed.split("\n")) {
      if (line.startsWith("event:")) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        data += line.slice(5).trim();
      }
    }

    if (data === "[DONE]") {
      events.push({ type: "done" });
      continue;
    }

    if (eventType === "error") {
      events.push({ type: "error", error: data || "stream_error" });
      continue;
    }

    if (eventType === "message_start" || eventType === "message_end") {
      events.push({ type: eventType, data });
      continue;
    }

    if (data) {
      events.push({ type: "token", data });
    }
  }

  return events;
}

/** Accumulate tokens for partial rendering. */
export function appendStreamToken(current: string, token: string): string {
  return `${current}${token}`;
}
