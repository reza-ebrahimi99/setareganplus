"use client";

import { useId, useState, type ReactNode } from "react";
import type { FormMode } from "@/generated/prisma/enums";
import { RegistrationFormPanel } from "@/components/admin/forms/RegistrationFormPanel";

type EditorTabId = "form" | "registration";

type FormEditorWorkspaceProps = {
  mode: FormMode;
  formContent: ReactNode;
};

export function FormEditorWorkspace({
  mode,
  formContent,
}: FormEditorWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<EditorTabId>("form");
  const tabsId = useId();
  const formPanelId = `${tabsId}-form`;
  const registrationPanelId = `${tabsId}-registration`;

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="بخش‌های ویرایش‌گر فرم"
        className="flex flex-wrap gap-2 border-b border-border pb-3"
      >
        <TabButton
          id={`${tabsId}-tab-form`}
          controls={formPanelId}
          active={activeTab === "form"}
          onClick={() => setActiveTab("form")}
        >
          فرم
        </TabButton>
        <TabButton
          id={`${tabsId}-tab-registration`}
          controls={registrationPanelId}
          active={activeTab === "registration"}
          onClick={() => setActiveTab("registration")}
        >
          ثبت‌نام
        </TabButton>
      </div>

      <div
        role="tabpanel"
        id={formPanelId}
        aria-labelledby={`${tabsId}-tab-form`}
        hidden={activeTab !== "form"}
      >
        {formContent}
      </div>

      <div
        role="tabpanel"
        id={registrationPanelId}
        aria-labelledby={`${tabsId}-tab-registration`}
        hidden={activeTab !== "registration"}
      >
        <RegistrationFormPanel mode={mode} />
      </div>
    </div>
  );
}

function TabButton({
  id,
  controls,
  active,
  onClick,
  children,
}: {
  id: string;
  controls: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={id}
      aria-selected={active}
      aria-controls={controls}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      className={`min-h-11 rounded-xl px-4 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary ${
        active
          ? "bg-primary text-white"
          : "border border-border bg-surface text-primary hover:bg-background"
      }`}
    >
      {children}
    </button>
  );
}
