"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  markProfile360CompleteAction,
  saveProfile360SectionAction,
} from "@/app/portal/student/services/guidance/profile-actions";
import { PortalIcon } from "@/components/portal/icons";
import { InterestProgressRing } from "@/components/guidance/interest/InterestProgressRing";
import { formatJalaliDateShort } from "@/lib/datetime/jalali";
import { toPersianDigits } from "@/lib/persian";
import type {
  StudentProfileFieldValue,
  StudentProfilePresentationModel,
  StudentProfileSectionModel,
  StudentProfileSectionValues,
} from "@/lib/guidance/profile360/types";

type Student360ProfileScreenProps = {
  model: StudentProfilePresentationModel;
};

function tagsToString(value: StudentProfileFieldValue | undefined): string {
  if (value == null) return "";
  if (Array.isArray(value)) return value.join("، ");
  return value;
}

function SectionEditor({
  section,
  onSaved,
}: {
  section: StudentProfileSectionModel;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of section.fields) {
      initial[field.id] = tagsToString(section.values[field.id]);
    }
    return initial;
  });

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const field of section.fields) {
      next[field.id] = tagsToString(section.values[field.id]);
    }
    setDraft(next);
    setEditing(false);
    setError(null);
  }, [section.id, section.percent, section.filledCount]);

  if (section.architectureOnly) {
    return (
      <article
        id={`section-${section.id}`}
        className="profile360-section profile360-section--architecture"
        data-portal-accent={section.accent}
      >
        <div className="profile360-section__head">
          <span className="profile360-section__icon" aria-hidden="true">
            <PortalIcon name={section.icon} className="size-5" />
          </span>
          <div>
            <h3 className="profile360-section__title">{section.title}</h3>
            <p className="profile360-section__desc">{section.description}</p>
          </div>
        </div>
        <div className="profile360-empty">
          <strong>معماری مدارک آینده</strong>
          <span>جایگاه آپلود مدارک بدون بازطراحی صفحه — فعلاً خالی و عمدی.</span>
        </div>
      </article>
    );
  }

  function cancel() {
    const next: Record<string, string> = {};
    for (const field of section.fields) {
      next[field.id] = tagsToString(section.values[field.id]);
    }
    setDraft(next);
    setEditing(false);
    setError(null);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const values: StudentProfileSectionValues = {};
      for (const field of section.fields) {
        const raw = draft[field.id] ?? "";
        values[field.id] =
          field.type === "tags"
            ? raw
                .split(/[,،]/)
                .map((v) => v.trim())
                .filter(Boolean)
            : raw;
      }
      const result = await saveProfile360SectionAction({
        sectionId: section.id,
        values,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditing(false);
      onSaved();
    });
  }

  return (
    <article
      id={`section-${section.id}`}
      className="profile360-section"
      data-state={section.state}
      data-portal-accent={section.accent}
    >
      <div className="profile360-section__head">
        <span className="profile360-section__icon" aria-hidden="true">
          <PortalIcon name={section.icon} className="size-5" />
        </span>
        <div className="profile360-section__meta">
          <h3 className="profile360-section__title">{section.title}</h3>
          <p className="profile360-section__desc">{section.description}</p>
          <p className="profile360-section__progress">
            {toPersianDigits(section.filledCount)} از{" "}
            {toPersianDigits(section.totalCount)} ·{" "}
            {toPersianDigits(section.percent)}٪
          </p>
        </div>
        {!editing ? (
          <button
            type="button"
            className="profile360-btn profile360-btn--ghost"
            onClick={() => setEditing(true)}
          >
            ویرایش
          </button>
        ) : null}
      </div>

      {!editing ? (
        <dl className="profile360-readout">
          {section.fields.map((field) => {
            const value = tagsToString(section.values[field.id]);
            return (
              <div key={field.id}>
                <dt>{field.label}</dt>
                <dd>{value || "—"}</dd>
              </div>
            );
          })}
        </dl>
      ) : (
        <div className="profile360-form">
          {section.fields.map((field) => (
            <label key={field.id} className="profile360-field">
              <span>
                {field.label}
                {field.required ? " *" : ""}
              </span>
              {field.type === "textarea" || field.type === "tags" ? (
                <textarea
                  value={draft[field.id] ?? ""}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, [field.id]: e.target.value }))
                  }
                  rows={field.type === "tags" ? 2 : 3}
                  placeholder={
                    field.type === "tags"
                      ? "با ویرگول جدا کن"
                      : field.placeholder
                  }
                />
              ) : field.type === "select" && field.options ? (
                <select
                  value={draft[field.id] ?? ""}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, [field.id]: e.target.value }))
                  }
                >
                  <option value="">انتخاب کنید</option>
                  {field.options.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={
                    field.type === "tel"
                      ? "tel"
                      : field.type === "date"
                        ? "date"
                        : "text"
                  }
                  value={draft[field.id] ?? ""}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, [field.id]: e.target.value }))
                  }
                  placeholder={field.placeholder}
                />
              )}
            </label>
          ))}
          {error ? (
            <p className="profile360-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="profile360-form__actions">
            <button
              type="button"
              className="profile360-btn profile360-btn--primary"
              disabled={pending}
              onClick={save}
            >
              {pending ? "در حال ذخیره..." : "ذخیره"}
            </button>
            <button
              type="button"
              className="profile360-btn profile360-btn--ghost"
              disabled={pending}
              onClick={cancel}
            >
              انصراف
            </button>
          </div>
          <p className="profile360-autosave">معماری ذخیره خودکار فعال است — ذخیره بخش را بزن.</p>
        </div>
      )}
    </article>
  );
}

/**
 * Student 360° Profile — digital identity experience (not CRUD dump).
 */
export function Student360ProfileScreen({ model }: Student360ProfileScreenProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    router.refresh();
  }

  return (
    <div
      className="profile360"
      data-health={model.health}
      data-portal-accent="teal"
    >
      <header className="profile360-hero">
        <div className="profile360-hero__glow" aria-hidden="true" />
        <div className="profile360-hero__layout">
          <div>
            <p className="profile360-hero__eyebrow">{model.hero.eyebrow}</p>
            <p className="profile360-hero__chip">{model.hero.statusLabel}</p>
            <h1 className="profile360-hero__headline">{model.hero.headline}</h1>
            <p className="profile360-hero__support">{model.hero.support}</p>
            <div className="profile360-health" data-health={model.health}>
              <span>سلامت پرونده</span>
              <strong>{model.healthLabel}</strong>
            </div>
          </div>
          <InterestProgressRing
            percent={model.completionPercent}
            label="تکمیل پروفایل"
            size={156}
          />
        </div>
        <div className="profile360-hero__actions">
          <a href={model.returnHref} className="profile360-btn profile360-btn--ghost">
            بازگشت به مسیر
          </a>
          {model.session.status !== "completed" ? (
            <button
              type="button"
              className="profile360-btn profile360-btn--primary"
              disabled={pending || model.completionPercent < 60}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const result = await markProfile360CompleteAction();
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  router.refresh();
                });
              }}
            >
              ثبت آمادگی پرونده
            </button>
          ) : null}
        </div>
        {error ? (
          <p className="profile360-error" role="alert">
            {error}
          </p>
        ) : null}
      </header>

      {/* Widgets */}
      <div className="profile360-widgets">
        <section className="profile360-widget" aria-labelledby="w-completion">
          <h2 id="w-completion">{model.widgets.completion.title}</h2>
          <p>{model.widgets.completion.completionLabel}</p>
          <p className="profile360-widget__muted">
            {model.widgets.completion.description}
          </p>
        </section>

        <section className="profile360-widget" aria-labelledby="w-missing">
          <h2 id="w-missing">{model.widgets.missing.title}</h2>
          {model.widgets.missing.items.length === 0 ? (
            <div className="profile360-empty">
              <strong>{model.widgets.missing.emptyTitle}</strong>
              <span>{model.widgets.missing.emptyDescription}</span>
            </div>
          ) : (
            <ul className="profile360-widget__list">
              {model.widgets.missing.items.map((item) => (
                <li key={item.id}>
                  <a href={item.href}>{item.title}</a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="profile360-widget" aria-labelledby="w-actions">
          <h2 id="w-actions">{model.widgets.recommendedActions.title}</h2>
          <ul className="profile360-widget__list">
            {model.widgets.recommendedActions.items.map((item) => (
              <li key={item.id}>
                <a href={item.href}>{item.title}</a>
              </li>
            ))}
          </ul>
        </section>

        <section className="profile360-widget" aria-labelledby="w-recent">
          <h2 id="w-recent">{model.widgets.recentChanges.title}</h2>
          {model.widgets.recentChanges.items.length === 0 ? (
            <div className="profile360-empty">
              <strong>{model.widgets.recentChanges.emptyTitle}</strong>
              <span>{model.widgets.recentChanges.emptyDescription}</span>
            </div>
          ) : (
            <ul className="profile360-widget__list">
              {model.widgets.recentChanges.items.slice(0, 5).map((item) => (
                <li key={item.id}>
                  {item.summary}
                  <span className="profile360-widget__muted">
                    {" "}
                    · {formatJalaliDateShort(new Date(item.atIso))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          className="profile360-widget profile360-widget--wide"
          aria-labelledby="w-quick"
        >
          <h2 id="w-quick">{model.widgets.quickEdit.title}</h2>
          <div className="profile360-quick">
            {model.widgets.quickEdit.sections.map((s) => (
              <a key={s.id} href={s.href} className="profile360-quick__item">
                <PortalIcon name={s.icon} className="size-4" />
                {s.title}
              </a>
            ))}
          </div>
        </section>
      </div>

      {/* Sections */}
      <div className="profile360-sections">
        {model.sections.map((section) => (
          <SectionEditor key={section.id} section={section} onSaved={refresh} />
        ))}
      </div>

      <section className="profile360-ai" aria-labelledby="profile-ai">
        <h2 id="profile-ai">نقاط درج آینده</h2>
        <p>
          مشاور شغلی، تطبیق دانشگاه، بورسیه، بینش مشاور و ریسک تحصیلی — بدون
          پیاده‌سازی هوش مصنوعی در این فاز.
        </p>
        <ul className="profile360-ai__slots">
          {model.futureAiSlots.map((slot) => (
            <li key={slot}>{slot}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
