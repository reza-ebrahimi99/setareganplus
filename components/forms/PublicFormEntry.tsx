"use client";

import { FormMode } from "@/generated/prisma/enums";
import { PublicForm } from "@/components/forms/PublicForm";
import { PublicRegistrationWizard } from "@/components/forms/PublicRegistrationWizard";
import type { PublicFormData } from "@/lib/forms/load-public-form";

type PublicFormEntryProps = {
  data: PublicFormData;
  instanceId?: string;
  displayMode?: "full" | "embedded" | "compact";
};

/**
 * Chooses flat PublicForm vs Registration wizard from Form.mode.
 * STANDARD behavior is unchanged.
 */
export function PublicFormEntry({
  data,
  instanceId,
  displayMode = "full",
}: PublicFormEntryProps) {
  if (data.form.mode === FormMode.REGISTRATION) {
    return (
      <PublicRegistrationWizard
        data={data}
        instanceId={instanceId}
        displayMode={displayMode}
      />
    );
  }

  return (
    <PublicForm
      data={data}
      instanceId={instanceId}
      displayMode={displayMode}
    />
  );
}
