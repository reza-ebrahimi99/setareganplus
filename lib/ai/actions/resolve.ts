import { catalogForIntent } from "@/lib/ai/actions/catalog";
import {
  detectWebsiteGuideIntent,
  mapExternalIntent,
} from "@/lib/ai/actions/detect-intent";
import { isSafeActionHref } from "@/lib/ai/actions/routes";
import type {
  ActionCard,
  AiActionResolverInput,
  WebsiteGuideIntent,
} from "@/types/action-card";

function normalizePath(pathname: string | null | undefined): string | null {
  if (!pathname) return null;
  const clean = pathname.split("?")[0]?.split("#")[0] ?? pathname;
  if (clean.length > 1 && clean.endsWith("/")) return clean.slice(0, -1);
  return clean || "/";
}

function isExecutableCard(card: ActionCard): boolean {
  if (card.type === "chat") {
    return Boolean(card.prompt?.trim());
  }
  return isSafeActionHref(card.href);
}

function applyCrmScoreBoost(
  cards: ActionCard[],
  crmScore: AiActionResolverInput["crmScore"],
): ActionCard[] {
  if (crmScore !== "High") return cards;
  return cards.map((card) => {
    if (
      card.type === "open-form" ||
      card.href === "/consultation" ||
      card.href === "/pre-registration" ||
      card.href === "/ghalamchi/register"
    ) {
      return { ...card, priority: Math.max(1, card.priority - 5) };
    }
    return card;
  });
}

function deprioritizeCurrentPage(
  cards: ActionCard[],
  pathname: string | null,
): ActionCard[] {
  if (!pathname) return cards;
  return cards.map((card) =>
    (card.type === "navigate" || card.type === "open-form") &&
    card.href === pathname
      ? { ...card, priority: card.priority + 50 }
      : card,
  );
}

/** Intents that must stay tightly scoped (no mixing with general extras). */
const STRICT_INTENTS = new Set<WebsiteGuideIntent>([
  "greeting",
  "admissions",
  "school",
  "study",
]);

/**
 * AiActionResolver — website UX layer.
 * Returns ActionCard[] for glass action UI under assistant replies.
 *
 * Rules:
 * - greeting → 0
 * - general → 0
 * - study / admissions / school → max 2
 * - never more than 2
 */
export function AiActionResolver(input: AiActionResolverInput): ActionCard[] {
  const fromIntent = mapExternalIntent(input.intent);
  const fromQuery = detectWebsiteGuideIntent(input.query ?? "");

  let guideIntent: WebsiteGuideIntent = fromIntent ?? fromQuery;
  if (guideIntent === "none" || guideIntent === "greeting") return [];

  // Prefer query keywords over coarse "general" external intent
  if (
    fromIntent === "general" &&
    fromQuery !== "general" &&
    fromQuery !== "none" &&
    fromQuery !== "greeting"
  ) {
    guideIntent = fromQuery;
  }

  // Alias legacy names onto the intentional UX sets
  if (guideIntent === "pre_registration") guideIntent = "admissions";
  if (guideIntent === "about_school") guideIntent = "school";

  // Keep conversation clean — no action cards for open-ended / general chat
  if (guideIntent === "general") return [];

  const pathname = normalizePath(input.pathname);
  let cards = catalogForIntent(guideIntent);

  if (!STRICT_INTENTS.has(guideIntent)) {
    cards = applyCrmScoreBoost(cards, input.crmScore);
  }
  cards = deprioritizeCurrentPage(cards, pathname);

  const seen = new Set<string>();
  const unique: ActionCard[] = [];
  const limit = 2;

  for (const card of [...cards].sort((a, b) => a.priority - b.priority)) {
    if (!isExecutableCard(card)) continue;
    const key = `${card.type}:${card.href}:${card.title}:${card.prompt ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(card);
    if (unique.length >= limit) break;
  }

  return unique;
}

/** Alias matching the Phase 9 naming. */
export const resolveActionCards = AiActionResolver;
