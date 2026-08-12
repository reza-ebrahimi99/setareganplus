/**
 * Book import pipeline — architecture only.
 * Future sources: Official PDF, Markdown, JSON, CMS, Database.
 * No parsers implemented yet.
 */

import type {
  CurriculumImportAdapter,
  CurriculumImportJob,
  CurriculumImportSourceKind,
} from "@/lib/atrin/curriculum/types";

export function createCurriculumImportJob(input: {
  sourceKind: CurriculumImportSourceKind;
  sourceRef: string;
}): CurriculumImportJob {
  return {
    id: `import-${Date.now()}`,
    sourceKind: input.sourceKind,
    sourceRef: input.sourceRef,
    status: "not_implemented",
    createdAt: Date.now(),
    error: "Import parsers are not implemented yet.",
  };
}

async function stubPrepare(
  job: CurriculumImportJob,
): Promise<CurriculumImportJob> {
  return {
    ...job,
    status: "not_implemented",
    error: `Adapter for ${job.sourceKind} is not implemented yet.`,
  };
}

export const CURRICULUM_IMPORT_ADAPTERS: CurriculumImportAdapter[] = [
  {
    id: "pdf",
    sourceKind: "official_pdf",
    prepare: stubPrepare,
  },
  {
    id: "markdown",
    sourceKind: "markdown",
    prepare: stubPrepare,
  },
  {
    id: "json",
    sourceKind: "json",
    prepare: stubPrepare,
  },
  {
    id: "cms",
    sourceKind: "cms",
    prepare: stubPrepare,
  },
  {
    id: "database",
    sourceKind: "database",
    prepare: stubPrepare,
  },
];

export function getCurriculumImportAdapter(
  kind: CurriculumImportSourceKind,
): CurriculumImportAdapter | undefined {
  return CURRICULUM_IMPORT_ADAPTERS.find((a) => a.sourceKind === kind);
}

export async function enqueueCurriculumImport(
  input: Parameters<typeof createCurriculumImportJob>[0],
): Promise<CurriculumImportJob> {
  const job = createCurriculumImportJob(input);
  const adapter = getCurriculumImportAdapter(input.sourceKind);
  if (!adapter) {
    return {
      ...job,
      status: "failed",
      error: `No adapter for ${input.sourceKind}`,
    };
  }
  return adapter.prepare(job);
}
