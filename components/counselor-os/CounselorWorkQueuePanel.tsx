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

/** Primary tabs requested for counselor queue UI (always visible). */
const PRIMARY_TABS: { id: WorkQueueBucketId | "all" | "today_combined"; label: string }[] = [
  { id: "urgent", label: "فوری" },
  { id: "today_combined", label: "امروز" },
  { id: "overdue", label: "عقب‌افتاده" },
  { id: "waiting_me", label: "منتظر اقدام من" },
  { id: "waiting_student", label: "منتظر دانش‌آموز" },
  { id: "ready_finalize", label: "آماده نهایی‌سازی" },
  { id: "ready_sanjesh", label: "آماده ثبت سنجش" },
  { id: "all", label: "همه" },
];

function itemsForTab(
  all: WorkQueueItem[],
  tab: (typeof PRIMARY_TABS)[number]["id"],
): WorkQueueItem[] {
  if (tab === "all") return all;
  if (tab === "today_combined") {
    return all.filter(
      (i) => i.bucket === "today" || i.bucket === "sessions_today" || i.sessionToday,
    );
  }
  return all.filter((i) => i.bucket === tab);
}

function WorkQueueList({
  items,
  bucketLabels,
}: {
  items: WorkQueueItem[];
  bucketLabels: WorkQueueModel["bucketLabels"];
}) {
  if (items.length === 0) {
    return (
      <p className="cos-empty cos-work-queue-panel__empty">
        در این تب موردی نیست. صف خالی است — فیلتر دیگری را امتحان کنید یا پرونده‌های مرحله ۱۱–۱۸ را از
        لیست دانش‌آموزان باز کنید.
      </p>
    );
  }
  return (
    <ul className="cos-work-queue cos-work-queue--rich">
      {items.slice(0, 50).map((item) => (
        <li key={`${item.studentId}-${item.bucket}`}>
          <div className="cos-work-queue__row">
            <strong>{item.studentName}</strong>
            <span className="cos-work-queue__badge">{bucketLabels[item.bucket]}</span>
          </div>
          <span className="cos-work-queue__step">
            {item.currentStepTitle} · {item.actionLabel}
          </span>
          <span className="cos-muted">
            مسئول: {item.blockerHint ? "مشاور" : "—"} · اولویت{" "}
            {toPersianDigits(String(Math.max(1, 500 - item.priorityScore)))}
          </span>
          {item.blockerHint ? (
            <span className="cos-work-queue__warn">{item.blockerHint}</span>
          ) : null}
          <span className="cos-work-queue__wait">
            {item.sessionToday
              ? "جلسه امروز"
              : `انتظار ${toPersianDigits(String(item.waitingDays))} روز`}
          </span>
          <Link href={item.href} className="cos-btn cos-btn--primary cos-work-queue__enter">
            ورود به پرونده
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function CounselorWorkQueuePanel({ model, q, step, bucket }: Props) {
  const stepNum = step && /^\d+$/.test(step) ? Number(step) : undefined;
  const activeTab =
    bucket === "all" || bucket === "today_combined" || (bucket && bucket in model.bucketLabels)
      ? bucket
      : undefined;

  const resolvedTab = (activeTab ?? "all") as (typeof PRIMARY_TABS)[number]["id"];

  const filtered = filterWorkQueueItems(model.all, {
    q,
    step: stepNum,
    bucket:
      resolvedTab !== "all" && resolvedTab !== "today_combined" && resolvedTab in model.bucketLabels
        ? (resolvedTab as WorkQueueBucketId)
        : undefined,
  });

  const listItems =
    resolvedTab === "all"
      ? filtered
      : resolvedTab === "today_combined"
        ? itemsForTab(filtered, "today_combined")
        : resolvedTab in model.bucketLabels
          ? filtered
          : itemsForTab(filtered, resolvedTab);

  return (
    <section className="cos-panel cos-work-queue-panel cos-work-queue-panel--primary">
      <header className="cos-work-queue-panel__head">
        <h2>صف کاری من</h2>
        <p className="cos-muted">
          اولویت از وضعیت واقعی مراحل ۱۱–۱۸ ·{" "}
          {toPersianDigits(String(model.all.length))} پرونده در صف
        </p>
      </header>

      <div className="cos-work-queue-panel__tabs" role="tablist">
        {PRIMARY_TABS.map((tab) => {
          const count =
            tab.id === "all"
              ? model.all.length
              : itemsForTab(model.all, tab.id).length;
          const href =
            tab.id === "all"
              ? `/admin/counselor?bucket=all${q ? `&q=${encodeURIComponent(q)}` : ""}${step ? `&step=${step}` : ""}`
              : `/admin/counselor?bucket=${tab.id}${q ? `&q=${encodeURIComponent(q)}` : ""}${step ? `&step=${step}` : ""}`;
          const isActive = resolvedTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={href}
              role="tab"
              aria-selected={isActive}
              className={`cos-work-queue-panel__tab${isActive ? " is-active" : ""}`}
            >
              {tab.label}
              <strong>{toPersianDigits(String(count))}</strong>
            </Link>
          );
        })}
      </div>

      <form className="cos-work-queue-panel__filters" method="get" action="/admin/counselor">
        <input type="hidden" name="bucket" value={resolvedTab} />
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
        <button type="submit" className="cos-btn">
          اعمال فیلتر
        </button>
      </form>

      <WorkQueueList items={listItems} bucketLabels={model.bucketLabels} />
    </section>
  );
}
