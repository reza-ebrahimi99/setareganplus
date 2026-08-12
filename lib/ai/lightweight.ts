/**
 * Local lightweight replies for greetings / trivial turns.
 * Avoids a full model round-trip and institutional knowledge injection.
 */

import { getAtrinGreetingSet } from "@/lib/atrin/greetings";
import { detectWebsiteGuideIntent } from "@/lib/ai/actions/detect-intent";
import { isLightweightIntent } from "@/lib/ai/prompt-modules";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c\u200f]/g, "")
    .replace(/[?!.,،؛:]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const TRIVIAL = new Set([
  "سلام",
  "درود",
  "سلام علیکم",
  "سلامم",
  "hi",
  "hello",
  "hey",
  "صبح بخیر",
  "ظهر بخیر",
  "عصر بخیر",
  "شب بخیر",
  "وقت بخیر",
  "خوبی",
  "خوبی؟",
  "چطوری",
  "چطوری؟",
  "مرسی",
  "ممنون",
  "تشکر",
]);

export function isTrivialConversation(query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  if (q.length > 40) return false;
  if (TRIVIAL.has(q)) return true;
  return isLightweightIntent(detectWebsiteGuideIntent(query));
}

export function buildLightweightReply(query: string): string {
  const intent = detectWebsiteGuideIntent(query);
  if (intent === "greeting" || isTrivialConversation(query)) {
    const set = getAtrinGreetingSet()[0];
    const lines = set?.lines ?? [
      "سلام 👋",
      "خوش اومدی.",
      "از کجا شروع کنیم؟",
    ];
    return lines.slice(0, 3).join("\n");
  }
  return "سلام 👋 خوش اومدی. بگو چطور کمکت کنم؟";
}
