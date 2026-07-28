"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ExperienceActionBar } from "@/components/admin/experience/ExperienceActionBar";
import { ExperienceBlockCanvas } from "@/components/admin/experience/ExperienceBlockCanvas";
import { ExperienceBlockLibrary } from "@/components/admin/experience/ExperienceBlockLibrary";
import { ExperienceBlockSettingsDrawer } from "@/components/admin/experience/ExperienceBlockSettingsDrawer";
import { ExperienceSeoForm } from "@/components/admin/experience/ExperienceSeoForm";
import type {
  ExperienceAdminBlockDto,
  ExperienceSeoDto,
} from "@/components/admin/experience/types";

type ExperienceEditorShellProps = {
  flowId: string;
  experienceId: string;
  draftVersionId: string;
  draftVersionNumber: number;
  flowTitle: string;
  blocks: ExperienceAdminBlockDto[];
  seo: ExperienceSeoDto;
  canManage: boolean;
  selectedBlockId: string | null;
  hasEnabledRegistrationForm: boolean;
  settingsEditor: ReactNode;
};

export function ExperienceEditorShell({
  flowId,
  experienceId,
  draftVersionId,
  draftVersionNumber,
  flowTitle,
  blocks,
  seo,
  canManage,
  selectedBlockId,
  hasEnabledRegistrationForm,
  settingsEditor,
}: ExperienceEditorShellProps) {
  const router = useRouter();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const selectedBlock =
    blocks.find((block) => block.id === selectedBlockId) ?? null;

  function closeSettings() {
    router.push(`/admin/registrations/flows/${flowId}/experience`);
  }

  return (
    <div className="space-y-4" dir="rtl">
      <ExperienceActionBar
        flowId={flowId}
        experienceId={experienceId}
        draftVersionId={draftVersionId}
        flowTitle={flowTitle}
        draftVersionNumber={draftVersionNumber}
        canManage={canManage}
        blockCount={blocks.length}
      />

      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setLibraryOpen(true)}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-border bg-white px-4 text-sm"
        >
          افزودن بلوک
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)_340px]">
        <aside className="hidden rounded-2xl border border-border bg-white p-4 lg:block">
          <ExperienceBlockLibrary
            flowId={flowId}
            experienceId={experienceId}
            versionId={draftVersionId}
            canManage={canManage}
            hasEnabledRegistrationForm={hasEnabledRegistrationForm}
          />
        </aside>

        <main className="space-y-4">
          <ExperienceBlockCanvas
            flowId={flowId}
            experienceId={experienceId}
            versionId={draftVersionId}
            blocks={blocks}
            canManage={canManage}
            selectedBlockId={selectedBlockId}
          />
          <ExperienceSeoForm
            flowId={flowId}
            experienceId={experienceId}
            versionId={draftVersionId}
            seo={seo}
            canManage={canManage}
          />
        </main>

        <aside className="hidden min-h-[70vh] overflow-hidden rounded-2xl border border-border lg:block">
          {selectedBlock ? (
            <ExperienceBlockSettingsDrawer
              flowId={flowId}
              block={selectedBlock}
              canManage={canManage}
              onClose={closeSettings}
            >
              {settingsEditor}
            </ExperienceBlockSettingsDrawer>
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted">
              یک بلوک را برای ویرایش تنظیمات انتخاب کنید.
            </div>
          )}
        </aside>
      </div>

      {/* Mobile library bottom sheet */}
      {libraryOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="بستن کتابخانه"
            onClick={() => setLibraryOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl border border-border bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-primary">افزودن بلوک</p>
              <button
                type="button"
                onClick={() => setLibraryOpen(false)}
                className="min-h-11 rounded-xl border border-border px-3 text-sm"
              >
                بستن
              </button>
            </div>
            <ExperienceBlockLibrary
              flowId={flowId}
              experienceId={experienceId}
              versionId={draftVersionId}
              canManage={canManage}
              hasEnabledRegistrationForm={hasEnabledRegistrationForm}
              compact
            />
          </div>
        </div>
      ) : null}

      {/* Mobile settings full-screen drawer */}
      {selectedBlock ? (
        <div className="fixed inset-0 z-40 bg-white lg:hidden">
          <ExperienceBlockSettingsDrawer
            flowId={flowId}
            block={selectedBlock}
            canManage={canManage}
            onClose={closeSettings}
          >
            {settingsEditor}
          </ExperienceBlockSettingsDrawer>
        </div>
      ) : null}

      {/* Mobile sticky action hint */}
      <div className="h-16 lg:hidden" />
    </div>
  );
}
