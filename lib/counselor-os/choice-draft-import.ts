import { AuditAction } from "@/generated/prisma/enums";
import { CHOICE_LIST_KIND, type ChoiceListKind } from "@/lib/guidance/journey-v2/constants";
import {
  importChoiceRows,
  loadChoiceListView,
} from "@/lib/guidance/journey-v2/choices";
import { previewRowsToInputs } from "@/lib/guidance/choice-studio/excel";
import { loadGuidanceV2Plan } from "@/lib/guidance/journey-v2/plan";
import { prisma } from "@/lib/prisma";
import {
  validateChoiceDraftImportPayload,
  type ChoiceDraftImportBody,
} from "@/lib/counselor-os/choice-draft-import-schema";

export type ChoiceDraftImportResult = {
  ok: true;
  importedCount: number;
  draftCount: number;
  listId: string;
  revisionId: string;
  version: number;
  requestId: string;
  idempotentReplay?: boolean;
};

export type ChoiceDraftImportFailure = {
  ok: false;
  error: string;
  status: number;
};

export type ChoiceDraftImportResponse = ChoiceDraftImportResult | ChoiceDraftImportFailure;

function logChoiceDraftImport(
  phase: string,
  fields: Record<string, string | number | boolean | undefined>,
) {
  console.info("[choice-studio]", { phase, ...fields });
}

async function findIdempotentReplay(params: {
  organizationId: string;
  requestId: string;
  studentId: string;
  kind: ChoiceListKind;
}): Promise<ChoiceDraftImportResult | null> {
  const audit = await prisma.auditLog.findFirst({
    where: {
      organizationId: params.organizationId,
      action: AuditAction.GUIDANCE_STATUS_CHANGED,
      metadata: {
        path: ["importRequestId"],
        equals: params.requestId,
      },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!audit?.metadata || typeof audit.metadata !== "object") return null;
  const meta = audit.metadata as Record<string, unknown>;
  if (meta.studentId !== params.studentId) return null;
  if (meta.kind !== params.kind) return null;
  const listId =
    typeof meta.listId === "string"
      ? meta.listId
      : typeof audit.entityId === "string"
        ? audit.entityId
        : null;
  if (!listId) return null;
  const importedCount =
    typeof meta.count === "number" ? meta.count : typeof meta.importedCount === "number"
      ? meta.importedCount
      : 0;
  const version = typeof meta.version === "number" ? meta.version : 0;

  const list = await prisma.guidanceChoiceList.findFirst({
    where: { id: listId, organizationId: params.organizationId },
    select: { id: true, version: true, planId: true, kind: true },
  });
  if (!list || list.kind !== params.kind) return null;

  const draftCount = await prisma.guidanceChoiceItem.count({
    where: { organizationId: params.organizationId, listId: list.id, isActive: true },
  });

  return {
    ok: true,
    importedCount,
    draftCount,
    listId: list.id,
    revisionId: list.id,
    version: list.version,
    requestId: params.requestId,
    idempotentReplay: true,
  };
}

async function resolveDraftCount(params: {
  organizationId: string;
  planId: string;
  kind: ChoiceListKind;
}): Promise<number> {
  const view = await loadChoiceListView({
    organizationId: params.organizationId,
    planId: params.planId,
    kind: params.kind,
    includeInactive: false,
  });
  return view?.items.length ?? 0;
}

export async function runChoiceDraftImport(params: {
  organizationId: string;
  counselorUserId: string;
  studentId: string;
  payload: unknown;
}): Promise<ChoiceDraftImportResponse> {
  const started = Date.now();
  const validated = validateChoiceDraftImportPayload(params.payload);
  if (!validated.ok) {
    return { ok: false, error: validated.error, status: validated.status };
  }

  const body: ChoiceDraftImportBody = validated.body;
  const importRows = validated.importRows;
  const kind: ChoiceListKind =
    body.kind === "FINAL" ? CHOICE_LIST_KIND.FINAL : CHOICE_LIST_KIND.INITIAL;

  logChoiceDraftImport("import.request.validated", {
    studentId: params.studentId,
    requestId: body.requestId,
    rowCount: body.rows.length,
    importRowCount: importRows.length,
    mode: body.mode,
    kind: body.kind,
  });

  const replay = await findIdempotentReplay({
    organizationId: params.organizationId,
    requestId: body.requestId,
    studentId: params.studentId,
    kind,
  });
  if (replay) {
    logChoiceDraftImport("import.idempotent.replay", {
      studentId: params.studentId,
      requestId: body.requestId,
      draftCount: replay.draftCount,
      durationMs: Date.now() - started,
    });
    return replay;
  }

  const plan = await loadGuidanceV2Plan({
    organizationId: params.organizationId,
    studentId: params.studentId,
  });
  if (!plan) {
    return { ok: false, error: "پرونده V2 یافت نشد.", status: 404 };
  }

  logChoiceDraftImport("import.transaction.start", {
    studentId: params.studentId,
    requestId: body.requestId,
    importRowCount: importRows.length,
  });

  try {
    const list = await importChoiceRows({
      organizationId: params.organizationId,
      planId: plan.id,
      studentId: params.studentId,
      counselorUserId: params.counselorUserId,
      kind,
      items: previewRowsToInputs(importRows),
      replaceReady: body.replaceReady,
      importRequestId: body.requestId,
      importPreviewRowCount: body.rows.length,
      importMode: body.mode,
    });

    const draftCount = await resolveDraftCount({
      organizationId: params.organizationId,
      planId: plan.id,
      kind,
    });

    logChoiceDraftImport("import.transaction.committed", {
      studentId: params.studentId,
      requestId: body.requestId,
      importedCount: importRows.length,
      draftCount,
      listId: list.id,
      durationMs: Date.now() - started,
    });

    return {
      ok: true,
      importedCount: importRows.length,
      draftCount,
      listId: list.id,
      revisionId: list.id,
      version: list.version,
      requestId: body.requestId,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "ورود از اکسل ممکن نشد.";
    logChoiceDraftImport("import.transaction.failed", {
      studentId: params.studentId,
      requestId: body.requestId,
      durationMs: Date.now() - started,
      error: message.slice(0, 200),
    });
    return { ok: false, error: message, status: 500 };
  }
}
