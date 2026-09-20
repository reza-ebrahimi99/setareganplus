"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addChoiceItemAction,
  markArrangementReadyAction,
  moveChoiceItemAction,
  parseChoiceExcelAction,
  removeChoiceItemAction,
  restoreChoiceItemAction,
  startArrangementAction,
  startFinalRevisionAction,
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
import {
  CHOICE_DRAFT_ACTIVE_LIMIT,
  sortPreviewRowsByPriority,
  takeFirstRowsForDraft,
} from "@/lib/guidance/choice-studio/preview-limits";
import {
  choiceManualInputHasContent,
  type ChoiceManualInputFields,
} from "@/lib/guidance/choice-studio/manual-input";
import { toPersianDigits } from "@/lib/persian";
import {
  CHOICE_DRAFT_IMPORT_TIMEOUT_MS,
  postChoiceDraftImport,
} from "@/lib/guidance/choice-studio/import-api";
import { MUTATION_ORIGIN_FORBIDDEN_MESSAGE_FA } from "@/lib/http/trusted-mutation-origin";

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
  const router = useRouter();
  const [parseState, parseAction, parsePending] = useActionState(parseChoiceExcelAction, empty);
  const [importPending, setImportPending] = useState(false);
  const [importDialogError, setImportDialogError] = useState<string | null>(null);
  const [draftCountOverride, setDraftCountOverride] = useState<number | null>(null);
  const importAbortRef = useRef<AbortController | null>(null);
  const [readyState, readyAction, readyPending] = useActionState(markArrangementReadyAction, empty);
  const [addState, addAction, addPending] = useActionState(addChoiceItemAction, empty);
  const [startState, startAction, startPending] = useActionState(startArrangementAction, empty);
  const [reviseState, reviseAction, revisePending] = useActionState(startFinalRevisionAction, empty);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [showHelp, setShowHelp] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [fileMeta, setFileMeta] = useState<{ name: string; size: number } | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [confirm, setConfirm] = useState<"import" | "publish" | "import-truncate" | null>(null);
  const [finalTab, setFinalTab] = useState<FinalTab>("revised");
  const [importTimedOut, setImportTimedOut] = useState(false);
  const importStartedAt = useRef<number | null>(null);

  useEffect(() => {
    if (parseState.preview) setPreview(parseState.preview);
  }, [parseState.preview]);

  useEffect(() => {
    if (!readyState.success) return;
    setConfirm(null);
    router.refresh();
    if (props.phase === "initial") {
      router.replace(`/admin/counselor/students/${props.studentId}/choices?phase=review`);
    }
  }, [readyState.success, props.phase, props.studentId, router]);

  useEffect(() => {
    setDraftCountOverride(null);
  }, [props.list?.id, props.list?.version]);

  useEffect(() => {
    if (!reviseState.success) return;
    router.refresh();
  }, [reviseState.success, router]);

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

  const removedItems = useMemo(
    () => (list?.items ?? []).filter((i) => !i.isActive),
    [list],
  );

  const locked = list?.status === "READY";
  const confirmed = list?.status === "CONFIRMED";
  const replaceReady = list?.status === "READY";
  const kind = props.phase === "final" ? "FINAL" : "INITIAL";
  const draftActiveCount = useMemo(() => {
    if (draftCountOverride != null) return draftCountOverride;
    return (list?.items ?? []).filter((i) => i.isActive).length;
  }, [list, draftCountOverride]);

  function submitFile(file: File) {
    setFileMeta({ name: file.name, size: file.size });
    setPreview(null);
    const data = new FormData();
    data.set("studentId", props.studentId);
    data.set("file", file);
    parseAction(data);
  }

  async function commitImport(options?: { truncateFirst150?: boolean }) {
    if (!preview) return;
    if (importPending) return;
    if (!options?.truncateFirst150 && !preview.canCommit) return;

    importAbortRef.current?.abort();
    const controller = new AbortController();
    importAbortRef.current = controller;
    const timeoutId = window.setTimeout(() => controller.abort(), CHOICE_DRAFT_IMPORT_TIMEOUT_MS);

    const requestId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    setImportDialogError(null);
    setImportTimedOut(false);
    setImportPending(true);
    importStartedAt.current = Date.now();

    try {
      const { response, data } = await postChoiceDraftImport({
        studentId: props.studentId,
        payload: {
          requestId,
          kind,
          mode: options?.truncateFirst150 ? "truncate_first_150" : "full",
          truncateAck: Boolean(options?.truncateFirst150),
          replaceReady: Boolean(replaceReady),
          rows: preview.rows,
        },
        signal: controller.signal,
      });

      if (controller.signal.aborted) {
        setImportDialogError(
          "درخواست به پایان زمان رسید یا لغو شد. دوباره تلاش کنید؛ در صورت موفقیت قبلی، Refresh کنید.",
        );
        setImportTimedOut(true);
        return;
      }

      if (!data || !data.ok) {
        const apiError =
          data && "error" in data && typeof data.error === "string" ? data.error : null;
        const apiCode =
          data && "code" in data && typeof (data as { code?: string }).code === "string"
            ? (data as { code: string }).code
            : null;
        const fallback =
          response.status === 401
            ? "نشست کاربری منقضی شده است. دوباره وارد شوید."
            : response.status === 403
              ? apiCode === "FORBIDDEN_ORIGIN" || apiError === "FORBIDDEN_ORIGIN"
                ? MUTATION_ORIGIN_FORBIDDEN_MESSAGE_FA
                : apiError ?? "مجوز انجام این عملیات را ندارید."
              : "ورود پیش‌نویس انجام نشد.";
        setImportDialogError(
          apiCode === "FORBIDDEN_ORIGIN" || apiError === "FORBIDDEN_ORIGIN"
            ? MUTATION_ORIGIN_FORBIDDEN_MESSAGE_FA
            : apiError ?? fallback,
        );
        return;
      }

      setDraftCountOverride(data.draftCount);
      setConfirm(null);
      setPreview(null);
      setFileMeta(null);
      setImportDialogError(null);
      setImportTimedOut(false);
      importStartedAt.current = null;
      router.refresh();
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setImportDialogError(
          "درخواست به پایان زمان رسید یا لغو شد. دوباره تلاش کنید؛ در صورت موفقیت قبلی، Refresh کنید.",
        );
        setImportTimedOut(true);
        return;
      }
      setImportDialogError("خطای شبکه. اتصال را بررسی کنید و دوباره تلاش کنید.");
    } finally {
      window.clearTimeout(timeoutId);
      if (importAbortRef.current === controller) {
        importAbortRef.current = null;
      }
      setImportPending(false);
    }
  }

  const truncateExtraPreview = useMemo(() => {
    if (!preview?.exceedsSanjeshLimit) return null;
    const ordered = sortPreviewRowsByPriority(preview.rows);
    const extras = ordered.slice(CHOICE_DRAFT_ACTIVE_LIMIT);
    const first = takeFirstRowsForDraft(preview.rows);
    return { extras, firstCount: first.length, total: preview.totalRows };
  }, [preview]);

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
          {parseState.error || readyState.error || addState.error || reviseState.error ? (
            <p className="gcs-banner gcs-banner--error">
              {parseState.error || readyState.error || addState.error || reviseState.error}
            </p>
          ) : null}
          {readyState.success || addState.success || reviseState.success ? (
            <p className="gcs-banner gcs-banner--ok">
              {readyState.success || addState.success || reviseState.success}
            </p>
          ) : null}

          {props.phase === "review" ? (
            <>
              <ChoiceFeedbackSummary list={list} stats={props.reviewStats ?? null} />
              <section className="gcs-panel gcs-revision-cta">
                <h3>اعمال اصلاحات پس از بازخورد</h3>
                <p>
                  نسخه منتشرشده اولیه به‌عنوان سابقه حفظ می‌شود. اصلاح ترتیب، حذف،
                  بازیابی و افزودن انتخاب روی پیش‌نویس نسخه اصلاح‌شده انجام می‌شود.
                </p>
                <a
                  className="gcs-btn gcs-btn--primary"
                  href={`/admin/counselor/students/${props.studentId}/choices?phase=final`}
                >
                  اعمال اصلاحات
                </a>
              </section>
            </>
          ) : null}

          {props.phase === "final" && locked && !confirmed && list ? (
            <section className="gcs-panel gcs-revision-cta">
              <h3>نسخه منتشرشده قفل است</h3>
              <p>
                این نسخه برای تأیید دانش‌آموز ارسال شده و به‌عنوان سابقه حفظ می‌شود.
                برای اصلاح، یک پیش‌نویس جدید از روی همین نسخه ساخته می‌شود.
              </p>
              <form action={reviseAction}>
                <input type="hidden" name="studentId" value={props.studentId} />
                <button type="submit" className="gcs-btn gcs-btn--primary" disabled={revisePending}>
                  {revisePending ? "در حال آماده‌سازی…" : "اعمال اصلاحات"}
                </button>
              </form>
            </section>
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
                      draftActiveCount={draftActiveCount}
                      pending={importPending}
                      importTimedOut={importTimedOut}
                      replaceReady={Boolean(replaceReady)}
                      onCommit={() => {
                        if (!preview.canCommit || importPending) return;
                        setConfirm("import");
                      }}
                      onCommitFirst150={() => {
                        if (importPending || !preview.exceedsSanjeshLimit) return;
                        setConfirm("import-truncate");
                      }}
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
                    <strong>
                      {toPersianDigits(draftActiveCount)} انتخاب در پیش‌نویس
                      {items.length !== draftActiveCount
                        ? ` (نمایش ${toPersianDigits(items.length)})`
                        : ""}
                    </strong>
                  </header>

                  {showManual && !locked && !confirmed ? (
                    <ManualAddForm
                      studentId={props.studentId}
                      listId={list.id}
                      action={addAction}
                      pending={addPending}
                    />
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
                                : item.sourceItemId
                                  ? "—"
                                  : "انتخاب جدید"}
                              {item.feedback?.note ? (
                                <small className="gcs-muted"> {item.feedback.note}</small>
                              ) : null}
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
                          {item.feedback?.verdict ? (
                            <small>
                              بازخورد: {labelChoiceFeedback(item.feedback.verdict)}
                              {item.feedback.note ? ` — ${item.feedback.note}` : ""}
                            </small>
                          ) : null}
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

                  {!locked && !confirmed && list && removedItems.length > 0 ? (
                    <section className="gcs-restore">
                      <h4>انتخاب‌های حذف‌شده (قابل بازیابی)</h4>
                      <ul>
                        {removedItems.map((item) => (
                          <li key={`rm-${item.id}`}>
                            <span>
                              {item.officialCode || item.major} · {item.university}
                            </span>
                            <Tiny
                              studentId={props.studentId}
                              listId={list.id}
                              itemId={item.id}
                              action={restoreChoiceItemAction}
                              label="بازیابی"
                            />
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}

                  {!confirmed && !locked && list ? (
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
                      <p className="gcs-muted">
                        جابه‌جایی، حذف، بازیابی و ویرایش هر ردیف بلافاصله به‌عنوان پیش‌نویس ذخیره می‌شود.
                      </p>
                      <button
                        type="submit"
                        className="gcs-btn gcs-btn--primary"
                        disabled={readyPending || locked}
                      >
                        {readyPending
                          ? "در حال انتشار…"
                          : props.phase === "final"
                            ? "انتشار نسخه اصلاح‌شده"
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
        error={confirm === "import" ? importDialogError : null}
        onCancel={() => {
          if (importPending) return;
          setImportDialogError(null);
          setConfirm(null);
        }}
        onConfirm={() => void commitImport()}
      />
      <ChoiceConfirmDialog
        open={confirm === "import-truncate"}
        title="انتقال ۱۵۰ انتخاب اول"
        body={
          truncateExtraPreview
            ? `از ${toPersianDigits(String(truncateExtraPreview.total))} انتخاب پیش‌نمایش، فقط ${toPersianDigits(String(truncateExtraPreview.firstCount))} انتخاب اول (بر اساس اولویت) ذخیره می‌شود. ${toPersianDigits(String(truncateExtraPreview.extras.length))} انتخاب اضافی وارد پیش‌نویس نمی‌شود: ${truncateExtraPreview.extras
                .slice(0, 6)
                .map((r) => r.code || r.major)
                .join("، ")}${truncateExtraPreview.extras.length > 6 ? " …" : ""}.`
            : "فقط ۱۵۰ انتخاب اول ذخیره می‌شود."
        }
        confirmLabel="تأیید انتقال ۱۵۰ انتخاب"
        pending={importPending}
        error={confirm === "import-truncate" ? importDialogError : null}
        onCancel={() => {
          if (importPending) return;
          setImportDialogError(null);
          setConfirm(null);
        }}
        onConfirm={() => void commitImport({ truncateFirst150: true })}
      />
      <ChoiceConfirmDialog
        open={confirm === "publish"}
        title={props.phase === "final" ? "انتشار نسخه اصلاح‌شده" : "انتشار نسخه اولیه"}
        body={
          props.phase === "final"
            ? "نسخه اولیه منتشرشده دست‌نخورده می‌ماند. این نسخه اصلاح‌شده برای تأیید دانش‌آموز ارسال می‌شود و ثبت خودکار در سنجش نیست."
            : "دانش‌آموز نسخه اولیه غیرنهایی را برای اعلام نظر می‌بیند. این نسخه در سنجش ثبت نمی‌شود."
        }
        confirmLabel="انتشار"
        pending={readyPending}
        onCancel={() => {
          if (readyPending) return;
          setConfirm(null);
        }}
        onConfirm={() => {
          if (!list || readyPending) return;
          const data = new FormData();
          data.set("studentId", props.studentId);
          data.set("listId", list.id);
          data.set("phase", props.phase === "final" ? "final" : "initial");
          readyAction(data);
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

function ManualAddForm(props: {
  studentId: string;
  listId: string;
  action: (payload: FormData) => void;
  pending: boolean;
}) {
  const [fields, setFields] = useState<ChoiceManualInputFields>({
    major: "",
    university: "",
    city: "",
    officialCode: "",
    educationType: "",
    band: "",
    notes: "",
    rationale: "",
  });
  const canSave = choiceManualInputHasContent(fields);

  function set(key: keyof ChoiceManualInputFields, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form
      action={props.action}
      className="gcs-manual"
      onSubmit={(e) => {
        if (!choiceManualInputHasContent(fields)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="studentId" value={props.studentId} />
      <input type="hidden" name="listId" value={props.listId} />
      <input
        name="officialCode"
        placeholder="کد رشته"
        value={fields.officialCode ?? ""}
        onChange={(e) => set("officialCode", e.target.value)}
      />
      <input
        name="major"
        placeholder="رشته"
        value={fields.major ?? ""}
        onChange={(e) => set("major", e.target.value)}
      />
      <input
        name="university"
        placeholder="دانشگاه"
        value={fields.university ?? ""}
        onChange={(e) => set("university", e.target.value)}
      />
      <input
        name="city"
        placeholder="شهر"
        value={fields.city ?? ""}
        onChange={(e) => set("city", e.target.value)}
      />
      <select
        name="educationType"
        value={fields.educationType ?? ""}
        onChange={(e) => set("educationType", e.target.value)}
      >
        <option value="">دوره</option>
        {GUIDANCE_EDUCATION_TYPES.map((t) => (
          <option key={t.code} value={t.code}>
            {t.label}
          </option>
        ))}
      </select>
      <select name="band" value={fields.band ?? ""} onChange={(e) => set("band", e.target.value)}>
        <option value="">شانس قبولی</option>
        {CHOICE_CHANCE_CANONICAL.map((b) => (
          <option key={b.id} value={b.id}>
            {b.label}
          </option>
        ))}
      </select>
      <input
        name="notes"
        placeholder="توضیحات"
        value={fields.notes ?? ""}
        onChange={(e) => set("notes", e.target.value)}
      />
      <input
        name="rationale"
        placeholder="یادداشت مشاور"
        value={fields.rationale ?? ""}
        onChange={(e) => set("rationale", e.target.value)}
      />
      <button
        type="submit"
        className="gcs-btn gcs-btn--primary"
        disabled={props.pending || !canSave}
      >
        {props.pending ? "…" : "افزودن"}
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
  const [fields, setFields] = useState<ChoiceManualInputFields>(() => manualFieldsFromItem(item));

  useEffect(() => {
    setFields(manualFieldsFromItem(item));
  }, [itemId, props.items, item]);

  const canSave = choiceManualInputHasContent(fields);

  function set(key: keyof ChoiceManualInputFields, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form
      action={action}
      className="gcs-manual"
      key={item.id}
      onSubmit={(e) => {
        if (!choiceManualInputHasContent(fields)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="studentId" value={props.studentId} />
      <input type="hidden" name="listId" value={props.listId} />
      <input type="hidden" name="itemId" value={item.id} />
      <select
        value={itemId}
        onChange={(e) => {
          setItemId(e.target.value);
        }}
      >
        {props.items.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.sortOrder}. {opt.officialCode || opt.major || opt.university || "—"}
          </option>
        ))}
      </select>
      <input
        name="officialCode"
        value={fields.officialCode ?? ""}
        onChange={(e) => set("officialCode", e.target.value)}
      />
      <input name="major" value={fields.major ?? ""} onChange={(e) => set("major", e.target.value)} />
      <input
        name="university"
        value={fields.university ?? ""}
        onChange={(e) => set("university", e.target.value)}
      />
      <input name="city" value={fields.city ?? ""} onChange={(e) => set("city", e.target.value)} />
      <select
        name="educationType"
        value={fields.educationType ?? ""}
        onChange={(e) => set("educationType", e.target.value)}
      >
        <option value="">دوره</option>
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
      <select name="band" value={fields.band ?? ""} onChange={(e) => set("band", e.target.value)}>
        <option value="">شانس قبولی</option>
        {CHOICE_CHANCE_CANONICAL.map((b) => (
          <option key={b.id} value={b.id}>
            {b.label}
          </option>
        ))}
      </select>
      <input name="notes" value={fields.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
      <input
        name="rationale"
        value={fields.rationale ?? ""}
        onChange={(e) => set("rationale", e.target.value)}
      />
      <button type="submit" className="gcs-btn gcs-btn--primary" disabled={pending || !canSave}>
        {pending ? "…" : "ذخیره ویرایش"}
      </button>
      {state.error ? <span className="gcs-banner gcs-banner--error">{state.error}</span> : null}
    </form>
  );
}

function manualFieldsFromItem(item: ChoiceListView["items"][number]): ChoiceManualInputFields {
  return {
    officialCode: item.officialCode ?? "",
    major: item.major ?? "",
    university: item.university ?? "",
    city: item.city ?? "",
    educationType: item.educationType ?? "",
    band: item.band ?? "",
    notes: item.notes ?? "",
    rationale: item.rationale ?? "",
  };
}
