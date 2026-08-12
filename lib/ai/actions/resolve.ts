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
    card.type === "navigate" && card.href === pathname
      ? { ...card, priority: card.priority + 50 }
      : card,
  );
}

/**
 * AiActionResolver — website UX layer.
 * Returns ActionCard[] for glass action UI under assistant replies.
 */
export function AiActionResolver(input: AiActionResolverInput): ActionCard[] {
  const fromIntent = mapExternalIntent(input.intent);
  const fromQuery = detectWebsiteGuideIntent(input.query ?? "");

  let guideIntent: WebsiteGuideIntent = fromIntent ?? fromQuery;
  if (guideIntent === "none") return [];

  // Prefer query keywords over coarse "general" external intent
  if (
    fromIntent === "general" &&
    fromQuery !== "general" &&
    fromQuery !== "none"
  ) {
    guideIntent = fromQuery;
  }

  const pathname = normalizePath(input.pathname);
  let cards = catalogForIntent(guideIntent);
  cards = applyCrmScoreBoost(cards, input.crmScore);
  cards = deprioritizeCurrentPage(cards, pathname);

  const seen = new Set<string>();
  const unique: ActionCard[] = [];

  for (const card of [...cards].sort((a, b) => a.priority - b.priority)) {
    if (!isSafeActionHref(card.href)) continue;
    const key = `${card.type}:${card.href}:${card.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(card);
    if (unique.length >= 4) break;
  }

  return unique;
}

/** Alias matching the Phase 9 naming. */
export const resolveActionCards = AiActionResolver;
