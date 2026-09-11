"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChoiceListView } from "@/lib/guidance/journey-v2/choices";
import type { SanjeshCaseView } from "@/lib/guidance/journey-v2/sanjesh";
import { toPersianDigits } from "@/lib/persian";

export function ChoiceSanjeshMode(props: {
  studentId: string;
  list: ChoiceListView | null;
  sanjesh: SanjeshCaseView | null;
}) {
  const items = useMemo(() => (props.list?.items ?? []).filter((i) => i.isActive), [props.list]);
  const storageKey = props.list ? `staros-sanjesh-check:${props.list.id}` : "";
  const [checked, setChecked] = useState<string[]>([]);

  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      setChecked(Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : []);
    } catch {
      setChecked([]);
    }
  }, [storageKey]);

  function toggle(id: string) {
    setChecked((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (storageKey) window.localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
  }

  if (!props.list || props.list.status !== "CONFIRMED") {
    return (
      <section className="gcs-sanjesh">
        <h2>حالت ثبت سنجش</h2>
        <p>فقط نسخه تأییدشده دانش‌آموز برای ورود دستی به سنجش قابل استفاده است.</p>
      </section>
    );
  }

  const done = checked.filter((id) => items.some((i) => i.id === id)).length;

  return (
    <section className="gcs-sanjesh">
      <header>
        <h2>حالت ثبت سنجش</h2>
        <p>
          این چک‌لیست فقط کمک عملیاتی برای ورود دستی در سامانه رسمی سنجش است و به‌معنی تأیید سنجش
          نیست.
        </p>
        <p className="gcs-sanjesh__progress">
          {toPersianDigits(done)} از {toPersianDigits(items.length)} کد علامت‌گذاری شده
        </p>
        <div className="gcs-sanjesh__ops">
          <button
            type="button"
            className="gcs-btn gcs-btn--gold"
            onClick={() =>
              void copy(items.map((i) => i.officialCode).filter(Boolean).join("\n"))
            }
          >
            کپی همه کدها
          </button>
        </div>
        {props.sanjesh ? (
          <p>
            وضعیت پرونده: <strong>{props.sanjesh.statusLabel}</strong>
            {props.sanjesh.reference ? ` · پیگیری ${props.sanjesh.reference}` : ""}
          </p>
        ) : null}
      </header>
      <ol className="gcs-sanjesh__list">
        {items.map((item) => (
          <li key={item.id}>
            <em>{toPersianDigits(item.sortOrder)}</em>
            <strong className="gcs-sanjesh__code">{item.officialCode || "—"}</strong>
            <span>
              {item.major}
              <small>
                {item.university} · {item.educationTypeLabel}
              </small>
            </span>
            <button
              type="button"
              className="gcs-btn gcs-btn--ghost"
              onClick={() => void copy(item.officialCode ?? "")}
              disabled={!item.officialCode}
            >
              کپی کد
            </button>
            <label>
              <input
                type="checkbox"
                checked={checked.includes(item.id)}
                onChange={() => toggle(item.id)}
              />
              وارد شد
            </label>
          </li>
        ))}
      </ol>
    </section>
  );
}
