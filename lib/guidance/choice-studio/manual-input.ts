/**
 * Manual add/edit in Choice Studio — client-safe helpers.
 */

export type ChoiceManualInputFields = {
  major?: string | null;
  university?: string | null;
  city?: string | null;
  province?: string | null;
  educationType?: string | null;
  admissionType?: string | null;
  officialCode?: string | null;
  band?: string | null;
  notes?: string | null;
  rationale?: string | null;
};

function trimmed(value: string | null | undefined): string {
  return (value ?? "").trim();
}

/** True when at least one content field has non-whitespace text. */
export function choiceManualInputHasContent(fields: ChoiceManualInputFields): boolean {
  return [
    fields.major,
    fields.university,
    fields.city,
    fields.province,
    fields.educationType,
    fields.admissionType,
    fields.officialCode,
    fields.band,
    fields.notes,
    fields.rationale,
  ].some((v) => trimmed(v).length > 0);
}

export function choiceManualInputFromFormData(formData: FormData): ChoiceManualInputFields {
  const field = (key: string) => {
    const v = formData.get(key);
    return typeof v === "string" ? v : "";
  };
  return {
    major: field("major"),
    university: field("university"),
    city: field("city"),
    province: field("province"),
    educationType: field("educationType"),
    admissionType: field("admissionType"),
    officialCode: field("officialCode") || null,
    band: field("band") || null,
    notes: field("notes"),
    rationale: field("rationale"),
  };
}
