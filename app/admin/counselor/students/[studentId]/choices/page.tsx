import { notFound } from "next/navigation";
import Link from "next/link";
import { ChoiceStudio } from "@/components/guidance/choice-studio/ChoiceStudio";
import { requireCounselorContext } from "@/lib/counselor-os/auth";
import {
  loadChoiceStudioBundle,
  type ChoiceStudioPhase,
} from "@/lib/counselor-os/choice-studio-bundle";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ phase?: string }>;
};

function parsePhase(raw: string | undefined): ChoiceStudioPhase {
  if (raw === "final") return "final";
  if (raw === "review") return "review";
  if (raw === "sanjesh") return "sanjesh";
  return "initial";
}

export default async function CounselorChoiceWorkspacePage({ params, searchParams }: Props) {
  const { studentId } = await params;
  const { phase: phaseRaw } = await searchParams;
  const ctx = await requireCounselorContext();
  const phase = parsePhase(phaseRaw);

  const bundle = await loadChoiceStudioBundle(ctx, studentId, phase);
  if (!bundle) notFound();

  return (
    <div className="cos-page">
      <header className="cos-page__head">
        <div>
          <p className="cos-page__eyebrow">استودیوی چیدمان</p>
          <h1>{bundle.studentName}</h1>
        </div>
        <Link
          href={`/admin/counselor/students/${studentId}#cos-steps1118`}
          className="cos-btn cos-btn--ghost"
        >
          بازگشت به Workspace ۱۱–۱۸
        </Link>
      </header>
      <ChoiceStudio {...bundle} />
    </div>
  );
}
