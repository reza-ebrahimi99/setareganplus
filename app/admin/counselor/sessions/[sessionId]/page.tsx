import Link from "next/link";
import { notFound } from "next/navigation";
import { SessionWorkspaceForm } from "@/components/counselor-os/SessionWorkspaceForm";
import { requireCounselorContext } from "@/lib/counselor-os/auth";
import { loadSessionWorkspace } from "@/lib/counselor-os/sessions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ sessionId: string }> };

export default async function CounselorSessionWorkspacePage({ params }: Props) {
  const { sessionId } = await params;
  const ctx = await requireCounselorContext();

  let model;
  try {
    model = await loadSessionWorkspace(ctx, sessionId);
  } catch {
    notFound();
  }

  return (
    <div className="cos-page">
      <header className="cos-page__head">
        <div>
          <p className="cos-page__eyebrow">ثبت نتیجه جلسه</p>
          <h1>{model.studentName}</h1>
        </div>
        <Link href={`/admin/counselor/students/${model.studentId}`} className="cos-btn cos-btn--ghost">
          بازگشت به پرونده
        </Link>
      </header>
      <SessionWorkspaceForm model={model} />
    </div>
  );
}
