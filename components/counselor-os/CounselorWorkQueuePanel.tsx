import Link from "next/link";
import { toPersianDigits } from "@/lib/persian";
import type { WorkQueueModel } from "@/lib/counselor-os/work-queue";
import {
  filterWorkQueueItems,
  type WorkQueueItem,
} from "@/lib/counselor-os/work-queue";
import type { WorkQueueBucketId } from "@/lib/counselor-os/work-queue-priority";

type Props = {
  model: WorkQueueModel;
  q?: string;
  step?: string;
  bucket?: string;
};

function WorkQueueList({
  items,
  bucketLabels,
}: {
  items: WorkQueueItem[];
  bucketLabels: WorkQueueModel["bucketLabels"];
}) {
  if (items.length === 0) {
    return <p className="cos-empty">موردی با این فیلتر نیست.</p>;
  }
  return (
    <ul className="cos-work-queue cos-work-queue--rich">
      {items.slice(0, 40).map((item) => (
        <li key={item.studentId}>
          <Link href={item.href}>
            <div className="cos-work-queue__row">
              <strong>{item.studentName}</strong>
              <span className="cos-work-queue__badge">
                {bucketLabels[item.bucket]}
              </span>
            </div>
            <span className="cos-work-queue__step">
              {item.currentStepTitle} · {item.actionLabel}
            </span>
            {item.blockerHint ? (
              <span className="cos-work-queue__warn">{item.blockerHint}</span>
            ) : null}
            <span className="cos-work-queue__wait">
              {item.sessionToday
                ? "جلسه امروز"
                : `انتظار ${toPersianDigits(String(item.waitingDays))} روز`}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function CounselorWorkQueuePanel({ model, q, step, bucket }: Props) {
  const stepNum = step && /^\d+$/.test(step) ? Number(step) : undefined;
  const bucketId =
    bucket && bucket in model.bucketLabels ? (bucket as WorkQueueBucketId) : undefined;
  const filtered = filterWorkQueueItems(model.all, {
    q,
    step: stepNum,
    bucket: bucketId,
  });

  const bucketTabs = (
    Object.entries(model.counts) as [WorkQueueBucketId, number][]
  ).filter(([, n]) => n > 0);

  return (
    <section className="cos-panel cos-work-queue-panel">
      <header className="cos-work-queue-panel__head">
        <h2>صف کاری من</h2>
        <p className="cos-muted">اولویت از وضعیت واقعی مراحل ۱۱–۱۸ محاسبه می‌شود.</p>
      </header>

      <form className="cos-work-queue-panel__filters" method="get" action="/admin/counselor">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="نام یا موبایل"
          className="cos-input"
          aria-label="جست‌وجو"
        />
        <select name="step" defaultValue={step ?? ""} className="cos-input" aria-label="مرحله">
          <option value="">همه مراحل</option>
          {[11, 12, 13, 14, 15, 16, 17, 18].map((s) => (
            <option key={s} value={s}>
              مرحله {toPersianDigits(String(s))}
            </option>
          ))}
        </select>
        <select name="bucket" defaultValue={bucket ?? ""} className="cos-input" aria-label="صف">
          <option value="">همه صف‌ها</option>
          {bucketTabs.map(([id, count]) => (
            <option key={id} value={id}>
              {model.bucketLabels[id]} ({toPersianDigits(String(count))})
            </option>
          ))}
        </select>
        <button type="submit" className="cos-btn">
          اعمال فیلتر
        </button>
      </form>

      <div className="cos-work-queue-panel__counts">
        {bucketTabs.slice(0, 8).map(([id, count]) => (
          <Link
            key={id}
            href={`/admin/counselor?bucket=${id}`}
            className="cos-work-queue-panel__count"
          >
            {model.bucketLabels[id]}
            <strong>{toPersianDigits(String(count))}</strong>
          </Link>
        ))}
      </div>

      <WorkQueueList items={filtered} bucketLabels={model.bucketLabels} />
    </section>
  );
}
