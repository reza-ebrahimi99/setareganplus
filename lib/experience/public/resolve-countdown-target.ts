import type { CountdownTargetKind } from "@/lib/experience/blocks/countdown";
import type { ExperiencePublicDeadlineResult } from "@/lib/experience/public/render-context";

export type ResolvedCountdownTarget = {
  targetIso: string | null;
  kind: "DISCOUNT" | "REGISTRATION_CLOSE" | null;
  unavailable: boolean;
};

/**
 * Resolve countdown target from public context deadlines using config targetKind.
 * Timestamps always come from context — never from block config.
 */
export function resolveCountdownTargetFromContext(
  deadlines: ExperiencePublicDeadlineResult,
  targetKind: CountdownTargetKind | undefined,
): ResolvedCountdownTarget {
  const kind = targetKind ?? "AUTO";

  if (kind === "DISCOUNT") {
    if (!deadlines.discountEndsAtIso) {
      return { targetIso: null, kind: null, unavailable: true };
    }
    return {
      targetIso: deadlines.discountEndsAtIso,
      kind: "DISCOUNT",
      unavailable: false,
    };
  }

  if (kind === "REGISTRATION_CLOSE") {
    if (!deadlines.registrationClosesAtIso) {
      return { targetIso: null, kind: null, unavailable: true };
    }
    return {
      targetIso: deadlines.registrationClosesAtIso,
      kind: "REGISTRATION_CLOSE",
      unavailable: false,
    };
  }

  // AUTO — prefer discount countdown window, else registration close
  if (deadlines.discountEndsAtIso && deadlines.countdownKind === "DISCOUNT") {
    return {
      targetIso: deadlines.discountEndsAtIso,
      kind: "DISCOUNT",
      unavailable: false,
    };
  }
  if (deadlines.discountEndsAtIso) {
    return {
      targetIso: deadlines.discountEndsAtIso,
      kind: "DISCOUNT",
      unavailable: false,
    };
  }
  if (deadlines.registrationClosesAtIso) {
    return {
      targetIso: deadlines.registrationClosesAtIso,
      kind: "REGISTRATION_CLOSE",
      unavailable: false,
    };
  }
  return { targetIso: null, kind: null, unavailable: true };
}
