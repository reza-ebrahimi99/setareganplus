import Link from "next/link";
import {
  buildCounselorCaseOperations,
  type CounselorCaseOperationLink,
} from "@/lib/counselor-os/case-page-config";

type Props = {
  studentId: string;
};

function OperationLink({ op }: { op: CounselorCaseOperationLink }) {
  return (
    <Link href={op.href} className="cos-btn cos-btn--ghost cos-case-actions__link">
      {op.label}
    </Link>
  );
}

export function CounselorStudentCaseActions({ studentId }: Props) {
  const ops = buildCounselorCaseOperations(studentId);
  const primary = ops.filter((o) => o.tier === "primary");
  const more = ops.filter((o) => o.tier === "more");

  return (
    <section className="cos-case-actions" aria-label="عملیات پرونده">
      <h2 className="cos-case-actions__title">عملیات پرونده</h2>
      <div className="cos-case-actions__primary">
        {primary.map((op) => (
          <OperationLink key={op.id} op={op} />
        ))}
      </div>
      <details className="cos-case-actions__more">
        <summary className="cos-btn cos-btn--ghost">عملیات بیشتر</summary>
        <div className="cos-case-actions__more-panel">
          {more.map((op) => (
            <OperationLink key={op.id} op={op} />
          ))}
        </div>
      </details>
    </section>
  );
}
