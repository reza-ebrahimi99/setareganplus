/**
 * Shared loader for ChoiceStudio on counselor case + choices routes.
 */

import type { CounselorContext } from "@/lib/counselor-os/auth";
import { loadCounselorCaseBundle } from "@/lib/counselor-os/students";
import { loadCounselorLateJourney } from "@/lib/counselor-os/late-journey";
import { CHOICE_LIST_KIND } from "@/lib/guidance/journey-v2/constants";
import { ensureWorkingList, loadChoiceListView, reviewStats } from "@/lib/guidance/journey-v2/choices";
import { loadGuidanceV2Plan } from "@/lib/guidance/journey-v2/plan";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import type { ChoiceListView } from "@/lib/guidance/journey-v2/choices";
import type { SanjeshCaseView } from "@/lib/guidance/journey-v2/sanjesh";

import type { ChoiceStudioPhase } from "@/lib/counselor-os/steps-11-18-rail";

export type { ChoiceStudioPhase };

export type ChoiceStudioBundle = {
  studentId: string;
  studentName: string;
  phase: ChoiceStudioPhase;
  list: ChoiceListView | null;
  initialList: ChoiceListView | null;
  intelligence: Array<{ label: string; value: string }>;
  reviewStats: Awaited<ReturnType<typeof reviewStats>> | null;
  sessionNote: string | null;
  sanjesh: SanjeshCaseView | null;
  readyAtLabel: string | null;
};

function konkurIntelligence(late: Awaited<ReturnType<typeof loadCounselorLateJourney>>) {
  if (late.konkur?.groups?.length) {
    return late.konkur.groups
      .map((group) => {
        const bits = group.fields
          .filter((f) => {
            const field = f.key.includes(".") ? f.key.slice(f.key.lastIndexOf(".") + 1) : f.key;
            return ["nationalRank", "quotaRank", "finalScore"].includes(field);
          })
          .map((f) => `${f.label} ${f.currentValue}`);
        return `${group.title}: ${bits.join(" · ") || "—"}`;
      })
      .join(" | ");
  }
  return (
    late.konkur?.fields
      .filter((f) => {
        const field = f.key.includes(".") ? f.key.slice(f.key.lastIndexOf(".") + 1) : f.key;
        return ["nationalRank", "quotaRank", "finalScore", "examYear"].includes(field);
      })
      .map((f) => `${f.label} ${f.currentValue}`)
      .join(" · ") || "—"
  );
}

export async function loadChoiceStudioBundle(
  ctx: CounselorContext,
  studentId: string,
  phase: ChoiceStudioPhase,
): Promise<ChoiceStudioBundle | null> {
  const plan = await loadGuidanceV2Plan({
    organizationId: ctx.organizationId,
    studentId,
  });
  if (!plan) return null;

  const kind =
    phase === "final" || phase === "sanjesh" ? CHOICE_LIST_KIND.FINAL : CHOICE_LIST_KIND.INITIAL;

  if (phase === "initial" || phase === "final") {
    try {
      await ensureWorkingList({
        organizationId: ctx.organizationId,
        planId: plan.id,
        studentId,
        counselorUserId: ctx.userId,
        kind,
      });
    } catch {
      // FINAL may require INITIAL ready
    }
  }

  const [bundle, late] = await Promise.all([
    loadCounselorCaseBundle(ctx, studentId),
    loadCounselorLateJourney(ctx, studentId),
  ]);

  const initialList =
    late.initialList ??
    (await loadChoiceListView({
      organizationId: ctx.organizationId,
      planId: plan.id,
      kind: CHOICE_LIST_KIND.INITIAL,
      includeInactive: true,
    }));

  const list =
    phase === "final" || phase === "sanjesh" ? late.finalMapped.list : initialList;

  const stats = initialList ? await reviewStats(initialList) : null;
  const d = bundle.dossier;
  const intelligence = [
    { label: "هویت", value: bundle.caseModel.studentName },
    { label: "گروه آزمایشی", value: d.examGroupLabel ?? "—" },
    { label: "سهمیه / تحصیلی", value: Object.values(d.personal).slice(0, 3).join(" · ") || "—" },
    { label: "کنکور", value: konkurIntelligence(late) },
    { label: "بسته", value: d.finance.packageTitle },
    { label: "مشاور", value: bundle.caseModel.assignedCounselor?.name ?? "—" },
    { label: "رشته‌های مورد علاقه", value: d.majors.slice(0, 8).join("، ") || "—" },
    { label: "شهر / استان", value: d.provinces.slice(0, 8).join("، ") || "—" },
    { label: "نوع دوره", value: d.educationTypes.join("، ") || "—" },
  ];

  const sessionNote = late.secondSession.whenLabel
    ? `جلسه دوم: ${late.secondSession.whenLabel} — ${late.secondSession.statusLabel}`
    : late.secondSession.statusLabel;

  return {
    studentId,
    studentName: bundle.caseModel.studentName,
    phase,
    list,
    initialList,
    intelligence,
    reviewStats: stats,
    sessionNote,
    sanjesh: late.sanjesh,
    readyAtLabel: list?.updatedAtIso
      ? formatJalaliDateTimeShort(new Date(list.updatedAtIso))
      : null,
  };
}
