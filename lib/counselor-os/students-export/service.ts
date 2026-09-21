/**
 * Counselor student Excel export orchestration.
 */

import { AuditAction } from "@/generated/prisma/enums";
import type { CounselorContext } from "@/lib/counselor-os/auth";
import type { CounselorStudentListFilters } from "@/lib/counselor-os/students";
import { counselorStudentsExportFilename } from "@/lib/counselor-os/students-export/format";
import {
  loadCounselorStudentsExportBundle,
  type CounselorStudentsExportScope,
} from "@/lib/counselor-os/students-export/load-data";
import {
  buildCounselorStudentsExportWorkbook,
  counselorStudentsWorkbookToBuffer,
} from "@/lib/counselor-os/students-export/xlsx";
import { prisma } from "@/lib/prisma";

export type CounselorStudentsExportResult =
  | { ok: true; filename: string; buffer: Buffer; rowCount: number }
  | { ok: false; reason: "empty" | "error"; message: string };

export function parseCounselorStudentExportFilters(
  searchParams: URLSearchParams,
): CounselorStudentListFilters {
  return {
    q: searchParams.get("q") ?? undefined,
    activity: (searchParams.get("activity") || undefined) as
      | CounselorStudentListFilters["activity"]
      | undefined,
    step: searchParams.get("step") ?? undefined,
    package: searchParams.get("package") ?? undefined,
    finance: (searchParams.get("finance") || undefined) as
      | CounselorStudentListFilters["finance"]
      | undefined,
    grade: searchParams.get("grade") ?? undefined,
    track: searchParams.get("track") ?? undefined,
  };
}

export function parseCounselorStudentsExportScope(
  raw: string | null,
): CounselorStudentsExportScope {
  return raw === "all" ? "all" : "filtered";
}

export async function exportCounselorStudentsXlsx(params: {
  ctx: CounselorContext;
  scope: CounselorStudentsExportScope;
  filters: CounselorStudentListFilters;
  siteOrigin?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<CounselorStudentsExportResult> {
  try {
    const bundle = await loadCounselorStudentsExportBundle({
      ctx: params.ctx,
      scope: params.scope,
      filters: params.filters,
    });

    if (bundle.mainRows.length === 0) {
      return {
        ok: false,
        reason: "empty",
        message: "دانش‌آموزی مطابق فیلتر یافت نشد",
      };
    }

    const workbook = await buildCounselorStudentsExportWorkbook({
      ...bundle,
      siteOrigin: params.siteOrigin,
    });
    const buffer = await counselorStudentsWorkbookToBuffer(workbook);
    const filename = counselorStudentsExportFilename();

    await prisma.auditLog.create({
      data: {
        organizationId: params.ctx.organizationId,
        actorUserId: params.ctx.userId,
        action: AuditAction.DATA_EXPORTED,
        entityType: "CounselorStudentsExport",
        entityId: params.ctx.organizationId,
        metadata: {
          exportKind: "counselor-guidance-v2-students",
          scope: params.scope,
          filters: params.filters,
          rowCount: bundle.mainRows.length,
          hollandRowCount: bundle.hollandRows.length,
          sheetNames: ["دانش‌آموزان", "وضعیت ۱۸ مرحله", "رغبت‌سنجی"],
        },
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      },
    });

    return { ok: true, filename, buffer, rowCount: bundle.mainRows.length };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تولید فایل اکسل با خطا مواجه شد.";
    return { ok: false, reason: "error", message };
  }
}
