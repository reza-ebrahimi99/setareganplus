"use client";

import { useMemo, useRef, useState } from "react";
import { saveFinalExamScoreAction } from "@/app/ms/grades/actions";
import { toPersianDigits } from "@/lib/persian";
import type { GuidanceExamGroup } from "@/lib/guidance/types";
import {
  buildFinalExamViews,
  parseFinalExamScore,
  type FinalExamScoreMap,
} from "@/lib/guidance/office/final-exam";
import { MAJOR_OFFICE_TRANSCRIPT } from "@/lib/guidance/office/intake-href";

const GROUP_LABEL: Record<"general" | "specialized", string> = {
  general: "دروس عمومی",
  specialized: "دروس تخصصی",
};

export function FinalExamForm({
  examGroup,
  initialScores,
}: {
  examGroup: GuidanceExamGroup;
  initialScores: FinalExamScoreMap;
}) {
  const [scores, setScores] = useState<FinalExamScoreMap>(initialScores);
  const [saveLabel, setSaveLabel] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const { subjects, summary } = useMemo(
    () => buildFinalExamViews(examGroup, scores),
    [examGroup, scores],
  );

  function queueSave(subjectId: string, raw: string) {
    const parsed = raw.trim() === "" ? null : parseFinalExamScore(raw);
    setScores((prev) => ({ ...prev, [subjectId]: parsed }));
    if (timers.current[subjectId]) clearTimeout(timers.current[subjectId]);
    timers.current[subjectId] = setTimeout(() => {
      void persist(subjectId, raw);
    }, 500);
  }

  async function persist(subjectId: string, raw: string) {
    if (raw.trim() && parseFinalExamScore(raw) === null) {
      setError("نمره باید بین ۰ تا ۲۰ باشد.");
      setSaveLabel("error");
      return;
    }
    setSaveLabel("saving");
    const form = new FormData();
    form.set("subjectId", subjectId);
    form.set("score", raw);
    const result = await saveFinalExamScoreAction(form);
    if (!result.ok) {
      setError(result.error ?? "ذخیره نشد.");
      setSaveLabel("error");
      return;
    }
    setError(null);
    setSaveLabel("saved");
  }

  const generals = subjects.filter((row) => row.group === "general");
  const specialized = subjects.filter((row) => row.group === "specialized");

  return (
    <div className="office-grades" dir="rtl">
      <p className="office-intake__save" aria-live="polite">
        {saveLabel === "saving"
          ? "در حال ذخیره نمره…"
          : saveLabel === "saved"
            ? "نمره ذخیره شد"
            : saveLabel === "error"
              ? error ?? "ذخیره نشد"
              : "هر نمره به‌صورت خودکار ذخیره می‌شود"}
      </p>

      <section className="office-grades__progress" aria-label="پیشرفت نمرات">
        <div>
          <span>پیشرفت ورود نمرات</span>
          <strong>
            {toPersianDigits(summary.entered)} از {toPersianDigits(summary.total)}
          </strong>
        </div>
        <div
          className="office-grades__bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={summary.progressPercent}
        >
          <span style={{ width: `${Math.max(4, summary.progressPercent)}%` }} />
        </div>
        {summary.average != null ? (
          <p>
            معدل فعلی: <strong>{toPersianDigits(summary.average.toFixed(2))}</strong>
          </p>
        ) : (
          <p>با ورود اولین نمره، معدل به‌صورت خودکار محاسبه می‌شود.</p>
        )}
      </section>

      {error ? (
        <p className="office-grades__error" role="alert">
          {error}
        </p>
      ) : null}

      {[generals, specialized].map((group) =>
        group.length === 0 ? null : (
          <section
            key={group[0]?.group}
            className="office-grades__group"
            aria-label={GROUP_LABEL[group[0]!.group]}
          >
            <h2>{GROUP_LABEL[group[0]!.group]}</h2>
            <ul>
              {group.map((subject) => (
                <li key={subject.id} data-status={subject.status}>
                  <label htmlFor={`score-${subject.id}`}>
                    <span>{subject.label}</span>
                    <em>
                      {subject.status === "valid"
                        ? "ثبت شد"
                        : subject.status === "invalid"
                          ? "نامعتبر"
                          : "خالی"}
                    </em>
                  </label>
                  <input
                    id={`score-${subject.id}`}
                    name={subject.id}
                    type="text"
                    inputMode="decimal"
                    placeholder="۰ تا ۲۰"
                    defaultValue={
                      subject.score == null ? "" : String(subject.score)
                    }
                    aria-invalid={subject.status === "invalid"}
                    onChange={(event) =>
                      queueSave(subject.id, event.currentTarget.value)
                    }
                    onBlur={(event) =>
                      void persist(subject.id, event.currentTarget.value)
                    }
                  />
                </li>
              ))}
            </ul>
          </section>
        ),
      )}

      {summary.complete ? (
        <section className="office-grades__summary" aria-live="polite">
          <p>تصویر توانایی‌ها کامل شد</p>
          <h2>معدل کل: {toPersianDigits((summary.average ?? 0).toFixed(2))}</h2>
          {summary.strengths.length > 0 ? (
            <p>
              نقاط قوت: {summary.strengths.join("، ")}
            </p>
          ) : null}
          {summary.weaknesses.length > 0 ? (
            <p>
              نیاز به تقویت: {summary.weaknesses.join("، ")}
            </p>
          ) : (
            <p>نمره ضعیف ثبت نشده است.</p>
          )}
          <a href={MAJOR_OFFICE_TRANSCRIPT} className="office-intake__continue">
            آخرین قطعه از تصویر تحصیلی
          </a>
        </section>
      ) : (
        <p className="office-grades__hint">
          پس از ورود همه نمرات، بارگذاری فایل PDF کارنامه باز می‌شود.
        </p>
      )}
    </div>
  );
}
