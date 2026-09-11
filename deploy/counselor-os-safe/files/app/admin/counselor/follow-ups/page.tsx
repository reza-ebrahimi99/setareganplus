import Link from "next/link";
import { completeFollowUpFormAction } from "@/app/admin/counselor/actions";
import { requireCounselorContext } from "@/lib/counselor-os/auth";
import { listCounselorFollowUps } from "@/lib/counselor-os/follow-ups";

export const dynamic = "force-dynamic";

export default async function CounselorFollowUpsPage() {
  const ctx = await requireCounselorContext();
  const [overdue, today, upcoming] = await Promise.all([
    listCounselorFollowUps(ctx, "overdue"),
    listCounselorFollowUps(ctx, "today"),
    listCounselorFollowUps(ctx, "upcoming"),
  ]);

  const sections = [
    { title: "عقب‌افتاده", items: overdue },
    { title: "امروز", items: today },
    { title: "آینده", items: upcoming },
  ];

  return (
    <div className="cos-page">
      <header className="cos-page__head">
        <div>
          <h1>پیگیری‌ها</h1>
          <p>اقدامات بعد از جلسات و پرونده‌های نیازمند پیگیری</p>
        </div>
      </header>

      {sections.map((section) => (
        <section key={section.title} className="cos-panel">
          <h2>{section.title}</h2>
          {section.items.length === 0 ? (
            <p className="cos-empty">موردی در این بخش نیست.</p>
          ) : (
            <ul className="cos-follow-list">
              {section.items.map((f) => (
                <li key={f.id}>
                  <div>
                    <strong>{f.title}</strong>
                    <Link href={`/admin/counselor/students/${f.studentId}`}>
                      {f.studentName}
                    </Link>
                    <em>{f.dueLabel}</em>
                  </div>
                  <form action={completeFollowUpFormAction}>
                    <input type="hidden" name="followUpId" value={f.id} />
                    <button type="submit" className="cos-btn cos-btn--ghost">
                      انجام شد
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
