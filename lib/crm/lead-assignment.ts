import {
  parseLeadListFilters,
  type LeadListFilters,
} from "@/lib/crm/lead-list-filters";

export const MAX_BULK_LEAD_ASSIGNMENT_SIZE = 5_000;
export const MAX_FILTERED_LEAD_ASSIGNMENT_SIZE = 5_000;

export type ParsedBulkLeadAssignment =
  | {
      ok: true;
      selection:
        | { mode: "explicit"; leadIds: string[] }
        | {
            mode: "filtered";
            scope: string | undefined;
            filters: LeadListFilters;
            excludedLeadIds: string[];
          };
      ownerUserId: string | null;
    }
  | { ok: false; error: string };

export function parseBulkLeadAssignmentInput(
  input: unknown,
): ParsedBulkLeadAssignment {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, error: "درخواست تخصیص نامعتبر است." };
  }
  const rawLeadIds = Reflect.get(input, "leadIds");
  const rawOwnerUserId = Reflect.get(input, "ownerUserId");
  const selectAllFiltered = Reflect.get(input, "selectAllFiltered") === true;
  const rawScope = Reflect.get(input, "scope");
  const rawFilters = Reflect.get(input, "filters");
  const rawExcludedLeadIds = Reflect.get(input, "excludedLeadIds");
  if (
    (rawOwnerUserId !== null &&
      rawOwnerUserId !== undefined &&
      typeof rawOwnerUserId !== "string") ||
    (rawScope !== undefined && typeof rawScope !== "string")
  ) {
    return { ok: false, error: "درخواست تخصیص نامعتبر است." };
  }
  const ownerUserId =
    typeof rawOwnerUserId === "string" ? rawOwnerUserId.trim() || null : null;
  if (ownerUserId && ownerUserId.length > 128) {
    return { ok: false, error: "شناسه مسئول نامعتبر است." };
  }

  if (selectAllFiltered) {
    if (
      !Array.isArray(rawExcludedLeadIds) ||
      rawExcludedLeadIds.length > MAX_FILTERED_LEAD_ASSIGNMENT_SIZE ||
      rawExcludedLeadIds.some(
        (id) => typeof id !== "string" || !id.trim() || id.length > 128,
      )
    ) {
      return { ok: false, error: "درخواست تخصیص نامعتبر است." };
    }
    return {
      ok: true,
      selection: {
        mode: "filtered",
        scope: typeof rawScope === "string" ? rawScope.trim() || undefined : undefined,
        filters: parseLeadListFilters({
          ...(rawFilters &&
          typeof rawFilters === "object" &&
          !Array.isArray(rawFilters)
            ? rawFilters
            : {}),
          scope:
            typeof rawScope === "string"
              ? rawScope.trim() || undefined
              : undefined,
        }),
        excludedLeadIds: [
          ...new Set(rawExcludedLeadIds.map((id: string) => id.trim())),
        ],
      },
      ownerUserId,
    };
  }

  if (
    !Array.isArray(rawLeadIds) ||
    rawLeadIds.length > MAX_BULK_LEAD_ASSIGNMENT_SIZE ||
    rawLeadIds.some(
      (id) => typeof id !== "string" || !id.trim() || id.length > 128,
    )
  ) {
    return { ok: false, error: "درخواست تخصیص نامعتبر است." };
  }
  const leadIds = [...new Set(rawLeadIds.map((id: string) => id.trim()))];
  if (leadIds.length === 0) {
    return { ok: false, error: "حداقل یک لید را انتخاب کنید." };
  }
  return {
    ok: true,
    selection: { mode: "explicit", leadIds },
    ownerUserId,
  };
}
