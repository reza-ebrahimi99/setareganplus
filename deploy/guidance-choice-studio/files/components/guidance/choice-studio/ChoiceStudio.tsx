"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  addChoiceItemAction,
  importChoiceExcelAction,
  markArrangementReadyAction,
  moveChoiceItemAction,
  parseChoiceExcelAction,
  removeChoiceItemAction,
  startArrangementAction,
  updateChoiceItemAction,
  type CounselorLateState,
} from "@/app/admin/counselor/late-actions";
import { ChoiceConfirmDialog } from "@/components/guidance/choice-studio/ChoiceConfirmDialog";
import { ChoiceDiffPanel } from "@/components/guidance/choice-studio/ChoiceDiffPanel";
import { ChoiceExcelDropzone } from "@/components/guidance/choice-studio/ChoiceExcelDropzone";
import { ChoiceFeedbackSummary } from "@/components/guidance/choice-studio/ChoiceFeedbackSummary";
import { ChoiceImportPreview } from "@/components/guidance/choice-studio/ChoiceImportPreview";
import { ChoicePdfHelp } from "@/components/guidance/choice-studio/ChoicePdfHelp";
import { ChoiceSanjeshMode } from "@/components/guidance/choice-studio/ChoiceSanjeshMode";
import { ChoiceStatusBadge } from "@/components/guidance/choice-studio/ChoiceStatusBadge";
import {
  CHOICE_STUDIO_BRAND,
  CHOICE_STUDIO_TITLE,
  INITIAL_NONFINAL_DISCLAIMER,
  type ChoiceImportPreview as Preview,
} from "@/lib/guidance/choice-studio/types";
import { CHOICE_CHANCE_CANONICAL } from "@/lib/guidance/journey-v2/constants";
import { GUIDANCE_EDUCATION_TYPES } from "@/lib/guidance/journey/reference-data/education-types";
import { labelChoiceBand, labelChoiceFeedback } from "@/lib/guidance/journey-v2/labels";
import type { ChoiceListView } from "@/lib/guidance/journey-v2/choices";
import type { SanjeshCaseView } from "@/lib/guidance/journey-v2/sanjesh";
import { toPersianDigits } from "@/lib/persian";

const empty: CounselorLateState = {};

type Phase = "initial" | "final" | "review" | "sanjesh";
type FinalTab = "revised" | "diff" | "feedback" | "session";

export function ChoiceStudio(props: {
  studentId: string;
  studentName: string;
  phase: Phase;
  list: ChoiceListView | null;
  initialList?: ChoiceListView | null;
  intelligence: Array<{ label: string; value: string }>;
  reviewStats?: {
    total: number;
    reviewed: number;
    approved: number;
    needsReview: number;
    requestedRemoval: number;
    proposedMoves?: number;
    remaining: number;
  } | null;
  sessionNote?: string | null;
  sanjesh?: SanjeshCaseView | null;
  readyAtLabel?: string | null;
}) {
  const [parseState, parseAction, parsePending] = useActionState(parseChoiceExcelAction, empty);
  const [importState, importAction, importPending] = useActionState(importChoiceExcelAction, empty);
  const [readyState, readyAction, readyPending] = useActionState(markArrangementReadyAction, empty);
  const [addState, addAction, addPending] = useActionState(addChoiceItemAction, empty);
  const [startState, startAction, startPending] = useActionState(startArrangementAction, empty);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [showHelp, setShowHelp] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [fileMeta, setFileMeta] = useState<{ name: string; size: number } | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [confirm, setConfirm] = useState<"import" | "publish" | null>(null);
  const [finalTab, setFinalTab] = useState<FinalTab>("revised");

  useEffect(() => {
    if (parseState.preview) setPreview(parseState.preview);
  }, [parseState.preview]);

  const list = props.list;
  const items = useMemo(() => {
    const rows = (list?.items ?? []).filter((i) => i.isActive);
    const q = query.trim();
    const searched = q
      ? rows.filter((i) =>
          [i.major, i.university, i.city, i.officialCode ?? "", i.educationTypeLabel].some((v) =>
            v.includes(q),
          ),
        )
      : rows;
    if (filter === "warn") {
      return searched.filter((i) => !i.officialCode || !i.educationType);
    }
    if (filter === "review") {
      return searched.filter((i) => i.feedback?.verdict && i.feedback.verdict !== "approved");
    }
    return searched;
  }, [list, query, filter]);

  const locked = list?.status === "READY" && props.phase === "initial";
  const confirmed = list?.status === "CONFIRMED";
  const replaceReady = list?.status === "READY";
  const kind = props.phase === "final" ? "FINAL" : "INITIAL";

  function submitFile(file: File) {
    setFileMeta({ name: file.name, size: file.size });
    setPreview(null);
    const data = new FormData();
    data.set("studentId", props.studentId);
    data.set("file", file);
    parseAction(data);
  }

  function commitImport() {
    if (!preview) return;
    const data = new FormData();
    data.set("studentId", props.studentId);
    data.set("kind", kind);
    data.set("rows", JSON.stringify(preview.rows));
    if (replaceReady) data.set("replaceReady", "1");
    importAction(data);
    setConfirm(null);
  }

  if (props.phase === "sanjesh") {
    return (
      <div className="gcs">
        <StudioHeader
          studentName={props.studentName}
          list={list}
          phase={props.phase}
          readyAtLabel={props.readyAtLabel}
        />
        <ChoiceSanjeshMode studentId={props.studentId} list={list} sanjesh={props.sanjesh ?? null} />
      </div>
    );
  }

  return (
    <div className="gcs">
      <StudioHeader
        studentName={props.studentName}
        list={list}
        phase={props.phase}
        readyAtLabel={props.readyAtLabel}
      />

      {props.phase === "initial" && (list?.status === "READY" || list?.status === "DRAFT") ? (
        <p className="gcs-disclaimer">{INITIAL_NONFINAL_DISCLAIMER}</p>
      ) : null}

      <div className="gcs-layout">
        <aside className="gcs-intel">
          <h2>هوش پرونده</h2>
          <dl>
            {props.intelligence.map((row) => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value || "—"}</dd>
              </div>
            ))}
          </dl>
        </aside>

        <div className="gcs-main">
          {parseState.error || importState.error || readyState.error || addState.error ? (
            <p className="gcs-banner gcs-banner--error">
              {parseState.error || importState.error || readyState.error || addState.error}
            </p>
          ) : null}
          {importState.success || readyState.success || addState.success ? (
            <p className="gcs-banner gcs-banner--ok">
              {importState.success || readyState.success || addState.success}
            </p>
          ) : null}

          {props.phase === "review" ? (
            <ChoiceFeedbackSummary list={list} stats={props.reviewStats ?? null} />
          ) : null}

          {props.phase === "final" ? (
            <nav className="gcs-tabs" aria-label="بخش‌های اصلاح نهایی">
              {(
                [
                  ["revised", "نسخه اصلاح‌شده"],
                  ["diff", "تغییرات نسبت به نسخه اولیه"],
                  ["feedback", "بازخورد دانش‌آموز"],
                  ["session", "یادداشت جلسه دوم"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={finalTab === id ? "is-active" : ""}
                  onClick={() => setFinalTab(id)}
                >
                  {label}
                </button>
              ))}
            </nav>
          ) : null}

          {props.phase === "final" && finalTab === "diff" ? (
            <ChoiceDiffPanel
              initial={props.initialList?.items ?? []}
              final={list?.items ?? []}
            />
          ) : null}
          {props.phase === "final" && finalTab === "feedback" ? (
            <ChoiceFeedbackSummary
              list={props.initialList ?? list}
              stats={props.reviewStats ?? null}
            />
          ) : null}
          {props.phase === "final" && finalTab === "session" ? (
            <section className="gcs-panel">
              <h3>یادداشت جلسه دوم</h3>
              <p>{props.sessionNote || "یادداشت جداگانه‌ای برای جلسه دوم ثبت نشده است."}</p>
            </section>
          ) : null}

          {props.phase === "review" || (props.phase === "final" && finalTab !== "revised") ? null : (
            <>
              {!list ? (
                <section className="gcs-empty">
                  <p>هنوز چیدمانی برای این دانش‌آموز ایجاد نشده است.</p>
                  <form action={startAction}>
                    <input type="hidden" name="studentId" value={props.studentId} />
                    <input type="hidden" name="kind" value={kind} />
                    <button type="submit" className="gcs-btn gcs-btn--ghost" disabled={startPending}>
                      {startPending ? "…" : "آماده‌سازی فضای خالی"}
                    </button>
                    {startState.error ? <p className="gcs-banner gcs-banner--error">{startState.error}</p> : null}
                  </form>
                </section>
              ) : null}

              {!locked && !confirmed ? (
                <section className="gcs-excel">
                  <div className="gcs-excel__actions">
                    <a
                      className="gcs-btn gcs-btn--gold"
                      href="/admin/counselor/choices/template.xlsx"
                    >
                      دانلود قالب اکسل
                    </a>
                    {list && list.items.some((i) => i.isActive) ? (
                      <a
                        className="gcs-btn gcs-btn--ghost"
                        href={`/admin/counselor/students/${props.studentId}/choices/export.xlsx?kind=${kind === "FINAL" ? "FINAL" : "INITIAL"}`}
                      >
                        {kind === "FINAL" ? "دانلود نسخه فعلی Excel" : "دانلود نسخه اولیه Excel"}
                      </a>
                    ) : props.phase === "final" && props.initialList ? (
                      <a
                        className="gcs-btn gcs-btn--ghost"
                        href={`/admin/counselor/students/${props.studentId}/choices/export.xlsx?kind=INITIAL`}
                      >
                        دانلود نسخه اولیه Excel
                      </a>
                    ) : null}
                    <button type="button" className="gcs-btn gcs-btn--ghost" onClick={() => setShowHelp((v) => !v)}>
                      راهنمای تبدیل PDF به Excel
                    </button>
                    <button type="button" className="gcs-btn gcs-btn--ghost" onClick={() => setShowManual((v) => !v)}>
                      افزودن دستی انتخاب
                    </button>
                  </div>
                  <ChoiceExcelDropzone
                    pending={parsePending}
                    fileName={fileMeta?.name}
                    fileSize={fileMeta?.size}
                    onFile={submitFile}
                    onClear={() => {
                      setFileMeta(null);
                      setPreview(null);
                    }}
                  />
                  {showHelp ? <ChoicePdfHelp /> : null}
                  {preview ? (
                    <ChoiceImportPreview
                      preview={preview}
                      pending={importPending}
                      replaceReady={Boolean(replaceReady)}
                      onCommit={() => setConfirm("import")}
                    />
                  ) : null}
                </section>
              ) : null}

              {list ? (
                <section className="gcs-editor">
                  <header className="gcs-editor__bar">
                    <label>
                      جستجو
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="کد، رشته یا دانشگاه"
                      />
                    </label>
                    <label>
                      فیلتر
                      <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                        <option value="all">همه</option>
                        <option value="warn">نیازمند تکمیل</option>
                        <option value="review">بازخورد نیازمند توجه</option>
                      </select>
                    </label>
                    <strong>{toPersianDigits(items.length)} انتخاب</strong>
                  </header>

                  {showManual && !locked && !confirmed ? (
                    <form action={addAction} className="gcs-manual">
                      <input type="hidden" name="studentId" value={props.studentId} />
                      <input type="hidden" name="listId" value={list.id} />
                      <input name="officialCode" placeholder="کد رشته" required />
                      <input name="major" placeholder="رشته" required />
                      <input name="university" placeholder="دانشگاه" required />
                      <input name="city" placeholder="شهر" />
                      <select name="educationType" required>
                        <option value="">دوره</option>
                        {GUIDANCE_EDUCATION_TYPES.map((t) => (
                          <option key={t.code} value={t.code}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                      <select name="band">
                        <option value="">شانس قبولی</option>
                        {CHOICE_CHANCE_CANONICAL.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.label}
                          </option>
                        ))}
                      </select>
                      <input name="notes" placeholder="توضیحات" />
                      <input name="rationale" placeholder="یادداشت مشاور" />
                      <button type="submit" className="gcs-btn gcs-btn--primary" disabled={addPending}>
                        {addPending ? "…" : "افزودن"}
                      </button>
                    </form>
                  ) : null}

                  <div className="gcs-table-wrap">
                    <table className="gcs-table">
                      <thead>
                        <tr>
                          <th>اولویت</th>
                          <th>کد</th>
                          <th>رشته</th>
                          <th>دانشگاه</th>
                          <th>شهر</th>
                          <th>دوره</th>
                          <th>شانس</th>
                          <th>بازخورد</th>
                          <th>عملیات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => (
                          <tr key={item.id}>
                            <td>{toPersianDigits(item.sortOrder)}</td>
                            <td className="gcs-code">{item.officialCode || "—"}</td>
                            <td>{item.major}</td>
                            <td>{item.university}</td>
                            <td>{item.city || "—"}</td>
                            <td>{item.educationTypeLabel}</td>
                            <td>{labelChoiceBand(item.band)}</td>
                            <td>
                              {item.feedback?.verdict
                                ? labelChoiceFeedback(item.feedback.verdict)
                                : "—"}
                            </td>
                            <td>
                              {locked || confirmed ? null : (
                                <div className="gcs-row-ops">
                                  <Tiny
                                    studentId={props.studentId}
                                    listId={list.id}
                                    itemId={item.id}
                                    action={moveChoiceItemAction}
                                    extra={{ direction: "up" }}
                                    label="بالا"
                                  />
                                  <Tiny
                                    studentId={props.studentId}
                                    listId={list.id}
                                    itemId={item.id}
                                    action={moveChoiceItemAction}
                                    extra={{ direction: "down" }}
                                    label="پایین"
                                  />
                                  <Tiny
                                    studentId={props.studentId}
                                    listId={list.id}
                                    itemId={item.id}
                                    action={removeChoiceItemAction}
                                    label="حذف"
                                  />
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <ol className="gcs-cards">
                      {items.map((item) => (
                        <li key={`c-${item.id}`}>
                          <em>{toPersianDigits(item.sortOrder)}</em>
                          <strong>{item.officialCode || "بدون کد"}</strong>
                          <span>
                            {item.major} · {item.university}
                          </span>
                          <small>
                            {[item.city, item.educationTypeLabel, labelChoiceBand(item.band)]
                              .filter((v) => v && v !== "—")
                              .join(" · ")}
                          </small>
                          {locked || confirmed ? null : (
                            <div className="gcs-row-ops">
                              <Tiny
                                studentId={props.studentId}
                                listId={list.id}
                                itemId={item.id}
                                action={moveChoiceItemAction}
                                extra={{ direction: "up" }}
                                label="بالا"
                              />
                              <Tiny
                                studentId={props.studentId}
                                listId={list.id}
                                itemId={item.id}
                                action={moveChoiceItemAction}
                                extra={{ direction: "down" }}
                                label="پایین"
                              />
                            </div>
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>

                  {!locked && !confirmed && items[0] ? (
                    <details className="gcs-edit">
                      <summary>ویرایش انتخاب</summary>
                      <InlineEdit studentId={props.studentId} listId={list.id} items={items} />
                    </details>
                  ) : null}

                  {!confirmed && list ? (
                    <form
                      className="gcs-publish"
                      onSubmit={(e) => {
                        e.preventDefault();
                        setConfirm("publish");
                      }}
                    >
                      <input type="hidden" name="studentId" value={props.studentId} />
                      <input type="hidden" name="listId" value={list.id} />
                      <input type="hidden" name="phase" value={props.phase === "final" ? "final" : "initial"} />
                      <button type="submit" className="gcs-btn gcs-btn--primary" disabled={readyPending || locked}>
                        {props.phase === "final"
                          ? "ارسال نسخه نهایی برای تأیید دانش‌آموز"
                          : "انتشار نسخه اولیه برای بررسی دانش‌آموز"}
                      </button>
                    </form>
                  ) : null}
                </section>
              ) : null}
            </>
          )}
        </div>
      </div>

      <ChoiceConfirmDialog
        open={confirm === "import"}
        title={replaceReady ? "ساخت نسخه جدید" : "ذخیره پیش‌نویس"}
        body={
          replaceReady
            ? "نسخه منتشرشده حفظ می‌شود و یک پیش‌نویس جدید از فایل اکسل ساخته می‌شود."
            : "پیش‌نویس فعلی با ردیف‌های پیش‌نمایش جایگزین می‌شود."
        }
        confirmLabel="تأیید ورود"
        pending={importPending}
        onCancel={() => setConfirm(null)}
        onConfirm={commitImport}
      />
      <ChoiceConfirmDialog
        open={confirm === "publish"}
        title={props.phase === "final" ? "انتشار نسخه نهایی" : "انتشار نسخه اولیه"}
        body={
          props.phase === "final"
            ? "پس از انتشار، دانش‌آموز می‌تواند نسخه نهایی را آگاهانه تأیید کند. این کار ثبت خودکار در سنجش نیست."
            : "دانش‌آموز نسخه اولیه غیرنهایی را برای اعلام نظر می‌بیند. این نسخه در سنجش ثبت نمی‌شود."
        }
        confirmLabel="انتشار"
        pending={readyPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (!list) return;
          const data = new FormData();
          data.set("studentId", props.studentId);
          data.set("listId", list.id);
          data.set("phase", props.phase === "final" ? "final" : "initial");
          readyAction(data);
          setConfirm(null);
        }}
      />
    </div>
  );
}

function StudioHeader(props: {
  studentName: string;
  list: ChoiceListView | null;
  phase: Phase;
  readyAtLabel?: string | null;
}) {
  const subtitle =
    props.phase === "final"
      ? "استودیوی اصلاح نهایی"
      : props.phase === "review"
        ? "خلاصه بازخورد دانش‌آموز"
        : props.phase === "sanjesh"
          ? "حالت ثبت سنجش"
          : CHOICE_STUDIO_TITLE;
  return (
    <header className="gcs-hero">
      <p>{CHOICE_STUDIO_BRAND}</p>
      <h1>{subtitle}</h1>
      <div>
        <strong>{props.studentName}</strong>
        <ChoiceStatusBadge
          kind={props.list?.kind}
          status={props.list?.status}
          hasItems={Boolean(props.list?.items.some((i) => i.isActive))}
        />
        {props.list ? (
          <span>
            نسخه {toPersianDigits(props.list.version)}
            {props.readyAtLabel ? ` · آخرین ویرایش: ${props.readyAtLabel}` : ""}
          </span>
        ) : null}
      </div>
    </header>
  );
}

function Tiny(props: {
  studentId: string;
  listId: string;
  itemId: string;
  action: (prev: CounselorLateState, formData: FormData) => Promise<CounselorLateState>;
  extra?: Record<string, string>;
  label: string;
}) {
  const [, action, pending] = useActionState(props.action, empty);
  return (
    <form action={action}>
      <input type="hidden" name="studentId" value={props.studentId} />
      <input type="hidden" name="listId" value={props.listId} />
      <input type="hidden" name="itemId" value={props.itemId} />
      {Object.entries(props.extra ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button type="submit" className="gcs-btn gcs-btn--ghost" disabled={pending}>
        {props.label}
      </button>
    </form>
  );
}

function InlineEdit(props: {
  studentId: string;
  listId: string;
  items: ChoiceListView["items"];
}) {
  const [state, action, pending] = useActionState(updateChoiceItemAction, empty);
  const [itemId, setItemId] = useState(props.items[0]!.id);
  const item = props.items.find((i) => i.id === itemId) ?? props.items[0]!;
  return (
    <form action={action} className="gcs-manual" key={item.id}>
      <input type="hidden" name="studentId" value={props.studentId} />
      <input type="hidden" name="listId" value={props.listId} />
      <input type="hidden" name="itemId" value={item.id} />
      <select value={itemId} onChange={(e) => setItemId(e.target.value)}>
        {props.items.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.sortOrder}. {opt.officialCode || opt.major}
          </option>
        ))}
      </select>
      <input name="officialCode" defaultValue={item.officialCode ?? ""} required />
      <input name="major" defaultValue={item.major} required />
      <input name="university" defaultValue={item.university} required />
      <input name="city" defaultValue={item.city} />
      <select name="educationType" defaultValue={item.educationType}>
        {GUIDANCE_EDUCATION_TYPES.map((t) => (
          <option key={t.code} value={t.code}>
            {t.label}
          </option>
        ))}
        {item.educationType &&
        !GUIDANCE_EDUCATION_TYPES.some((t) => t.code === item.educationType) ? (
          <option value={item.educationType}>{item.educationType}</option>
        ) : null}
      </select>
      <select name="band" defaultValue={item.band ?? ""}>
        <option value="">شانس قبولی</option>
        {CHOICE_CHANCE_CANONICAL.map((b) => (
          <option key={b.id} value={b.id}>
            {b.label}
          </option>
        ))}
      </select>
      <input name="notes" defaultValue={item.notes} />
      <input name="rationale" defaultValue={item.rationale} />
      <button type="submit" className="gcs-btn gcs-btn--primary" disabled={pending}>
        ذخیره ویرایش
      </button>
      {state.error ? <span className="gcs-banner gcs-banner--error">{state.error}</span> : null}
    </form>
  );
}
