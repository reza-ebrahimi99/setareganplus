import { notFound } from "next/navigation";
import { ChoiceWorkspace } from "@/components/counselor-os/ChoiceWorkspace";
import { requireCounselorContext } from "@/lib/counselor-os/auth";
import { loadCounselorCaseBundle } from "@/lib/counselor-os/students";
import { loadCounselorLateJourney } from "@/lib/counselor-os/late-journey";
import { CHOICE_LIST_KIND } from "@/lib/guidance/journey-v2/constants";
import { ensureWorkingList, loadChoiceListView } from "@/lib/guidance/journey-v2/choices";
import { loadGuidanceV2Plan } from "@/lib/guidance/journey-v2/plan";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ phase?: string }>;
};

export default async function CounselorChoiceWorkspacePage({ params, searchParams }: Props) {
  const { studentId } = await params;
  const { phase: phaseRaw } = await searchParams;
  const ctx = await requireCounselorContext();

  let bundle;
  try {
    bundle = await loadCounselorCaseBundle(ctx, studentId);
  } catch {
    notFound();
  }

  const plan = await loadGuidanceV2Plan({
    organizationId: ctx.organizationId,
    studentId,
  });
  if (!plan) notFound();

  const phase =
    phaseRaw === "final" ? "final" : phaseRaw === "review" ? "review" : "initial";
  const kind = phase === "final" ? CHOICE_LIST_KIND.FINAL : CHOICE_LIST_KIND.INITIAL;

  if (phase !== "review") {
    try {
      await ensureWorkingList({
        organizationId: ctx.organizationId,
        planId: plan.id,
        studentId,
        counselorUserId: ctx.userId,
        kind,
      });
    } catch {
      // FINAL copy requires INITIAL ready; workspace shows the error state via null list
    }
  }

  const late = await loadCounselorLateJourney(ctx, studentId);
  const list =
    phase === "final"
      ? late.finalMapped.list
      : await loadChoiceListView({
          organizationId: ctx.organizationId,
          planId: plan.id,
          kind: CHOICE_LIST_KIND.INITIAL,
          includeInactive: true,
        });

  const d = bundle.dossier;
  const intelligence = [
    { label: "هویت", value: bundle.caseModel.studentName },
    { label: "گروه آزمایشی", value: d.examGroupLabel ?? "—" },
    { label: "معدل / تحصیلی", value: Object.values(d.personal).slice(0, 3).join(" · ") || "—" },
    {
      label: "هالند",
      value: d.holland.completed
        ? `${d.holland.code} · ${d.holland.scores.map((s) => `${s.typeLabel} ${s.raw}`).join("، ")}`
        : "تکمیل نشده",
    },
    { label: "رشته‌ها", value: d.majors.slice(0, 8).join("، ") || "—" },
    { label: "شهر / استان", value: d.provinces.slice(0, 8).join("، ") || "—" },
    { label: "نوع دوره", value: d.educationTypes.join("، ") || "—" },
    { label: "معیارها", value: d.priorities.join(" > ") || "—" },
    {
      label: "کنکور",
      value: late.konkur?.groups?.length
        ? late.konkur.groups
            .map((group) => {
              const bits = group.fields
                .filter((f) => {
                  const field = f.key.includes(".") ? f.key.slice(f.key.lastIndexOf(".") + 1) : f.key;
                  return ["nationalRank", "quotaRank", "finalScore"].includes(field);
                })
                .map((f) => `${f.label} ${f.currentValue}`);
              return `${group.title}: ${bits.join(" · ") || "—"}`;
            })
            .join(" | ")
        : late.konkur?.fields
            .filter((f) => {
              const field = f.key.includes(".") ? f.key.slice(f.key.lastIndexOf(".") + 1) : f.key;
              return ["nationalRank", "quotaRank", "finalScore", "examYear"].includes(field);
            })
            .map((f) => `${f.label} ${f.currentValue}`)
            .join(" · ") || "—",
    },
    { label: "بسته", value: d.finance.packageTitle },
  ];

  return (
    <ChoiceWorkspace
      studentId={studentId}
      studentName={bundle.caseModel.studentName}
      phase={phase}
      list={list}
      intelligence={intelligence}
    />
  );
}
