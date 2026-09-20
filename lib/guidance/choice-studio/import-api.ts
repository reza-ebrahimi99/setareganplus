/**
 * Client-safe types + URL for choice draft import API.
 */

import type { CanonicalChoiceRow } from "@/lib/guidance/choice-studio/types";
import type { ChoiceDraftImportMode } from "@/lib/counselor-os/choice-draft-import-schema";

export type ChoiceDraftImportClientPayload = {
  requestId: string;
  kind: "INITIAL" | "FINAL";
  mode: ChoiceDraftImportMode;
  truncateAck: boolean;
  replaceReady: boolean;
  rows: CanonicalChoiceRow[];
};

export type ChoiceDraftImportClientSuccess = {
  ok: true;
  importedCount: number;
  draftCount: number;
  listId: string;
  revisionId: string;
  version: number;
  requestId: string;
  idempotentReplay?: boolean;
};

export type ChoiceDraftImportClientFailure = {
  ok: false;
  error: string;
  code?: string;
};

export type ChoiceDraftImportClientResponse =
  | ChoiceDraftImportClientSuccess
  | ChoiceDraftImportClientFailure;

export const CHOICE_DRAFT_IMPORT_TIMEOUT_MS = 120_000;

export function choiceDraftImportUrl(studentId: string): string {
  return `/api/admin/counselor/students/${encodeURIComponent(studentId)}/choice-draft/import`;
}

export async function postChoiceDraftImport(params: {
  studentId: string;
  payload: ChoiceDraftImportClientPayload;
  signal?: AbortSignal;
}): Promise<{ response: Response; data: ChoiceDraftImportClientResponse | null }> {
  const response = await fetch(choiceDraftImportUrl(params.studentId), {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Choice-Import-Id": params.payload.requestId,
    },
    body: JSON.stringify(params.payload),
    signal: params.signal,
  });

  let data: ChoiceDraftImportClientResponse | null = null;
  try {
    data = (await response.json()) as ChoiceDraftImportClientResponse;
  } catch {
    data = null;
  }

  return { response, data };
}
