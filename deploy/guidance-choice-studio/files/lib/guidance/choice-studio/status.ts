/**
 * Product-facing Persian states. Never call INITIAL READY “final”.
 */

import {
  CHOICE_LIST_KIND,
  CHOICE_LIST_STATUS,
  SANJESH_STATUS,
} from "@/lib/guidance/journey-v2/constants";
import type { ChoiceStudioProductState } from "@/lib/guidance/choice-studio/types";

export function resolveChoiceStudioState(params: {
  kind?: string | null;
  status?: string | null;
  hasItems?: boolean;
  sanjeshStatus?: string | null;
}): ChoiceStudioProductState {
  if (params.sanjeshStatus === SANJESH_STATUS.VERIFIED) return "SANJESH_VERIFIED";
  if (!params.kind || !params.status) {
    return params.hasItems ? "DRAFT" : "EMPTY";
  }
  if (params.kind === CHOICE_LIST_KIND.FINAL) {
    if (params.status === CHOICE_LIST_STATUS.CONFIRMED) return "FINAL_CONFIRMED";
    if (params.status === CHOICE_LIST_STATUS.READY) return "FINAL_READY";
    return "FINAL_DRAFT";
  }
  if (params.status === CHOICE_LIST_STATUS.READY) return "INITIAL_READY";
  return params.hasItems === false ? "EMPTY" : "DRAFT";
}

export function labelChoiceStudioState(state: ChoiceStudioProductState): string {
  switch (state) {
    case "EMPTY":
      return "هنوز چیدمانی ایجاد نشده";
    case "DRAFT":
      return "پیش‌نویس";
    case "INITIAL_READY":
      return "نسخه اولیه — غیرنهایی";
    case "FINAL_DRAFT":
      return "نسخه اصلاح‌شده — در حال آماده‌سازی";
    case "FINAL_READY":
      return "نسخه نهایی مشاور — در انتظار تأیید دانش‌آموز";
    case "FINAL_CONFIRMED":
      return "نسخه تأییدشده — آماده ثبت سنجش";
    case "SANJESH_VERIFIED":
      return "ثبت نهایی سنجش تأیید شده";
  }
}
