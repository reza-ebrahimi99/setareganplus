import type { Prisma } from "@/generated/prisma/client";
import { LeadSourceType, LeadStatus } from "@/generated/prisma/enums";
import {
  hasPermission,
  scopedLeadWhereForFilter,
} from "@/lib/auth/permissions";
import type { AdminSessionContext } from "@/lib/auth/require-admin";
import { getTehranParts, tehranDayBoundsUtc } from "@/lib/datetime/tehran-zone";

export type LeadListFilters = {
  scope: string | undefined;
  assignment: "assigned" | undefined;
  created: "today" | undefined;
  sourceType: LeadSourceType | undefined;
  outcome: "registered" | "lost" | undefined;
  ownerUserId: string | undefined;
};

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

export function parseLeadListFilters(input: unknown): LeadListFilters {
  const value =
    input && typeof input === "object" && !Array.isArray(input)
      ? input as Record<string, unknown>
      : {};
  const sourceType = optionalString(value.sourceType);
  const ownerUserId = optionalString(value.ownerUserId);
  return {
    scope: optionalString(value.scope),
    assignment: value.assignment === "assigned" ? "assigned" : undefined,
    created: value.created === "today" ? "today" : undefined,
    sourceType:
      sourceType &&
      (Object.values(LeadSourceType) as string[]).includes(sourceType)
        ? sourceType as LeadSourceType
        : undefined,
    outcome:
      value.outcome === "registered" || value.outcome === "lost"
        ? value.outcome
        : undefined,
    ownerUserId:
      ownerUserId && ownerUserId.length <= 128 ? ownerUserId : undefined,
  };
}

export function leadListWhere(
  session: AdminSessionContext,
  filters: LeadListFilters,
  now = new Date(),
): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = {
    ...scopedLeadWhereForFilter(session, filters.scope),
  };
  if (
    filters.assignment === "assigned" &&
    hasPermission(session, "crm.view_all")
  ) {
    where.ownerUserId = { not: null };
  }
  if (filters.ownerUserId && hasPermission(session, "crm.view_all")) {
    where.ownerUserId = filters.ownerUserId;
  }
  if (filters.sourceType) where.sourceType = filters.sourceType;
  if (filters.created === "today") {
    const tehranToday = getTehranParts(now);
    const { startUtc, endUtc } = tehranDayBoundsUtc(
      tehranToday.year,
      tehranToday.month,
      tehranToday.day,
    );
    where.createdAt = { gte: startUtc, lte: endUtc };
  }
  if (filters.outcome) {
    const registered = filters.outcome === "registered";
    where.OR = [
      {
        stage: registered
          ? { OR: [{ isWon: true }, { stageType: "WON" }] }
          : { OR: [{ isLost: true }, { stageType: "LOST" }] },
      },
      {
        stageId: null,
        status: registered ? LeadStatus.ENROLLED : LeadStatus.LOST,
      },
    ];
  }
  return where;
}
