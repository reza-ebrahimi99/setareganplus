import Link from "next/link";
import {
  completeFollowUpFormAction,
  rescheduleFollowUpNativeAction,
} from "@/app/admin/counselor/actions";
import { JalaliDateTimeFields } from "@/components/datetime/JalaliDateTimeFields";
import { requireCounselorContext } from "@/lib/counselor-os/auth";
import { listCounselorFollowUps } from "@/lib/counselor-os/follow-ups";
import { labelFollowUpPriority, labelFollowUpStatus } from "@/lib/counselor-os/labels";

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
          <p>اقدام، زمان‌بندی مجدد، یا ورود به پرونده</p>
        </div>
      </header>

      {sections.map((section) => (
        <section key={section.title} className="cos-panel">
          <h2>{section.title}</h2>
          {section.items.length === 0 ? (
            <p className="cos-empty">موردی در این بخش نیست.</p>
          ) : (
            <ul className="cos-follow-list cos-follow-list--rich">
              {section.items.map((f) => (
                <li key={f.id}>
                  <div>
                    <strong>{f.title}</strong>
                    <Link href={`/admin/counselor/students/${f.studentId}`}>{f.studentName}</Link>
                    <em>
                      {f.dueLabel} · {labelFollowUpPriority(f.priority)} · {labelFollowUpStatus(f.status)}
                    </em>
                    {f.description ? <p>{f.description}</p> : null}
                  </div>
                  <div className="cos-inline-actions">
                    <form action={completeFollowUpFormAction}>
                      <input type="hidden" name="followUpId" value={f.id} />
                      <button type="submit" className="cos-btn cos-btn--primary">
                        انجام شد
                      </button>
                    </form>
                    <form action={rescheduleFollowUpNativeAction} className="cos-inline-form">
                      <input type="hidden" name="followUpId" value={f.id} />
                      <div className="cos-follow-due">
                        <p className="cos-sched__field-label">تاریخ پیگیری</p>
                        <JalaliDateTimeFields
                          id={`reschedule-due-${f.id}`}
                          name="dueAt"
                          defaultValueIso={f.dueAtIso}
                        />
                      </div>
                      <button type="submit" className="cos-btn">
                        زمان‌بندی مجدد
                      </button>
                    </form>
                    <Link href={`/admin/counselor/students/${f.studentId}`} className="cos-btn cos-btn--ghost">
                      پرونده
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
